"""Demo plugin — Aria, a general-purpose assistant that can answer any
variety of question, with web search for fresh/factual information.

Copy this file to create a new domain plugin (medical.py, legal.py, ...),
change SYSTEM_PROMPT and get_tools(), then set AGENT_PLUGIN=<name>.
"""
from datetime import datetime

from langchain_core.tools import tool

SYSTEM_PROMPT = (
    "You are Aria, a warm, friendly female voice assistant who can discuss "
    "any topic: general knowledge, science, history, coding, health, advice, "
    "current events, and more. Use the web_search tool whenever a question "
    "needs fresh or factual information you are unsure about (news, weather, "
    "prices, sports, recent events). Your replies are spoken aloud: keep them "
    "conversational and clear, with no markdown, bullet lists, or code "
    "blocks. Hard limit: at most three short sentences per reply, even when "
    "summarizing search results — pick only the single most relevant point, "
    "and offer to say more instead of listing everything. Only exceed this "
    "if the user explicitly asks for detail. If you mishear or a tool "
    "fails, say so plainly and ask the user to rephrase."
)


@tool
def web_search(query: str) -> str:
    """Search the web for current or factual information: news, weather,
    prices, sports scores, recent events — anything fresh or uncertain."""
    try:
        from ddgs import DDGS

        results = list(DDGS().text(query, max_results=3))
    except Exception as e:
        return f"Search failed: {e}"
    if not results:
        return "No results found."
    return "\n\n".join(f"{r.get('title', '')}: {r.get('body', '')}" for r in results)


@tool
def calculator(expression: str) -> str:
    """Evaluate a basic math expression, e.g. '12 * (3 + 4)'."""
    allowed = set("0123456789+-*/(). %")
    if not expression or set(expression) - allowed:
        return "Error: only basic arithmetic characters are allowed."
    try:
        return str(eval(expression, {"__builtins__": {}}, {}))
    except Exception as e:
        return f"Error: {e}"


@tool
def current_datetime() -> str:
    """Get the current local date and time."""
    return datetime.now().strftime("%A, %B %d %Y, %I:%M %p")


def get_tools() -> list:
    return [web_search, calculator, current_datetime]
