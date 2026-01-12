import logging
from dotenv import load_dotenv
from livekit.agents import JobContext, JobProcess, AgentServer, cli, Agent, AgentSession
from livekit.plugins import openai, silero, deepgram, elevenlabs

load_dotenv()

logger = logging.getLogger("eburon-translator")
logger.setLevel(logging.INFO)

class TranslatorAgent(Agent):
    def __init__(self) -> None:
        super().__init__(
            instructions="""
                You are a professional translator for Eburon. You translate the user's speech from English to French.
                Every message you receive, translate it directly into French.
                Do not respond with anything else but the translation.
                Maintain a professional and clear tone.
            """
        )

    async def on_enter(self):
        # Trigger an initial reply if needed or just wait for speech
        pass

server = AgentServer()

def prewarm(proc: JobProcess):
    proc.userdata["vad"] = silero.VAD.load()

server.setup_fnc = prewarm

@server.rtc_session()
async def entrypoint(ctx: JobContext):
    logger.info(f"Connecting to room: {ctx.room.name}")
    ctx.log_context_fields = {"room": ctx.room.name}

    session = AgentSession(
        stt=deepgram.STT(),
        llm=openai.LLM(),
        tts=elevenlabs.TTS(model="eleven_multilingual_v2"),
        vad=ctx.proc.userdata["vad"],
        preemptive_generation=True,
    )

    await session.start(agent=TranslatorAgent(), room=ctx.room)
    await ctx.connect()

if __name__ == "__main__":
    cli.run_app(server)
