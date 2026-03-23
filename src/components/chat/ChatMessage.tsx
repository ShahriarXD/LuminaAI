import { useState } from "react";
import { motion } from "framer-motion";
import { Download, ZoomIn, X } from "lucide-react";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { MessageActions } from "./MessageActions";
import { SpeakButton } from "@/components/SpeakButton";
import { SourceCitations } from "@/components/SourceCitations";
import type { SourceCitation } from "@/lib/chat-api";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  sources?: SourceCitation[];
  images?: Array<{ type: string; image_url: { url: string } }>;
  index: number;
  isMobile: boolean;
  ttsSupported?: boolean;
  isSpeaking?: boolean;
  isPaused?: boolean;
  onSpeak?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onStop?: () => void;
  onRegenerate?: () => void;
}

function ImageViewer({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <button onClick={onClose} className="absolute top-4 right-4 text-white/80 hover:text-white p-2">
        <X className="h-6 w-6" />
      </button>
      <img src={src} alt="Full size" className="max-w-[90vw] max-h-[90vh] rounded-xl shadow-2xl" onClick={(e) => e.stopPropagation()} />
    </motion.div>
  );
}

function GeneratedImages({ images }: { images: Array<{ type: string; image_url: { url: string } }> }) {
  const [viewImage, setViewImage] = useState<string | null>(null);

  const handleDownload = (url: string, index: number) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = `generated-image-${index + 1}.png`;
    a.click();
  };

  return (
    <>
      {viewImage && <ImageViewer src={viewImage} onClose={() => setViewImage(null)} />}
      <div className="grid gap-2 mt-2" style={{ gridTemplateColumns: images.length > 1 ? "repeat(auto-fit, minmax(200px, 1fr))" : "1fr" }}>
        {images.map((img, i) => (
          <div key={i} className="relative group rounded-xl overflow-hidden border border-border/30">
            <img
              src={img.image_url.url}
              alt={`Generated image ${i + 1}`}
              className="w-full rounded-xl cursor-pointer transition-transform duration-200 hover:scale-[1.02]"
              onClick={() => setViewImage(img.image_url.url)}
            />
            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => setViewImage(img.image_url.url)}
                className="p-1.5 rounded-lg bg-black/50 text-white/90 hover:bg-black/70 backdrop-blur-sm transition-colors"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => handleDownload(img.image_url.url, i)}
                className="p-1.5 rounded-lg bg-black/50 text-white/90 hover:bg-black/70 backdrop-blur-sm transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export const ChatMessage = ({
  role, content, sources, images, index, isMobile,
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
          {content && <MarkdownRenderer content={content} />}
          {images && images.length > 0 && <GeneratedImages images={images} />}
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
