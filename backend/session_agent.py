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
    get_memory_cues,
    suggest_follow_ups,
    save_patient_words,
    flag_distress,
    get_session_summary,
    cleanup_session,
)
from backend.tools.firestore_tools import get_session_context_for_patient

LIVE_MODEL = "gemini-2.5-flash-native-audio-preview-12-2025"


def create_session_agent(
    patient_name: str = "there",
    user_id: str | None = None,
    session_id: str | None = None,
) -> Agent:
    """Creates a SessionAgent configured for a specific patient.

    Args:
        patient_name: The patient's first name for personalized greetings.
        user_id: Optional. Passed into instruction so the agent can call
            get_previous_session_context and get_memory_cues with patient_id.
        session_id: Optional. Passed into instruction so the agent can call
            session tools (e.g. suggest_follow_ups) with the correct session_id.

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
            "emotional weight, phase management, prior-session context, "
            "memory cues, and follow-up suggestions."
        ),
        instruction=build_session_instruction(
            patient_name, user_id=user_id, session_id=session_id
        ),
        tools=[
            get_previous_session_context,
            get_current_phase,
            advance_phase,
            log_topic,
            get_highest_weight_topic,
            get_memory_cues,
            suggest_follow_ups,
            save_patient_words,
            flag_distress,
            get_session_summary,
            cleanup_session,
            get_session_context_for_patient,
        ],
    )
