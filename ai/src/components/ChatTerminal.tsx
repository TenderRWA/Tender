import React, { useState, useRef, useEffect } from "react";
import { sendAiChat, ActionCardData } from "../lib/api";
import ActionCardView from "./ActionCardView";
import SuggestedPrompts from "./SuggestedPrompts";
import { ArrowUp } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  actionCard?: ActionCardData | null;
  timestamp: string;
}

interface ChatTerminalProps {
  xUsername: string | null;
  wallet: string;
}

export default function ChatTerminal({ xUsername, wallet }: ChatTerminalProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "intro",
      role: "assistant",
      content: `Welcome to **TenderAI**! ⚡ I am your autonomous settlement copilot.\n\nType any natural command or question without needing to mention any bot. For example:\n• \`Pay @timbook 0.002 ETH\`\n• \`What is @timbook's mix?\`\n• \`Quote 100 USDG for @helen2swift\`\n• \`Send NFT 0x4a0E... to @timbook\`\n• \`What assets can I elect?\``,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const queryText = (textToSend || input).trim();
    if (!queryText || isLoading) return;

    const userMsgId = `user_${Date.now()}`;
    const userMsg: Message = {
      id: userMsgId,
      role: "user",
      content: queryText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      // Build conversation history for context
      const history = messages.slice(-6).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await sendAiChat({
        message: queryText,
        history,
        userWallet: wallet,
      });

      const assistantMsg: Message = {
        id: `ai_${Date.now()}`,
        role: "assistant",
        content: res.reply,
        actionCard: res.actionCard,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error("[ChatTerminal] Error sending chat:", err);
      const errMsg: Message = {
        id: `err_${Date.now()}`,
        role: "assistant",
        content: `Sorry, I encountered an error: ${err.message || "Failed to reach TenderAI service"}. Please try again.`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] max-w-4xl mx-auto px-4 py-4 sm:px-6">
      {/* Active Identity Pill */}
      <div className="flex items-center justify-between py-1.5 px-3 mb-3 rounded-xl border border-hairline/80 bg-base/60 text-xs font-mono text-secondary2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-success" />
          <span>Active Identity:</span>
          <span className="font-bold text-ink">
            {xUsername ? `@${xUsername}` : "Verified User"}
          </span>
        </div>
        <div className="text-[11px] text-muted2">
          Autonomous Settlement Copilot
        </div>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
        {messages.map((msg) => {
          const isUser = msg.role === "user";
          return (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
            >
              {/* Avatar */}
              {isUser ? (
                <div className="w-8 h-8 rounded-xl flex items-center justify-center font-mono font-bold text-xs shrink-0 shadow-2xs border bg-ink text-white border-ink">
                  {xUsername ? xUsername.slice(0, 1).toUpperCase() : "U"}
                </div>
              ) : (
                <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-2xs border bg-base border-hairline p-1">
                  <img src="/logo.png" alt="Tender" className="w-full h-full object-contain" />
                </div>
              )}

              {/* Bubble */}
              <div
                className={`max-w-[85%] sm:max-w-[78%] rounded-2xl p-4 text-sm leading-relaxed ${
                  isUser
                    ? "bg-ink text-white rounded-tr-xs"
                    : "glass rounded-tl-xs text-ink"
                }`}
              >
                <div className="flex items-center justify-between gap-4 mb-1">
                  <span className={`text-[10px] font-mono uppercase tracking-wider ${isUser ? "text-white/60" : "text-muted2"}`}>
                    {isUser ? `@${xUsername || "you"}` : "TenderAI Agent"}
                  </span>
                  <span className={`text-[10px] font-mono ${isUser ? "text-white/50" : "text-muted2"}`}>
                    {msg.timestamp}
                  </span>
                </div>

                {/* Text Content */}
                <div className="whitespace-pre-line font-body font-normal">
                  {msg.content}
                </div>

                {/* Optional Attached Action Card */}
                {msg.actionCard && (
                  <ActionCardView card={msg.actionCard} userWallet={wallet} />
                )}
              </div>
            </div>
          );
        })}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-2xs border bg-base border-hairline p-1">
              <img src="/logo.png" alt="Tender" className="w-full h-full object-contain" />
            </div>
            <div className="glass rounded-2xl rounded-tl-xs p-4 flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red animate-bounce" />
                <span className="w-1.5 h-1.5 rounded-full bg-red animate-bounce [animation-delay:0.2s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-red animate-bounce [animation-delay:0.4s]" />
              </div>
              <span className="text-xs font-mono text-secondary2">
                Routing intent on Uniswap V4...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Prompts */}
      <div className="pt-2">
        <SuggestedPrompts
          onSelectPrompt={(p) => handleSendMessage(p)}
          disabled={isLoading}
        />
      </div>

      {/* Input Composer */}
      <div className="pt-2">
        <div className="relative flex items-center rounded-2xl border border-hairline/90 bg-base p-1.5 shadow-sm focus-within:border-red/60 focus-within:ring-2 focus-within:ring-red/20 transition-all">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            placeholder="Ask TenderAI (e.g. 'Pay @timbook 0.002 ETH' or 'What is @timbook's mix?')..."
            className="flex-1 bg-transparent px-3 py-2 text-sm font-body text-ink placeholder:text-muted2 focus:outline-none"
          />

          <button
            onClick={() => handleSendMessage()}
            disabled={!input.trim() || isLoading}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-red text-white hover:bg-red-hover disabled:opacity-30 transition-colors shadow-2xs shrink-0 focus-visible:ring-2 focus-visible:ring-red/40"
            title="Send command"
          >
            <ArrowUp className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
        <div className="flex items-center justify-between px-2 pt-1 text-[10px] font-mono text-muted2">
          <span>Press Enter to send · Uniswap V4 Non-Custodial Delivery</span>
          <span>Zero Escrow Custody</span>
        </div>
      </div>
    </div>
  );
}
