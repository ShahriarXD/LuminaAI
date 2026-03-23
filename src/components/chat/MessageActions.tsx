import { CopyButton } from "./CopyButton";
import { RefreshCw } from "lucide-react";

interface MessageActionsProps {
  content: string;
  role: "user" | "assistant";
  onRegenerate?: () => void;
}

export const MessageActions = ({ content, role, onRegenerate }: MessageActionsProps) => {
  return (
    <div className="flex items-center gap-1 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
      <CopyButton text={content} size={13} />
      {role === "assistant" && onRegenerate && (
        <button
          onClick={onRegenerate}
          className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
          title="Regenerate"
        >
          <RefreshCw size={13} />
        </button>
      )}
    </div>
  );
};
