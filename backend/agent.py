"""
Prelude ADK Root Agent — Orchestrator.

This is the entry point for the ADK framework. It defines the root_agent
that coordinates:
  1. SessionAgent  — real-time voice prep conversation (Gemini Live)
  2. BriefGeneratorAgent — post-session structured brief (Gemini Flash)

The root agent uses LLM-driven delegation: it examines the user's intent
and routes to the appropriate sub-agent. During a voice session, it hands
off to the SessionAgent. When the session ends and a brief is requested,
it delegates to the BriefGeneratorAgent.

ADK discovers this file via the __init__.py `from . import agent` import
and looks for the `root_agent` variable.
"""

from google.adk.agents import Agent

from backend.session_agent import create_session_agent
from backend.brief_agent import create_brief_agent

session_agent = create_session_agent(patient_name="there")
brief_agent = create_brief_agent()

root_agent = Agent(
    name="prelude_orchestrator",
    model="gemini-2.5-flash",
    description=(
        "Prelude orchestrator. Routes voice prep sessions to the SessionAgent "
        "and post-session brief generation to the BriefGeneratorAgent."
    ),
    instruction=(
        "You are the Prelude orchestrator. Your role is to route requests "
        "to the right specialist agent.\n\n"
        "- When a user wants to start or continue a voice prep session "
        "(talking before therapy), transfer to session_agent.\n"
        "- When a user wants to generate a brief from a completed session "
        "transcript, transfer to brief_generator.\n\n"
        "Do not try to handle these tasks yourself. Always delegate to "
        "the appropriate sub-agent."
    ),
    sub_agents=[session_agent, brief_agent],
)
