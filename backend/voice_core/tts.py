"""Text-to-speech providers. All return MP3 bytes so the frontend can just
feed them to an <audio> element. Default is Edge TTS: free, no API key."""
from abc import ABC, abstractmethod

import httpx

from . import config


class TTSProvider(ABC):
    @abstractmethod
    async def synthesize(self, text: str, voice: str | None = None) -> bytes:
        """Return MP3 audio bytes for the given text. `voice` optionally
        overrides the configured default voice for this one request."""


class EdgeTTS(TTSProvider):
    """Microsoft Edge neural voices — free, no key. Great demo fallback.
    Voices: run `edge-tts --list-voices` (e.g. en-US-AriaNeural, hi-IN-SwaraNeural)."""

    async def synthesize(self, text: str, voice: str | None = None) -> bytes:
        import edge_tts

        communicate = edge_tts.Communicate(text, voice=voice or config.EDGE_TTS_VOICE)
        chunks = []
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                chunks.append(chunk["data"])
        return b"".join(chunks)


class ElevenLabsTTS(TTSProvider):
    async def synthesize(self, text: str, voice: str | None = None) -> bytes:
        if not config.ELEVENLABS_API_KEY:
            raise RuntimeError("ELEVENLABS_API_KEY is not set (needed for TTS_PROVIDER=elevenlabs)")
        url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice or config.ELEVENLABS_VOICE_ID}"
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(
                url,
                headers={"xi-api-key": config.ELEVENLABS_API_KEY},
                json={
                    "text": text,
                    "model_id": "eleven_turbo_v2_5",
                    "voice_settings": {"stability": 0.5, "similarity_boost": 0.75},
                },
            )
        resp.raise_for_status()
        return resp.content


PROVIDERS = {
    "edge": EdgeTTS,
    "elevenlabs": ElevenLabsTTS,
}


def get_tts() -> TTSProvider:
    name = config.TTS_PROVIDER
    if name not in PROVIDERS:
        raise ValueError(f"Unknown TTS_PROVIDER '{name}'. Options: {list(PROVIDERS)}")
    return PROVIDERS[name]()
