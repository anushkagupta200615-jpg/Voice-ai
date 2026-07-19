"""voice_core — reusable voice agent + chatbot core.

Layers (all swappable via environment variables, see .env.example):
  STT  -> voice_core.stt   (speech to text)
  Agent-> voice_core.agent (LangGraph agent with tools + memory)
  TTS  -> voice_core.tts   (text to speech)

To embed in another project:
  from voice_core.agent import get_agent, chat
  from voice_core.stt import get_stt
  from voice_core.tts import get_tts
"""
