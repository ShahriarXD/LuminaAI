import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Paperclip, Brain, Globe, Mic, SendHorizonal } from "lucide-react";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { VoiceListeningOverlay } from "@/components/VoiceListeningOverlay";

interface ChatInputProps {
  onSend: (message: string, deepThink: boolean, searchInternet: boolean) => void;
  isLoading?: boolean;
}

export function ChatInput({ onSend, isLoading }: ChatInputProps) {
  const [value, setValue] = useState("");
  const [deepThink, setDeepThink] = useState(false);
  const [searchInternet, setSearchInternet] = useState(false);
  const { isListening, transcript, interimTranscript, isSupported, startListening, stopListening, cancelListening } = useSpeechRecognition();

  const handleSubmit = () => {
    if (!value.trim() || isLoading) return;
    onSend(value.trim(), deepThink, searchInternet);
    setValue("");
  };

  const handleVoiceDone = () => {
    stopListening();
    const text = (transcript + " " + interimTranscript).trim();
    if (text) setValue((prev) => (prev ? prev + " " + text : text));
  };

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
        className="w-full max-w-2xl mx-auto"
      >
        <div className={`glass-strong rounded-2xl shadow-glass p-1 transition-all duration-300 hover:shadow-glass-hover ${deepThink ? "ring-2 ring-accent/40" : ""} ${searchInternet ? "ring-2 ring-primary/40" : ""} ${deepThink && searchInternet ? "ring-2 ring-[hsl(280_50%_60%_/_0.4)]" : ""}`}>
          <div className="px-4 pt-3 pb-2">
            <input
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder={
                deepThink && searchInternet ? "Search & analyze (both modes active)..." :
                searchInternet ? "Ask me anything (web search active)..." :
                deepThink ? "Ask me anything (Deep Think active)..." :
                "Ask me anything..."
              }
              className="w-full bg-transparent text-foreground placeholder:text-muted-foreground text-sm outline-none font-body"
              disabled={isLoading}
            />
          </div>
          <div className="flex items-center justify-between px-3 pb-2.5">
            <div className="flex items-center gap-1">
              <ActionButton icon={Paperclip} label="Attach" />
              <ActionButton icon={Brain} label="Deep Think" active={deepThink} onClick={() => setDeepThink(!deepThink)} />
              <ActionButton icon={Globe} label="Search" active={searchInternet} onClick={() => setSearchInternet(!searchInternet)} activeColor="primary" />
            </div>
            <div className="flex items-center gap-1">
              {isSupported && (
                <ActionButton icon={Mic} label="Voice" onClick={startListening} />
              )}
              <button
                onClick={handleSubmit}
                disabled={!value.trim() || isLoading}
                className="group flex items-center gap-1.5 rounded-full gradient-send px-4 py-1.5 text-xs font-medium text-primary-foreground transition-all duration-200 hover:shadow-glow hover:brightness-110 btn-press disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <SendHorizonal className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
                <span>Send</span>
              </button>
            </div>
          </div>
        </div>
        {(deepThink || searchInternet) && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-2 flex items-center justify-center gap-3 text-[10px] font-medium"
          >
            {deepThink && <span className="text-accent">🧠 Deep Think active</span>}
            {searchInternet && <span className="text-primary">🌐 Live web search active</span>}
          </motion.div>
        )}
      </motion.div>
    </>
  );
}

function ActionButton({ icon: Icon, label, active, onClick, activeColor = "accent" }: { icon: React.ComponentType<{ className?: string }>; label: string; active?: boolean; onClick?: () => void; activeColor?: "accent" | "primary" }) {
  const activeClasses = activeColor === "primary"
    ? "bg-primary/15 text-primary shadow-soft"
    : "bg-accent/15 text-accent shadow-soft";

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200 btn-press ${
        active ? activeClasses : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      <span>{label}</span>
    </button>
  );
}
