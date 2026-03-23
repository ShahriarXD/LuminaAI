import { useState } from "react";
import { CopyButton } from "./CopyButton";
import { ChevronDown, ChevronUp, WrapText } from "lucide-react";

interface CodeBlockProps {
  children: string;
  language?: string;
  className?: string;
}

export const CodeBlock = ({ children, language, className }: CodeBlockProps) => {
  const [collapsed, setCollapsed] = useState(false);
  const [wrap, setWrap] = useState(false);
  const lines = children.split("\n").length;
  const isLong = lines > 20;
  const displayLang = language || "code";

  return (
    <div className="my-3 rounded-xl overflow-hidden border border-border/50 bg-[hsl(240_20%_8%)] shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-[hsl(240_15%_12%)] border-b border-border/30">
        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
          {displayLang}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setWrap(!wrap)}
            className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
            title={wrap ? "No wrap" : "Wrap lines"}
          >
            <WrapText size={13} />
          </button>
          {isLong && (
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
            >
              {collapsed ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
            </button>
          )}
          <CopyButton text={children} size={13} />
        </div>
      </div>

      {/* Code content */}
      <div
        className={`overflow-x-auto transition-all duration-300 ${collapsed ? "max-h-[120px]" : ""}`}
        style={collapsed ? { overflow: "hidden" } : {}}
      >
        <pre className={`p-4 text-[13px] leading-relaxed ${wrap ? "whitespace-pre-wrap" : "whitespace-pre"}`}>
          <code className={`${className || ""} text-[hsl(210_15%_85%)]`}>
            {children}
          </code>
        </pre>
      </div>

      {collapsed && isLong && (
        <button
          onClick={() => setCollapsed(false)}
          className="w-full py-1.5 text-[11px] text-muted-foreground hover:text-foreground bg-[hsl(240_15%_12%)] border-t border-border/30 transition-colors"
        >
          Show all {lines} lines
        </button>
      )}
    </div>
  );
};
