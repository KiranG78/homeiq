import { useState, useRef, useCallback } from "react"

export interface Message {
  role: "user" | "assistant"
  content: string
  suggestedQuestions?: string[]
}

export function useWebSocket() {
  const [messages, setMessages]       = useState<Message[]>([])
  const [isStreaming, setIsStreaming]  = useState(false)
  const [activeTool, setActiveTool]   = useState<string | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "disconnected">("disconnected")
  const streamBuffer                  = useRef("")
  const pendingSuggestions            = useRef<string[]>([])
  const ws                            = useRef<WebSocket | null>(null)
  const reconnectTimeout              = useRef<NodeJS.Timeout | null>(null)

  const connect = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN || ws.current?.readyState === WebSocket.CONNECTING) return;
    
    setConnectionStatus("connecting");
    ws.current = new WebSocket("ws://localhost:8000/api/ws/chat")

    ws.current.onopen = () => {
      setConnectionStatus("connected");
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
    }

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data)

      if (data.type === "token") {
        streamBuffer.current += data.content
        setMessages(prev => {
          const updated = [...prev]
          if (updated.at(-1)?.role === "assistant") {
            updated[updated.length - 1] = {
              ...updated[updated.length - 1],
              content: streamBuffer.current
            }
          } else {
            updated.push({ role: "assistant", content: streamBuffer.current })
          }
          return updated
        })
      } else if (data.type === "suggested_questions") {
        pendingSuggestions.current = data.questions
      } else if (data.type === "tool_start") {
        setActiveTool(data.label || "Working...")
      } else if (data.type === "tool_end") {
        setActiveTool(null)
      } else if (data.type === "done") {
        const suggestions = pendingSuggestions.current
        if (suggestions.length > 0) {
          setMessages(prev => {
            const updated = [...prev]
            if (updated.at(-1)?.role === "assistant") {
              updated[updated.length - 1].suggestedQuestions = suggestions
            }
            return updated
          })
        }
        setIsStreaming(false)
        setActiveTool(null)
        streamBuffer.current = ""
        pendingSuggestions.current = []
      }
    }

    ws.current.onclose = () => {
      setConnectionStatus("disconnected");
      setIsStreaming(false);
      setActiveTool(null);
      // Reconnect automatically
      reconnectTimeout.current = setTimeout(() => connect(), 3000);
    }

    ws.current.onerror = () => {
      // Error will trigger onclose which handles reconnect
      setIsStreaming(false)
      setActiveTool(null)
    }
  }, [])

  const sendMessage = useCallback((message: string, imageBase64?: string) => {
    if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
      connect()
    }
    setIsStreaming(true)
    setMessages(prev => [...prev, { role: "user", content: message }])
    
    // Check readyState before sending
    const trySend = (retries = 5) => {
        if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({ message, image_base64: imageBase64 }))
        } else if (retries > 0) {
            setTimeout(() => trySend(retries - 1), 500);
        } else {
            setIsStreaming(false);
            setMessages(prev => [...prev, { role: "assistant", content: "Error: Unable to connect to the server." }])
        }
    }
    
    trySend();
  }, [connect])

  return { messages, isStreaming, activeTool, sendMessage, connect, connectionStatus }
}
