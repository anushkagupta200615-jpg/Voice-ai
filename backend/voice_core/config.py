"""Central env-driven configuration. Every provider choice lives here."""
import os

from dotenv import load_dotenv

# Load .env from the project root (parent of backend/) or backend/ itself.
_here = os.path.dirname(os.path.abspath(__file__))
for candidate in (
    os.path.join(_here, "..", "..", ".env"),
    os.path.join(_here, "..", ".env"),
):
    if os.path.exists(candidate):
        load_dotenv(candidate)
        break
else:
    load_dotenv()


def env(name: str, default: str = "") -> str:
    return os.getenv(name, default).strip()


LLM_MODEL = env("LLM_MODEL", "groq:llama-3.3-70b-versatile")
STT_PROVIDER = env("STT_PROVIDER", "groq")
TTS_PROVIDER = env("TTS_PROVIDER", "edge")
AGENT_PLUGIN = env("AGENT_PLUGIN", "demo")
SYSTEM_PROMPT_OVERRIDE = env("SYSTEM_PROMPT")

GROQ_API_KEY = env("GROQ_API_KEY")
DEEPGRAM_API_KEY = env("DEEPGRAM_API_KEY")
ELEVENLABS_API_KEY = env("ELEVENLABS_API_KEY")
ELEVENLABS_VOICE_ID = env("ELEVENLABS_VOICE_ID", "21m00Tcm4TlvDq8ikWAM")
EDGE_TTS_VOICE = env("EDGE_TTS_VOICE", "en-US-AriaNeural")
