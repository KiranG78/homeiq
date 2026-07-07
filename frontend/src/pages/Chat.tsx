import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, User, Send, Sparkles, Loader2, Wrench, Wifi, WifiOff } from 'lucide-react';
import { useWebSocket } from '../hooks/useWebSocket';

export default function Chat() {
  const { messages, isStreaming, activeTool, sendMessage, connect, connectionStatus } = useWebSocket();
  const [input, setInput] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    connect();
  }, [connect]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeTool, isStreaming]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImageBase64(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !imageBase64) || isStreaming) return;

    sendMessage(input || "Analyzing image...", imageBase64 || undefined);
    setInput('');
    removeImage();
  };

  const initialSuggestions = [
    "List all my appliances",
    "Which appliances are under warranty?",
    "Give me a home summary"
  ];

  return (
    <div className="flex flex-col h-full bg-card/40 backdrop-blur-xl border border-border/40 shadow-2xl rounded-3xl overflow-hidden relative">

      {/* Header */}
      <div className="bg-secondary/30 border-b border-border/40 px-6 py-4 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">HomeIQ Assistant</h2>
            <p className="text-sm text-gray-400">Ask about your appliances, warranties, or home health</p>
          </div>
        </div>

        {/* Connection Status */}
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${connectionStatus === 'connected' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
            connectionStatus === 'connecting' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
              'bg-red-500/10 text-red-400 border border-red-500/20'
          }`}>
          {connectionStatus === 'connected' ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
          <span className="capitalize">{connectionStatus}</span>
        </div>
      </div>

      {/* Chat History */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col space-y-6">
        <AnimatePresence initial={false}>
          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex-1 flex flex-col items-center justify-center text-center max-w-lg mx-auto w-full"
            >
              <div className="w-16 h-16 bg-secondary/50 rounded-2xl shadow-sm flex items-center justify-center mb-6 text-primary">
                <Sparkles className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-2">How can I help today?</h3>
              <p className="text-gray-400 mb-8">I can answer questions about your appliances, check warranty status, or calculate your home health score.</p>

              <div className="flex flex-wrap justify-center gap-3">
                {initialSuggestions.map((q) => (
                  <button key={q} onClick={() => sendMessage(q)}
                    className="px-4 py-2 bg-secondary/30 border border-border/40 rounded-full text-sm font-medium text-gray-300 hover:text-primary hover:border-primary hover:bg-primary/10 transition-all shadow-sm">
                    {q}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {messages.map((msg, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex max-w-[80%] gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center mt-1 ${msg.role === 'user' ? 'bg-secondary text-gray-300' : 'bg-primary text-white shadow-md'
                  }`}>
                  {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                </div>

                <div className="flex flex-col">
                  <div className={`px-5 py-3.5 rounded-2xl ${msg.role === 'user'
                      ? 'bg-primary text-white rounded-tr-sm'
                      : 'bg-card border border-border/40 text-foreground rounded-tl-sm shadow-sm'
                    }`}>
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  </div>

                  {msg.role === 'assistant' && msg.suggestedQuestions && msg.suggestedQuestions.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="flex flex-wrap gap-2 mt-3 pl-2"
                    >
                      {msg.suggestedQuestions.map((q) => (
                        <button key={q} onClick={() => sendMessage(q)} disabled={isStreaming}
                          className="text-xs px-3 py-1.5 rounded-full border border-border/40 bg-secondary/30 hover:bg-primary/10 hover:text-primary hover:border-primary text-gray-300 transition-colors shadow-sm disabled:opacity-50">
                          {q}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}

          {activeTool && (
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
              className="flex justify-start"
            >
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex-shrink-0 flex items-center justify-center mt-1 text-primary animate-pulse">
                  <Bot className="w-5 h-5" />
                </div>
                <div className="px-5 py-3.5 rounded-2xl bg-card border border-border/40 text-gray-400 rounded-tl-sm shadow-sm flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-gray-500 animate-bounce" />
                  <span className="text-sm italic">{activeTool}</span>
                </div>
              </div>
            </motion.div>
          )}

          {isStreaming && !activeTool && messages.length > 0 && messages[messages.length - 1].role === 'user' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-primary flex-shrink-0 flex items-center justify-center mt-1 text-white shadow-md">
                  <Bot className="w-5 h-5" />
                </div>
                <div className="px-5 py-4 rounded-2xl bg-card border border-border/40 text-foreground rounded-tl-sm shadow-sm flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} className="h-4" />
      </div>

      {/* Input Area */}
      <div className="p-6 bg-secondary/30 border-t border-border/40 z-10 flex flex-col items-center">
        {imageBase64 && (
          <div className="max-w-4xl w-full mb-4 relative inline-block">
            <img src={imageBase64} alt="Upload preview" className="h-24 w-auto rounded-lg shadow-sm border border-border/40" />
            <button
              onClick={removeImage}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 shadow-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
            </button>
          </div>
        )}
        <form onSubmit={handleSubmit} className="max-w-4xl w-full relative flex items-center gap-2">
          <label className="flex-shrink-0 cursor-pointer p-3 text-gray-400 hover:text-primary transition-colors bg-secondary/50 border border-border/40 rounded-full hover:bg-primary/10">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.2 15c.7-1.2 1-2.5.7-3.9-.6-2-2.4-3.5-4.4-3.5h-1.2c-.7-3-3.2-5.2-6.2-5.6-3-.3-5.9 1.3-7.3 4-1.2 2.5-1 6.5.5 8.8m8.7-1.6V21" /><path d="M16 16l-4-4-4 4" /></svg>
            <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} disabled={isStreaming} />
          </label>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isStreaming}
            placeholder="Ask anything or upload a photo of a broken appliance..."
            className="flex-1 pl-5 pr-14 py-4 bg-secondary/20 border border-border/40 rounded-full focus:ring-2 focus:ring-primary focus:border-primary transition-all shadow-inner text-foreground placeholder:text-gray-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={(!input.trim() && !imageBase64) || isStreaming}
            className="absolute right-2 top-2 bottom-2 aspect-square flex items-center justify-center bg-primary text-white rounded-full hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:hover:bg-primary shadow-sm"
          >
            {isStreaming ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 ml-0.5" />}
          </button>
        </form>
      </div>
    </div>
  );
}
