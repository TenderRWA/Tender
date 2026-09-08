import React from "react";

interface MarkdownTextProps {
  content: string;
  className?: string;
  isUser?: boolean;
}

export default function MarkdownText({
  content,
  className = "",
  isUser = false,
}: MarkdownTextProps) {
  const lines = content.split("\n");

  const renderInline = (text: string) => {
    const tokens: React.ReactNode[] = [];
    let remaining = text;
    let key = 0;

    // Regex to match `code`, **bold**, *italic*, [text](url)
    const regex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g;
    let match: RegExpExecArray | null;
    let lastIndex = 0;

    while ((match = regex.exec(remaining)) !== null) {
      const matchText = match[0];
      const matchIndex = match.index;

      if (matchIndex > lastIndex) {
        tokens.push(remaining.substring(lastIndex, matchIndex));
      }

      if (matchText.startsWith("`") && matchText.endsWith("`")) {
        const code = matchText.slice(1, -1);
        tokens.push(
          <code
            key={`code-${key++}`}
            className={`rounded px-1.5 py-0.5 font-mono text-xs font-semibold ${
              isUser
                ? "bg-white/20 text-white"
                : "bg-card2 text-red border border-hairline/80"
            }`}
          >
            {code}
          </code>
        );
      } else if (matchText.startsWith("**") && matchText.endsWith("**")) {
        const bold = matchText.slice(2, -2);
        tokens.push(
          <strong
            key={`bold-${key++}`}
            className={`font-semibold ${isUser ? "text-white" : "text-ink"}`}
          >
            {bold}
          </strong>
        );
      } else if (matchText.startsWith("*") && matchText.endsWith("*")) {
        const italic = matchText.slice(1, -1);
        tokens.push(
          <em key={`italic-${key++}`} className="italic">
            {italic}
          </em>
        );
      } else if (
        matchText.startsWith("[") &&
        matchText.includes("](") &&
        matchText.endsWith(")")
      ) {
        const title = matchText.substring(1, matchText.indexOf("]("));
        const url = matchText.substring(
          matchText.indexOf("](") + 2,
          matchText.length - 1
        );
        tokens.push(
          <a
            key={`link-${key++}`}
            href={url}
            target="_blank"
            rel="noreferrer"
            className="text-red underline font-medium hover:text-red-hover"
          >
            {title}
          </a>
        );
      }

      lastIndex = matchIndex + matchText.length;
    }

    if (lastIndex < remaining.length) {
      tokens.push(remaining.substring(lastIndex));
    }

    return tokens.length > 0 ? tokens : text;
  };

  return (
    <div className={`space-y-1.5 leading-relaxed text-sm ${className}`}>
      {lines.map((line, idx) => {
        const trimmed = line.trim();

        if (!trimmed) {
          return <div key={idx} className="h-1" />;
        }

        // Bullet point (•, -, *)
        if (/^[•\-*]\s+/.test(trimmed)) {
          const itemText = trimmed.replace(/^[•\-*]\s+/, "");
          return (
            <div key={idx} className="flex items-start gap-2 pl-1 my-0.5">
              <span
                className={`text-xs mt-1 shrink-0 ${
                  isUser ? "text-white/60" : "text-red"
                }`}
              >
                •
              </span>
              <span className="flex-1">{renderInline(itemText)}</span>
            </div>
          );
        }

        // Numbered list (1. , 2. )
        if (/^\d+\.\s+/.test(trimmed)) {
          const numMatch = trimmed.match(/^(\d+\.)\s+/);
          const num = numMatch ? numMatch[1] : "";
          const itemText = trimmed.replace(/^\d+\.\s+/, "");
          return (
            <div key={idx} className="flex items-start gap-2 pl-1 my-0.5">
              <span
                className={`font-mono text-xs mt-0.5 shrink-0 ${
                  isUser ? "text-white/60" : "text-muted2"
                }`}
              >
                {num}
              </span>
              <span className="flex-1">{renderInline(itemText)}</span>
            </div>
          );
        }

        // Headers
        if (trimmed.startsWith("### ")) {
          return (
            <h5
              key={idx}
              className="font-display font-bold text-sm text-ink pt-1"
            >
              {renderInline(trimmed.replace(/^###\s+/, ""))}
            </h5>
          );
        }
        if (trimmed.startsWith("## ")) {
          return (
            <h4
              key={idx}
              className="font-display font-bold text-base text-ink pt-1"
            >
              {renderInline(trimmed.replace(/^##\s+/, ""))}
            </h4>
          );
        }
        if (trimmed.startsWith("# ")) {
          return (
            <h3
              key={idx}
              className="font-display font-bold text-lg text-ink pt-1"
            >
              {renderInline(trimmed.replace(/^#\s+/, ""))}
            </h3>
          );
        }

        return <div key={idx}>{renderInline(line)}</div>;
      })}
    </div>
  );
}
