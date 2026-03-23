import { motion } from "framer-motion";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { MessageActions } from "./MessageActions";
import { SpeakButton } from "@/components/SpeakButton";
import { SourceCitations } from "@/components/SourceCitations";
import type { SourceCitation } from "@/lib/chat-api";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  sources?: SourceCitation[];
  index: number;
  isMobile: boolean;
  // TTS
  ttsSupported?: boolean;
  isSpeaking?: boolean;
  isPaused?: boolean;
  onSpeak?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onStop?: () => void;
  onRegenerate?: () => void;
}

export const ChatMessage = ({
  role, content, sources, index, isMobile,
  ttsSupported, isSpeaking, isPaused,
  onSpeak, onPause, onResume, onStop,
  onRegenerate,
}: ChatMessageProps) => {
  if (role === "user") {
    return (
      <motion.div
        initial={{ y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, delay: index === 0 ? 0.15 : 0, ease: [0.16, 1, 0.3, 1] }}
        className="flex justify-end group"
      >
        <div className={`flex flex-col ${isMobile ? "max-w-[90%]" : "max-w-[75%]"}`}>
          <div className="rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap gradient-send text-primary-foreground shadow-glow">
            {content}
          </div>
          <div className="flex justify-end">
            <MessageActions content={content} role="user" />
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ y: 12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, delay: index === 0 ? 0.15 : 0, ease: [0.16, 1, 0.3, 1] }}
      className="flex justify-start group"
    >
      <div className={`flex flex-col ${isMobile ? "max-w-[95%]" : "max-w-[85%]"}`}>
        <div
          className="rounded-2xl px-4 py-3 glass text-foreground"
          style={{
            boxShadow: "0 2px 16px hsl(240 20% 50% / 0.06), inset 0 1px 0 hsl(0 0% 100% / 0.3)",
          }}
        >
          <MarkdownRenderer content={content} />
        </div>
        {sources && sources.length > 0 && <SourceCitations sources={sources} />}
        <div className="flex items-center gap-1">
          <MessageActions content={content} role="assistant" onRegenerate={onRegenerate} />
          {ttsSupported && content && (
            <SpeakButton
              isPlaying={!!isSpeaking}
              isPaused={!!isPaused}
              onSpeak={onSpeak!}
              onPause={onPause!}
              onResume={onResume!}
              onStop={onStop!}
            />
          )}
        </div>
      </div>
    </motion.div>
  );
};
