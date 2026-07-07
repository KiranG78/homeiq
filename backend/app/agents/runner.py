from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types as genai_types
from app.agents.supervisor import build_supervisor_agent
from contextlib import AsyncExitStack
import json

runner = None
session_service = InMemorySessionService()

async def init_runner(exit_stack: AsyncExitStack):
    global runner
    if runner is not None:
        return
    
    supervisor_agent = await build_supervisor_agent(exit_stack)
    runner = Runner(
        agent=supervisor_agent,
        app_name="homeiq",
        session_service=session_service
    )

APP_NAME   = "homeiq"
USER_ID    = "user_001"

import base64

async def stream_agent_response(session_id: str, user_message: str, image_base64: str = None):
    """
    Async generator — streams ADK events to the WebSocket handler.
    Yields dicts: {type, content} matching the frontend event protocol.
    """
    if runner is None:
        yield {"type": "token", "content": "Error: Agent is not initialized."}
        yield {"type": "tool_end"}
        return

    session_service.create_session(
        app_name=APP_NAME, user_id=USER_ID, session_id=session_id
    )

    parts = [genai_types.Part.from_text(text=user_message)]
    
    if image_base64:
        # Strip data URL prefix if present
        if "," in image_base64:
            image_base64 = image_base64.split(",")[1]
        image_bytes = base64.b64decode(image_base64)
        parts.append(genai_types.Part.from_bytes(data=image_bytes, mime_type="image/jpeg"))

    content = genai_types.Content(
        role="user",
        parts=parts
    )

    tool_labels = {
        "list_all_appliances":        "Fetching your appliances...",
        "get_appliance_detail":        "Looking up appliance details...",
        "filter_appliances":           "Filtering appliances...",
        "get_home_summary":            "Building your home summary...",
        "check_warranty_status":       "Checking warranty status...",
        "get_expiring_warranties":     "Checking expiring warranties...",
        "get_all_warranty_statuses":   "Reviewing all warranties...",
        "get_claim_contact":           "Finding claim contact...",
        "calculate_home_health_score": "Calculating home health score...",
    }

    try:
        async for event in runner.run_async(
            user_id=USER_ID,
            session_id=session_id,
            new_message=content
        ):
            # Stream text tokens
            if event.content and event.content.parts:
                for part in event.content.parts:
                    if part.text:
                        text = part.text
                        suggested = []

                        # Extract suggested_questions JSON if present
                        if '{"suggested_questions"' in text:
                            try:
                                idx = text.index('{"suggested_questions"')
                                json_str = text[idx:]
                                parsed = json.loads(json_str)
                                suggested = parsed.get("suggested_questions", [])
                                text = text[:idx].strip()
                            except Exception:
                                pass

                        if text:
                            yield {"type": "token", "content": text}
                        if suggested:
                            yield {"type": "suggested_questions", "questions": suggested}

            # Tool call started
            if hasattr(event, "tool_calls") and event.tool_calls:
                for tc in event.tool_calls:
                    label = tool_labels.get(tc.name, "Working...")
                    yield {"type": "tool_start", "tool_name": tc.name, "label": label}

            # Tool call finished
            if hasattr(event, "tool_responses") and event.tool_responses:
                yield {"type": "tool_end"}

            # Let the ADK generator complete naturally to avoid GeneratorExit telemetry crashes
            pass
            
    except Exception as e:
        import traceback
        traceback.print_exc()
        # Gracefully handle rate limits or API errors
        error_msg = str(e)
        if "429" in error_msg:
            yield {"type": "token", "content": f"\n\n⚠️ **Rate Limit Exceeded:** {error_msg}"}
        else:
            yield {"type": "token", "content": f"\n\n⚠️ **API Error:** {error_msg}"}
        
        yield {"type": "tool_end"}
