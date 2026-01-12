from vision_agents.plugins import fast_whisper, getstream, openai, elevenlabs
from vision_agents.core import Agent, User
import os
from dotenv import load_dotenv

load_dotenv()

def create_agent():
    # Create agent with Fast-Whisper STT
    # This uses local inference via CTranslate2 for high performance
    agent = Agent(
        edge=getstream.Edge(),
        agent_user=User(name="Eburon Vision Assistant", id="eburon-agent"),
        instructions="""
            You are a helpful voice assistant for Eburon. 
            You use high-performance Fast-Whisper for stable local transcription.
            Respond clearly and professionally.
        """,
        stt=fast_whisper.STT(
            model_size="base", # Options: tiny, base, small, medium, large
            device="cpu",      # Options: cpu, cuda, auto
            compute_type="int8" # Options: int8, float16, float32
        ),
        llm=openai.LLM(model="gpt-4o-mini"),
        tts=elevenlabs.TTS()
    )
    return agent

if __name__ == "__main__":
    agent = create_agent()
    print("Eburon Vision Assistant Initialized with Fast-Whisper.")
    # Implementation note: Joining a call would happen here
    # Example:
    # call = client.video.call("default", "room-id")
    # await call.get_or_create(data={"created_by_id": agent.agent_user.id})
    # async with agent.join(call):
    #     await agent.finish()
