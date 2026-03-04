"""
SessionAgent — ADK agent for the voice prep session.

Uses Gemini Live API (native audio model) with tools for phase management,
topic tracking, emotional weight logging, and prior-session context. The
agent uses these tools as resources to support a natural conversation,
not as a checklist to execute.
"""

from google.adk.agents import Agent

from backend.prompts.session_prompts import build_session_instruction
from backend.tools.session_tools import (
    get_previous_session_context,
    get_current_phase,
    advance_phase,
    log_topic,
    get_highest_weight_topic,
    save_patient_words,
    flag_distress,
    get_session_summary,
    cleanup_session,
)

LIVE_MODEL = "gemini-2.5-flash-native-audio-preview-12-2025"


def create_session_agent(patient_name: str = "there") -> Agent:
    """Creates a SessionAgent configured for a specific patient.

    Args:
        patient_name: The patient's first name for personalized greetings.

    Returns:
        An ADK Agent ready for voice session orchestration.
    """
    return Agent(
        name="session_agent",
        model=LIVE_MODEL,
        description=(
            "Voice-first therapy prep companion. Conducts a ~10-minute "
            "conversation with the patient to help them surface what matters "
            "most before their therapy session. Uses tools for topic tracking, "
            "emotional weight, phase management, and prior-session context."
        ),
        instruction=build_session_instruction(patient_name),
        tools=[
            get_previous_session_context,
            get_current_phase,
            advance_phase,
            log_topic,
            get_highest_weight_topic,
            save_patient_words,
            flag_distress,
            get_session_summary,
            cleanup_session,
        ],
    )
