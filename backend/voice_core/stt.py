"""Speech-to-text providers. Add a new provider by subclassing STTProvider
and registering it in PROVIDERS — nothing else in the app changes."""
from abc import ABC, abstractmethod

import httpx

from . import config


class STTProvider(ABC):
    @abstractmethod
    async def transcribe(
        self, audio: bytes, mime_type: str = "audio/webm", language: str | None = None
    ) -> str:
        """Return the transcript of the given audio bytes. `language` is an
        optional ISO-639-1 hint (e.g. 'en', 'hi') — providing it prevents
        wrong-language detection on short clips."""


class GroqWhisperSTT(STTProvider):
    """Whisper large-v3-turbo hosted on Groq (fast, generous free tier)."""

    URL = "https://api.groq.com/openai/v1/audio/transcriptions"

    async def transcribe(
        self, audio: bytes, mime_type: str = "audio/webm", language: str | None = None
    ) -> str:
        if not config.GROQ_API_KEY:
            raise RuntimeError("GROQ_API_KEY is not set (needed for STT_PROVIDER=groq)")
        ext = mime_type.split("/")[-1].split(";")[0]
        data = {"model": "whisper-large-v3-turbo", "response_format": "json"}
        if language:
            data["language"] = language
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(
                self.URL,
                headers={"Authorization": f"Bearer {config.GROQ_API_KEY}"},
                files={"file": (f"audio.{ext}", audio, mime_type)},
                data=data,
            )
        resp.raise_for_status()
        return resp.json().get("text", "").strip()


class DeepgramSTT(STTProvider):
    URL = "https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true"

    async def transcribe(
        self, audio: bytes, mime_type: str = "audio/webm", language: str | None = None
    ) -> str:
        if not config.DEEPGRAM_API_KEY:
            raise RuntimeError("DEEPGRAM_API_KEY is not set (needed for STT_PROVIDER=deepgram)")
        url = self.URL + (f"&language={language}" if language else "")
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(
                url,
                headers={
                    "Authorization": f"Token {config.DEEPGRAM_API_KEY}",
                    "Content-Type": mime_type,
                },
                content=audio,
            )
        resp.raise_for_status()
        data = resp.json()
        return data["results"]["channels"][0]["alternatives"][0]["transcript"].strip()


PROVIDERS = {
    "groq": GroqWhisperSTT,
    "deepgram": DeepgramSTT,
}


def get_stt() -> STTProvider:
    name = config.STT_PROVIDER
    if name not in PROVIDERS:
        raise ValueError(f"Unknown STT_PROVIDER '{name}'. Options: {list(PROVIDERS)}")
    return PROVIDERS[name]()
