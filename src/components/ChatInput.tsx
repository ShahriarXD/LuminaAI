import { useState } from "react";
import { motion } from "framer-motion";
import { Paperclip, Brain, Globe, Mic, SendHorizonal, Image } from "lucide-react";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { VoiceListeningOverlay } from "@/components/VoiceListeningOverlay";
import { useIsMobile } from "@/hooks/use-mobile";

interface ChatInputProps {
  onSend: (message: string, deepThink: boolean, searchInternet: boolean) => void;
  onImageGen?: (prompt: string) => void;
  onAttach?: () => void;
  isLoading?: boolean;
}

export function ChatInput({ onSend, onImageGen, onAttach, isLoading }: ChatInputProps) {
  const [value, setValue] = useState("");
  const [deepThink, setDeepThink] = useState(false);
  const [searchInternet, setSearchInternet] = useState(false);
  const [imageMode, setImageMode] = useState(false);
  const { isListening, transcript, interimTranscript, isSupported, startListening, stopListening, cancelListening } = useSpeechRecognition();
  const isMobile = useIsMobile();

  const handleSubmit = () => {
    if (!value.trim() || isLoading) return;
    if (imageMode && onImageGen) {
      onImageGen(value.trim());
    } else {
      onSend(value.trim(), deepThink, searchInternet);
    }
    setValue("");
  };

  const handleVoiceDone = () => {
    stopListening();
    const text = (transcript + " " + interimTranscript).trim();
    if (text) setValue((prev) => (prev ? prev + " " + text : text));
  };

  const handleToggleImage = () => {
    setImageMode(!imageMode);
    if (!imageMode) {
      setDeepThink(false);
      setSearchInternet(false);
    }
  };

  const ringClass = imageMode
    ? "ring-2 ring-[hsl(330_60%_55%_/_0.4)]"
    : deepThink && searchInternet
    ? "ring-2 ring-[hsl(280_50%_60%_/_0.4)]"
    : deepThink
    ? "ring-2 ring-accent/40"
    : searchInternet
    ? "ring-2 ring-primary/40"
    : "";

  return (
    <>
      <VoiceListeningOverlay
        isListening={isListening}
        transcript={transcript}
        interimTranscript={interimTranscript}
        onStop={handleVoiceDone}
        onCancel={cancelListening}
      />
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-2xl mx-auto px-1"
      >
        <div
          className={`glass-strong rounded-2xl shadow-glass p-1 transition-all duration-300 hover:shadow-glass-hover ${ringClass}`}
          style={{
            boxShadow: "0 8px 32px hsl(240 20% 50% / 0.08), inset 0 1px 0 hsl(0 0% 100% / 0.4)",
          }}
        >
          <div className="px-3 sm:px-4 pt-3 pb-2">
            <input
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder={
                imageMode ? "Describe the image you want to generate..." :
                deepThink && searchInternet ? "Search & analyze..." :
                searchInternet ? "Ask anything (web search)..." :
                deepThink ? "Ask anything (Deep Think)..." :
                "Ask me anything..."
              }
              className="w-full bg-transparent text-foreground placeholder:text-muted-foreground text-sm outline-none font-body"
              disabled={isLoading}
            />
          </div>
          <div className={`flex items-center justify-between px-2 sm:px-3 pb-2.5 ${isMobile ? "gap-1" : ""}`}>
            <div className={`flex items-center ${isMobile ? "gap-0.5" : "gap-1"}`}>
              <ActionButton icon={Paperclip} label={isMobile ? "" : "Attach"} onClick={onAttach} compact={isMobile} />
              {!imageMode && (
                <>
                  <ActionButton icon={Brain} label={isMobile ? "" : "Think"} active={deepThink} onClick={() => setDeepThink(!deepThink)} compact={isMobile} />
                  <ActionButton icon={Globe} label={isMobile ? "" : "Search"} active={searchInternet} onClick={() => setSearchInternet(!searchInternet)} activeColor="primary" compact={isMobile} />
                </>
              )}
              <ActionButton icon={Image} label={isMobile ? "" : "Image"} active={imageMode} onClick={handleToggleImage} activeColor="image" compact={isMobile} />
            </div>
            <div className={`flex items-center ${isMobile ? "gap-0.5" : "gap-1"}`}>
              {isSupported && (
                <ActionButton icon={Mic} label={isMobile ? "" : "Voice"} onClick={startListening} compact={isMobile} />
              )}
              <button
                onClick={handleSubmit}
                disabled={!value.trim() || isLoading}
                className="group flex items-center gap-1.5 rounded-full gradient-send px-3 sm:px-4 py-1.5 text-xs font-medium text-primary-foreground transition-all duration-200 hover:shadow-glow hover:brightness-110 hover:-translate-y-0.5 btn-press disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              >
                <SendHorizonal className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
                {!isMobile && <span>{imageMode ? "Generate" : "Send"}</span>}
              </button>
            </div>
          </div>
        </div>
        {(deepThink || searchInternet || imageMode) && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-2 flex items-center justify-center gap-3 text-[10px] font-medium"
          >
            {imageMode && <span className="text-pink-500">🖼️ Image Generation</span>}
            {deepThink && <span className="text-accent">🧠 Deep Think</span>}
            {searchInternet && <span className="text-primary">🌐 Web search</span>}
          </motion.div>
        )}
      </motion.div>
    </>
  );
}

function ActionButton({ icon: Icon, label, active, onClick, activeColor = "accent", compact }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active?: boolean;
  onClick?: () => void;
  activeColor?: "accent" | "primary" | "image";
  compact?: boolean;
}) {
  const activeClasses = activeColor === "primary"
    ? "bg-primary/15 text-primary shadow-soft"
    : activeColor === "image"
    ? "bg-pink-500/15 text-pink-500 shadow-soft"
    : "bg-accent/15 text-accent shadow-soft";

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full ${compact ? "px-2 py-1.5" : "px-3 py-1.5"} text-xs font-medium transition-all duration-200 hover:-translate-y-0.5 btn-press ${
        active ? activeClasses : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label && <span>{label}</span>}
    </button>
  );
}
