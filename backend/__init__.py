# ADK discovers root_agent via `adk web` which imports backend.agent directly.
# The FastAPI server (backend.api.main) creates its own agent instances,
# so we don't eagerly import agent.py here to avoid startup side-effects.
