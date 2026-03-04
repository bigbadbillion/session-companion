"""
BriefGeneratorAgent — ADK agent for post-session brief generation.

Runs after the voice session ends. Takes the transcript + session metadata,
retrieves pattern history and recent briefs, generates a structured JSON
brief, persists everything to Firestore, and updates longitudinal pattern
tracking.

The session is saved by the endpoint BEFORE the agent runs (because the
transcript is too large to pass as a tool parameter). The agent receives
the session_id in its prompt and uses it when saving the brief.
"""

from google.adk.agents import Agent

from backend.prompts.brief_prompts import BRIEF_GENERATOR_INSTRUCTION
from backend.tools.firestore_tools import (
    get_patient_patterns,
    get_recent_briefs,
    update_patterns,
    save_brief,
)

FLASH_MODEL = "gemini-2.5-flash"


def create_brief_agent() -> Agent:
    """Creates a BriefGeneratorAgent for post-session processing.

    Returns:
        An ADK Agent that generates structured briefs from transcripts.
    """
    return Agent(
        name="brief_generator",
        model=FLASH_MODEL,
        description=(
            "Post-session brief generator. Analyzes the transcript from a "
            "completed therapy prep session, retrieves pattern history and "
            "recent briefs, generates a structured brief, saves it to "
            "Firestore, and updates longitudinal pattern tracking."
        ),
        instruction=BRIEF_GENERATOR_INSTRUCTION,
        tools=[
            get_patient_patterns,
            get_recent_briefs,
            update_patterns,
            save_brief,
        ],
    )
