"""HTTP API wrapping voice_core. Three endpoints mirror the three layers:

  POST /api/stt   audio file        -> {"text": ...}
  POST /api/chat  {message, session_id} -> {"reply": ...}
  POST /api/tts   {text}            -> MP3 bytes

Voice flow = stt -> chat -> tts. Text-only chat just uses /api/chat.
Run:  uvicorn app:app --reload --port 8000   (from backend/)
"""
import logging
import os
import time
import uuid

from fastapi import FastAPI, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from voice_core import agent, config, stt, tts

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("voice-agent")

app = FastAPI(title="Voice Agent + Chatbot")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # dev-friendly; restrict when embedding in a real product
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    message: str
    session_id: str = "default"


class TTSRequest(BaseModel):
    text: str
    voice: str | None = None  # per-request voice override (e.g. an Edge voice name)


@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "llm_model": config.LLM_MODEL,
        "stt_provider": config.STT_PROVIDER,
        "tts_provider": config.TTS_PROVIDER,
        "plugin": config.AGENT_PLUGIN,
    }


@app.get("/api/session")
async def new_session():
    return {"session_id": uuid.uuid4().hex}


@app.post("/api/chat")
async def chat(req: ChatRequest):
    if not req.message.strip():
        raise HTTPException(400, "Empty message")
    t0 = time.perf_counter()
    try:
        reply = await agent.chat(req.message, req.session_id)
    except Exception as e:
        log.exception("agent error")
        raise HTTPException(502, f"Agent error: {e}")
    log.info("chat took %.1fs", time.perf_counter() - t0)
    return {"reply": reply}


@app.post("/api/stt")
async def transcribe(audio: UploadFile, language: str | None = Form(None)):
    data = await audio.read()
    if not data:
        raise HTTPException(400, "Empty audio")
    try:
        text = await stt.get_stt().transcribe(
            data, audio.content_type or "audio/webm", language=language
        )
    except Exception as e:
        log.exception("stt error")
        raise HTTPException(502, f"STT error: {e}")
    return {"text": text}


@app.post("/api/tts")
async def synthesize(req: TTSRequest):
    if not req.text.strip():
        raise HTTPException(400, "Empty text")
    t0 = time.perf_counter()
    try:
        audio_bytes = await tts.get_tts().synthesize(req.text, req.voice)
    except Exception as e:
        log.exception("tts error")
        raise HTTPException(502, f"TTS error: {e}")
    log.info("tts took %.1fs for %d chars", time.perf_counter() - t0, len(req.text))
    return Response(content=audio_bytes, media_type="audio/mpeg")


# ── Serve the built React frontend (single-service deploy) ──────────
# In production the frontend is built to frontend/dist and served from the
# same origin as the API, so no CORS or proxy is needed. In local dev this
# folder may not exist yet (you run `npm run dev` separately) — that's fine.
_frontend_dist = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
if os.path.isdir(_frontend_dist):
    app.mount("/", StaticFiles(directory=_frontend_dist, html=True), name="frontend")
    log.info("serving frontend from %s", _frontend_dist)
