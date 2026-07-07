from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.agents.runner import stream_agent_response
import json
import uuid

router = APIRouter()

@router.websocket("/ws/chat")
async def chat_endpoint(websocket: WebSocket):
    await websocket.accept()
    session_id = str(uuid.uuid4())

    try:
        while True:
            raw = await websocket.receive_text()
            data = json.loads(raw)
            user_message = data.get("message", "")
            image_base64 = data.get("image_base64", None)

            # Stream all ADK events to the frontend
            async for event in stream_agent_response(session_id, user_message, image_base64):
                await websocket.send_json(event)

            # Signal response is complete
            await websocket.send_json({"type": "done"})

    except WebSocketDisconnect:
        pass
