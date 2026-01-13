import logging
import asyncio
from dotenv import load_dotenv
from livekit.agents import JobContext, JobProcess, AgentServer, cli, stt, llm
from livekit.plugins import openai, silero, cartesia, google
from faster_whisper import WhisperModel

load_dotenv()

logger = logging.getLogger("eburon-advanced-translator")
logger.setLevel(logging.INFO)

import os
import json
import websockets
import aiohttp

# Custom Google Translate implementation (REST API)
class GoogleTranslator:
    def __init__(self, api_key: str = None):
        self._api_key = api_key or os.environ.get("GEMINI_API_KEY") 
        self._url = "https://translation.googleapis.com/language/translate/v2"

    async def translate(self, text: str, target_lang: str, source_lang: str = "en") -> str:
        try:
            target = target_lang.split("-")[0]
            source = source_lang.split("-")[0]
            
            params = {
                "q": text,
                "target": target,
                "source": source,
                "key": self._api_key
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(self._url, params=params) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        return data["data"]["translations"][0]["translatedText"]
                    else:
                        logger.error(f"Google Translate API Error: {resp.status} - {await resp.text()}")
                        return text
        except Exception as e:
            logger.error(f"Google Translate Error: {e}")
            return text

# Custom Cartesia Ink STT implementation (ink-whisper)
class CartesiaInkSTT(stt.STT):
    def __init__(self, api_key: str = None, model: str = "ink-whisper"):
        super().__init__(capabilities=stt.STTCapabilities(streaming=True))
        self._api_key = api_key or os.environ.get("CARTESIA_API_KEY")
        self._model = model
        self._language = "en"

    def set_language(self, language: str):
        self._language = language

    def stream(self, *, language: str = None, offset: float = 0.0) -> "CartesiaInkStream":
        return CartesiaInkStream(
            stt=self,
            api_key=self._api_key,
            model=self._model,
            language=language or self._language
        )

class CartesiaInkStream(stt.STTStream):
    def __init__(self, stt, api_key, model, language):
        super().__init__(stt)
        self._api_key = api_key
        self._model = model
        self._language = language

    async def _run(self):
        url = f"wss://api.cartesia.ai/stt/v1/stream?model={self._model}&language={self._language}&encoding=pcm_s16le&sample_rate=16000&api_key={self._api_key}"
        
        try:
            async with websockets.connect(url) as ws:
                async def send_audio():
                    async for audio in self._input:
                        if isinstance(audio, stt.SpeechEvent): continue 
                        await ws.send(audio.data)
                    await ws.send("done")

                async def receive_results():
                    async for msg in ws:
                        data = json.loads(msg)
                        if data.get("type") == "transcript":
                            text = data.get("transcript", "")
                            is_final = data.get("is_final", False)
                            
                            event = stt.SpeechEvent(
                                type=stt.SpeechEventType.INTERIM_TRANSCRIPT if not is_final else stt.SpeechEventType.FINAL_TRANSCRIPT,
                                alternatives=[stt.SpeechData(text=text, language=self._language)]
                            )
                            self._event_queue.put_nowait(event)
                        elif data.get("type") == "error":
                            logger.error(f"Cartesia STT Error: {data.get('message')}")

                await asyncio.gather(send_audio(), receive_results())
        except Exception as e:
            logger.error(f"Cartesia STT Connection Error: {e}")

# Custom Deepgram STT implementation (manual WebSocket)
class DeepgramSTT(stt.STT):
    def __init__(self, api_key: str = None, model: str = "nova-2"):
        super().__init__(capabilities=stt.STTCapabilities(streaming=True))
        self._api_key = api_key or os.environ.get("DEEPGRAM_API_KEY")
        self._model = model
        self._language = "multi"

    def set_language(self, language: str):
        self._language = language

    def stream(self, *, language: str = None, offset: float = 0.0) -> "DeepgramStream":
        return DeepgramStream(
            stt=self,
            api_key=self._api_key,
            model=self._model,
            language=language or self._language
        )

class DeepgramStream(stt.STTStream):
    def __init__(self, stt, api_key, model, language):
        super().__init__(stt)
        self._api_key = api_key
        self._model = model
        self._language = language

    async def _run(self):
        query = f"model={self._model}&language={self._language}&smart_format=true&punctuate=true&utterances=true&interim_results=true&encoding=linear16&sample_rate=16000"
        url = f"wss://api.deepgram.com/v1/listen?{query}"
        headers = {"Authorization": f"Token {self._api_key}"}
        
        try:
            async with websockets.connect(url, extra_headers=headers) as ws:
                async def send_audio():
                    async for audio in self._input:
                        if isinstance(audio, stt.SpeechEvent): continue 
                        await ws.send(audio.data)
                    await ws.send(json.dumps({"type": "CloseStream"}))

                async def receive_results():
                    async for msg in ws:
                        data = json.loads(msg)
                        if "channel" in data:
                            alt = data["channel"]["alternatives"][0]
                            text = alt["transcript"]
                            is_final = data["is_final"]
                            if text:
                                event = stt.SpeechEvent(
                                    type=stt.SpeechEventType.INTERIM_TRANSCRIPT if not is_final else stt.SpeechEventType.FINAL_TRANSCRIPT,
                                    alternatives=[stt.SpeechData(text=text, language=self._language)]
                                )
                                self._event_queue.put_nowait(event)

                await asyncio.gather(send_audio(), receive_results())
        except Exception as e:
            logger.error(f"Deepgram STT Connection Error: {e}")

# Wrapper for multi-engine selection
class MultiEngineSTT(stt.STT):
    def __init__(self, ink_engine: CartesiaInkSTT, nova_engine: DeepgramSTT):
        super().__init__(capabilities=stt.STTCapabilities(streaming=True))
        self._ink = ink_engine
        self._nova = nova_engine
        self._active_id = "eburon-ink"

    def set_engine(self, engine_id: str):
        if engine_id in ["eburon-ink", "eburon-nova"]:
            self._active_id = engine_id
            logger.info(f"STT: Active engine switched to {engine_id}")

    def set_language(self, language: str):
        self._ink.set_language(language)
        self._nova.set_language(language)

    def stream(self, **kwargs) -> stt.STTStream:
        return self._nova.stream(**kwargs) if self._active_id == "eburon-nova" else self._ink.stream(**kwargs)

# Wrapper for Multi-Engine Translation
class MultiEngineLLM(llm.LLM):
    def __init__(self, gemini_llm: google.LLM, google_translator: GoogleTranslator):
        super().__init__()
        self._gemini = gemini_llm
        self._google = google_translator
        self._active_engine = "eburon-gemini"
        self._src_lang = "en"
        self._tgt_lang = "fr"

    def set_engine(self, engine_id: str):
        if engine_id in ["eburon-gemini", "eburon-google"]:
            self._active_engine = engine_id
            logger.info(f"LLM: Active engine switched to {engine_id}")

    def set_languages(self, sl: str, tl: str):
        self._src_lang = sl
        self._tgt_lang = tl

    def chat(self, *, chat_ctx: openai.ChatContext, fnet: llm.FunctionCallNetwork = None) -> "TranslatorChatStream":
        if self._active_engine == "eburon-google":
            return TranslatorChatStream(self._google, chat_ctx, self._src_lang, self._tgt_lang)
        return self._gemini.chat(chat_ctx=chat_ctx, fnet=fnet)

class TranslatorChatStream(llm.ChatStream):
    def __init__(self, translator: GoogleTranslator, chat_ctx: openai.ChatContext, sl: str, tl: str):
        super().__init__()
        self._translator = translator
        self._chat_ctx = chat_ctx
        self._sl = sl
        self._tl = tl
        self._iter = None

    async def __anext__(self):
        if self._iter is None:
            # Just translate the last user message
            text = self._chat_ctx.messages[-1].content
            if not isinstance(text, str): # Handle multi-modal if needed
                text = str(text)
            
            translated = await self._translator.translate(text, self._tgt_lang, self._sl)
            
            # Yield as a single chunk for the assistant
            self._iter = iter([llm.ChatChunk(choices=[llm.Choices(delta=llm.ChoiceDelta(role="assistant", content=translated))])])
        
        try:
            return next(self._iter)
        except StopIteration:
            raise StopAsyncIteration

server = AgentServer()

def prewarm(proc: JobProcess):
    proc.userdata["vad"] = silero.VAD.load()

server.setup_fnc = prewarm

@server.rtc_session()
async def entrypoint(ctx: JobContext):
    logger.info(f"Connecting to room: {ctx.room.name}")
    
    # Set agent identity for UI detection if not already set by LiveKit
    # (LiveKit handles identity via AgentJob, but we can log it)
    logger.info(f"Agent Identity: {ctx.room.local_participant.identity}")

    # Defaults
    src_lang_code = "en"
    tgt_lang_code = "fr"
    
    # Language name mapping for LLM
    LANG_NAMES = {
        "en": "English", "fr": "French", "es": "Spanish", "de": "German",
        "nl": "Dutch", "vls-BE": "West Flemish", "en-US": "English (US)",
        "en-GB": "English (UK)", "nl-BE": "Flemish (Belgium)"
    }

    def get_system_prompt(sl_code, tl_code):
        sl = LANG_NAMES.get(sl_code, sl_code)
        tl = LANG_NAMES.get(tl_code, tl_code)
        return f"""
            You are a professional real-time translator for Eburon. 
            You are translating a live conversation.
            
            TASK: Translate speech from {sl} to {tl}.
            
            RULES:
            1. Respond ONLY with the translated text.
            2. Do NOT add any notes, explanations, or meta-talk.
            3. If the input is unclear, translate your best guess.
            
            EMOTION & STYLE:
            Use SSML tags sparingly for natural expression:
            - <emotion value="excited" /> if the user sounds happy
            - <emotion value="serious" /> if the user is formal
        """

    # Using Cartesia Sonic-3 for advanced controls
    tts = cartesia.TTS(model="sonic-3-latest", voice="9c7e6604-52c6-424a-9f9f-2c4ad89f3bb9")
    
    # Using Gemini for high-quality translation
    llm_gemini = google.LLM(model="gemini-1.5-flash")
    llm_wrapper = MultiEngineLLM(llm_gemini, GoogleTranslator())

    chat_ctx = openai.ChatContext().append(role="system", text=get_system_prompt(src_lang_code, tgt_lang_code))
    
    stt_wrapper = MultiEngineSTT(CartesiaInkSTT(), DeepgramSTT())
    
    assistant = VoiceAssistant(
        vad=ctx.proc.userdata["vad"],
        stt=stt_wrapper,
        llm=llm_wrapper,
        tts=tts,
        chat_ctx=chat_ctx,
        allow_interruptions=True, # VOX: Allow user to interrupt translation
    )

    def update_config(config):
        nonlocal src_lang_code, tgt_lang_code
        sl = config.get("source_language", "en")
        tl = config.get("target_language", "fr")
        engine_id = config.get("stt_engine", "eburon-ink")
        translator_id = config.get("translation_engine", "eburon-gemini")

        # Update engines
        stt_wrapper.set_engine(engine_id)
        llm_wrapper.set_engine(translator_id)

        if sl != src_lang_code or tl != tgt_lang_code:
            logger.info(f"🔄 Language change: {sl} -> {tl}")
            src_lang_code = sl
            tgt_lang_code = tl
            llm_wrapper.set_languages(sl, tl)
            assistant.chat_ctx.messages[0].text = get_system_prompt(sl, tl)
            
            # Map language for inner engines
            # Cartesia Ink mapping
            ink_lang = sl.split("-")[0] if "-" in sl else sl
            if sl == "vls-BE": ink_lang = "nl"
            stt_wrapper.set_language(ink_lang)
            logger.info(f"STT: Language set to {ink_lang}")

    @ctx.room.on("participant_metadata_changed")
    def on_participant_metadata(participant, metadata):
        import json
        try:
            data = json.loads(metadata)
            if "translation_config" in data:
                update_config(data["translation_config"])
            if "voice_settings" in data:
                settings = data["voice_settings"]
                if hasattr(tts, "_opts"):
                    if "speed" in settings: tts._opts.speed = float(settings["speed"])
                    if "volume" in settings: tts._opts.volume = float(settings["volume"])
                    if "emotion" in settings: tts._opts.emotion = settings["emotion"]
        except Exception as e:
            logger.error(f"Error parsing metadata: {e}")

    # Check initial metadata for participants already in room
    for participant in ctx.room.remote_participants.values():
        if participant.metadata:
            on_participant_metadata(participant, participant.metadata)

    assistant.start(ctx.room)
    await ctx.connect()
    
    # In a translator pipeline, we usually want the agent to be 
    # passive until spoken to, which VoiceAssistant handles by default.

if __name__ == "__main__":
    from livekit.agents.voice_assistant import VoiceAssistant
    cli.run_app(server)
