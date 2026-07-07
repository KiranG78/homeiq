import json
import asyncio
from typing import AsyncGenerator
from google.adk.models import BaseLlm, LlmRequest, LlmResponse
from anthropic import AsyncAnthropic
from app.core.config import settings
import google.genai.types as genai_types

class ClaudeLlm(BaseLlm):
    @classmethod
    def supported_models(cls) -> list[str]:
        return [r"^claude-.*$"]

    async def generate_content_async(
        self, llm_request: LlmRequest, stream: bool = False
    ) -> AsyncGenerator[LlmResponse, None]:
        client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
        
        # 1. System prompt
        system_msg = ""
        if llm_request.config and hasattr(llm_request.config, "system_instruction"):
            si = llm_request.config.system_instruction
            if isinstance(si, str):
                system_msg = si
            elif hasattr(si, "parts"):
                system_msg = " ".join([p.text for p in si.parts if hasattr(p, "text")])

        # 2. Tools mapping
        tools = []
        if llm_request.config and getattr(llm_request.config, "tools", None):
            for tool_obj in llm_request.config.tools:
                for func_decl in getattr(tool_obj, "function_declarations", []):
                    anthropic_tool = {
                        "name": func_decl.name,
                        "description": func_decl.description or "",
                        "input_schema": {
                            "type": "object",
                            "properties": {}
                        }
                    }
                    parameters = getattr(func_decl, "parameters", None)
                    if parameters:
                        if hasattr(parameters, "properties"):
                            props = {}
                            for k, v in parameters.properties.items():
                                prop = {"type": "string"}
                                desc = getattr(v, "description", None)
                                if desc is not None:
                                    prop["description"] = desc
                                props[k] = prop
                            anthropic_tool["input_schema"]["properties"] = props
                        req = getattr(parameters, "required", None)
                        if req is not None and len(req) > 0:
                            anthropic_tool["input_schema"]["required"] = list(req)
                    
                    print(f"ANTHROPIC TOOL: {json.dumps(anthropic_tool, indent=2)}")
                    tools.append(anthropic_tool)

        # 3. Messages mapping
        messages = []
        for content in llm_request.contents:
            role = "user" if content.role in ("user", "function") else "assistant"
            content_blocks = []
            
            for part in getattr(content, "parts", []):
                if hasattr(part, "text") and part.text:
                    content_blocks.append({"type": "text", "text": part.text})
                elif hasattr(part, "inline_data") and part.inline_data:
                    # Handle image bytes
                    import base64
                    data = part.inline_data.data
                    mime_type = part.inline_data.mime_type
                    b64_data = base64.b64encode(data).decode("utf-8")
                    content_blocks.append({
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": mime_type,
                            "data": b64_data
                        }
                    })
                elif hasattr(part, "function_call") and part.function_call:
                    fc = part.function_call
                    # google.protobuf.Struct to dict
                    args_dict = {}
                    if hasattr(fc, "args"):
                        for k, v in fc.args.items():
                            args_dict[k] = v
                    content_blocks.append({
                        "type": "tool_use",
                        "id": f"call_{fc.name}",
                        "name": fc.name,
                        "input": args_dict
                    })
                elif hasattr(part, "function_response") and part.function_response:
                    fr = part.function_response
                    resp_dict = {}
                    if hasattr(fr, "response"):
                        for k, v in fr.response.items():
                            resp_dict[k] = v
                    def to_serializable(val):
                        if hasattr(val, "model_dump"):
                            return val.model_dump()
                        elif hasattr(val, "to_dict"):
                            return val.to_dict()
                        elif isinstance(val, (list, tuple)):
                            return [to_serializable(i) for i in val]
                        elif isinstance(val, dict):
                            return {k: to_serializable(v) for k, v in val.items()}
                        elif not isinstance(val, (int, float, str, bool, type(None))):
                            return str(val)
                        return val

                    # Tool results must be sent by user in Claude
                    role = "user"
                    content_blocks.append({
                        "type": "tool_result",
                        "tool_use_id": f"call_{fr.name}",
                        "content": json.dumps(to_serializable(resp_dict))
                    })
                    
            if content_blocks:
                messages.append({"role": role, "content": content_blocks})

        # Ensure alternate user/assistant pattern
        merged_messages = []
        for m in messages:
            if not merged_messages:
                merged_messages.append(m)
            else:
                last_role = merged_messages[-1]["role"]
                if last_role == m["role"]:
                    merged_messages[-1]["content"].extend(m["content"])
                else:
                    merged_messages.append(m)

        # Call Anthropic
        kwargs = {
            "model": self.model,
            "max_tokens": 1024,
            "messages": merged_messages,
        }
        if system_msg:
            kwargs["system"] = system_msg
        if tools:
            kwargs["tools"] = tools

        response = await client.messages.create(**kwargs)

        # 4. Map back to LlmResponse
        out_parts = []
        for block in response.content:
            if block.type == "text":
                out_parts.append(genai_types.Part(text=block.text))
            elif block.type == "tool_use":
                out_parts.append(genai_types.Part(
                    function_call=genai_types.FunctionCall(
                        name=block.name,
                        args=block.input
                    )
                ))

        out_content = genai_types.Content(role="model", parts=out_parts)
        yield LlmResponse(content=out_content)
