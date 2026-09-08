import React from "react";
import { Sparkles } from "lucide-react";

interface SuggestedPromptsProps {
  onSelectPrompt: (prompt: string) => void;
  disabled?: boolean;
}

const DEFAULT_PROMPTS = [
  "Pay @timbook 0.002 ETH",
  "What is @timbook's mix?",
  "Quote 100 USDG for @helen2swift",
  "What assets are on Robinhood Chain?",
  "Send NFT 0x4a0E65A3EcceC6dBe60AE065F2e7bb85Fae35eEa to @timbook",
];

export default function SuggestedPrompts({
  onSelectPrompt,
  disabled = false,
}: SuggestedPromptsProps) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto py-2 px-1 scrollbar-none">
      <div className="flex items-center gap-1.5 text-xs font-mono text-muted2 shrink-0 pr-1">
        <Sparkles className="w-3.5 h-3.5 text-red" />
        <span className="hidden sm:inline">Try:</span>
      </div>
      {DEFAULT_PROMPTS.map((prompt) => (
        <button
          key={prompt}
          type="button"
          disabled={disabled}
          onClick={() => onSelectPrompt(prompt)}
          className="shrink-0 rounded-full border border-hairline bg-base px-3 py-1 font-mono text-xs text-secondary2 hover:text-ink hover:border-red/40 hover:bg-card2/80 disabled:opacity-50 transition-all shadow-2xs"
        >
          {prompt}
        </button>
      ))}
    </div>
  );
}
