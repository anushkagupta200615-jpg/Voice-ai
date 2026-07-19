"""The LangGraph agent: LLM + domain tools + per-session memory.

The LLM is chosen by the LLM_MODEL env var ("provider:model" string),
the persona and tools come from a plugin module (AGENT_PLUGIN env var),
and short-term memory is a LangGraph checkpointer keyed by session_id.
"""
import importlib
from functools import lru_cache

from langchain.chat_models import init_chat_model
from langgraph.checkpoint.memory import InMemorySaver

from . import config

try:  # langchain >= 1.0
    from langchain.agents import create_agent
except ImportError:  # older stacks
    from langgraph.prebuilt import create_react_agent as create_agent


def load_plugin(name: str | None = None):
    """A plugin is any module in voice_core.plugins exposing
    SYSTEM_PROMPT (str) and get_tools() -> list. Swap per hackathon theme."""
    name = name or config.AGENT_PLUGIN
    return importlib.import_module(f"voice_core.plugins.{name}")


@lru_cache(maxsize=1)
def get_agent():
    plugin = load_plugin()
    system_prompt = config.SYSTEM_PROMPT_OVERRIDE or plugin.SYSTEM_PROMPT
    model = init_chat_model(config.LLM_MODEL)
    return create_agent(
        model,
        tools=plugin.get_tools(),
        system_prompt=system_prompt,
        checkpointer=InMemorySaver(),
    )


async def chat(message: str, session_id: str = "default") -> str:
    """One conversational turn. Memory persists per session_id for the
    lifetime of the process (swap InMemorySaver for a DB saver to persist).

    Retries once: some providers occasionally reject a malformed tool call
    the model generated (e.g. Groq 'tool_use_failed'); a regenerate usually
    succeeds."""
    agent = get_agent()
    last_error = None
    for _ in range(2):
        try:
            result = await agent.ainvoke(
                {"messages": [{"role": "user", "content": message}]},
                config={"configurable": {"thread_id": session_id}},
            )
            return result["messages"][-1].content
        except Exception as e:  # noqa: BLE001 — provider errors vary widely
            last_error = e
    raise last_error
