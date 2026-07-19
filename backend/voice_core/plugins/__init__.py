"""Domain plugins. Each module here must expose:

  SYSTEM_PROMPT: str          — the agent's persona for this domain
  get_tools() -> list         — LangChain tools to plug into the agent

Select one with the AGENT_PLUGIN env var. See demo.py for a template.
"""
