"use client";

import { useState, useRef, useEffect } from "react";
import { api } from "@/lib/api";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export default function AssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const welcomeMessage: ChatMessage = {
    id: "welcome",
    role: "assistant",
    content:
      "Hi! I'm the Automesh AI Agent. I can design, validate, and deploy workflow automations for you.\n\nI'll check your configured integrations before generating anything — so I'll tell you if something is missing.\n\n**Try describing a business problem:**\n• \"When a customer pays on Stripe, send them a welcome email and notify Slack.\"\n• \"Every Monday at 9am, send a weekly summary to the team.\"\n• \"When a GitHub issue is opened, notify the engineering channel on Slack.\"",
  };

  // Keep scroll at bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load session from DB on mount
  useEffect(() => {
    const loadSession = async () => {
      const savedSession = localStorage.getItem("automesh_ai_session");
      if (savedSession) {
        setSessionId(savedSession);
        try {
          const res = await api.getAiChatHistory(savedSession);
          if (res.history && res.history.length > 0) {
            setMessages(
              res.history.map((m, i) => ({
                id: `hist_${i}`,
                role: m.role as "user" | "assistant",
                content: m.content,
              }))
            );
          } else {
            setMessages([welcomeMessage]);
          }
        } catch (err) {
          console.error("Failed to load chat history", err);
          setMessages([welcomeMessage]);
        }
      } else {
        setMessages([welcomeMessage]);
      }
      setIsLoadingHistory(false);
    };

    loadSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isThinking) return;

    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      role: "user",
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentInput = input.trim();
    setInput("");
    setIsThinking(true);

    try {
      const result = await api.aiChat(currentInput, sessionId ?? undefined);

      // Save session ID for future messages
      if (!sessionId) {
        setSessionId(result.sessionId);
        localStorage.setItem("automesh_ai_session", result.sessionId);
      }

      const assistantMessage: ChatMessage = {
        id: `ai_${Date.now()}`,
        role: "assistant",
        content: result.message,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      const errorMessage: ChatMessage = {
        id: `err_${Date.now()}`,
        role: "assistant",
        content: `Sorry, I ran into an issue: ${err.message || "Unknown error"}. Please try again.`,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleNewSession = () => {
    setSessionId(null);
    localStorage.removeItem("automesh_ai_session");
    setMessages([
      {
        ...welcomeMessage,
        content: "Starting a fresh session! What would you like to automate?",
      },
    ]);
  };

  // Render message content with code blocks and basic markdown
  const renderContent = (text: string) => {
    // Split by code blocks
    const parts = text.split(/(```[\s\S]*?```)/g);

    return parts.map((part, i) => {
      // Code block
      const codeMatch = part.match(/```(\w*)\n?([\s\S]*?)```/);
      if (codeMatch) {
        const lang = codeMatch[1] || "yaml";
        const code = codeMatch[2].trim();
        return (
          <div key={i} className="my-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-medium text-muted uppercase tracking-wider">{lang}</span>
              <button
                onClick={() => navigator.clipboard.writeText(code)}
                className="text-[10px] text-muted hover:text-foreground transition-colors"
              >
                Copy
              </button>
            </div>
            <pre className="text-xs font-mono bg-background rounded-xl p-4 border border-border overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto">
              {code}
            </pre>
          </div>
        );
      }

      // Regular text with inline markdown
      const lines = part.split("\n");
      return (
        <span key={i}>
          {lines.map((line, j) => {
            // Bold
            let processed = line.replace(
              /\*\*(.*?)\*\*/g,
              '<strong class="font-semibold text-foreground">$1</strong>'
            );
            // Italic
            processed = processed.replace(
              /\*(.*?)\*/g,
              '<em class="italic text-muted">$1</em>'
            );
            // Inline code
            processed = processed.replace(
              /`(.*?)`/g,
              '<code class="px-1.5 py-0.5 rounded bg-surface text-xs font-mono">$1</code>'
            );

            return (
              <span key={j}>
                <span dangerouslySetInnerHTML={{ __html: processed }} />
                {j < lines.length - 1 && <br />}
              </span>
            );
          })}
        </span>
      );
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] max-w-5xl mx-auto">
      {/* Header */}
      <header className="shrink-0 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-linear-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3l1.912 5.813a2 2 0 001.272 1.278L21 12l-5.816 1.91a2 2 0 00-1.272 1.278L12 21l-1.912-5.813a2 2 0 00-1.272-1.278L3 12l5.816-1.91a2 2 0 001.272-1.278L12 3z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">AI Agent</h1>
              <p className="text-sm text-muted">Checks integrations · Validates · Deploys</p>
            </div>
          </div>
          <button
            onClick={handleNewSession}
            className="px-4 py-2 rounded-lg text-sm font-medium text-muted hover:text-foreground bg-surface hover:bg-surface-hover border border-border transition-colors"
          >
            New Session
          </button>
        </div>
      </header>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-2 scroll-smooth">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-5 py-4 ${
                message.role === "user"
                  ? "bg-accent/15 border border-accent/20 text-foreground"
                  : "glass border border-border"
              }`}
            >
              <div className="text-sm leading-relaxed">
                {renderContent(message.content)}
              </div>
            </div>
          </div>
        ))}

        {/* Thinking indicator */}
        {isThinking && (
          <div className="flex justify-start">
            <div className="glass border border-border rounded-2xl px-5 py-4 max-w-[85%]">
              <div className="flex items-center gap-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
                <span className="text-sm text-muted">Checking integrations & designing workflow...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="shrink-0 mt-4">
        <div className="glass rounded-2xl border border-border p-3 flex items-end gap-3 focus-within:border-accent/40 transition-colors">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe your business workflow problem..."
            rows={1}
            disabled={isThinking}
            className="flex-1 bg-transparent resize-none text-sm placeholder:text-muted/50 focus:outline-none min-h-[40px] max-h-[120px] py-2 disabled:opacity-50"
            style={{ fieldSizing: "content" } as any}
          />
          <button
            type="submit"
            disabled={!input.trim() || isThinking}
            className="shrink-0 w-10 h-10 rounded-xl bg-accent text-white flex items-center justify-center hover:bg-accent-bright transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
        <p className="text-[11px] text-muted/50 text-center mt-2">
          Powered by Groq · Llama 3.3 70B · Tool-calling agent with encrypted memory
        </p>
      </form>
    </div>
  );
}
