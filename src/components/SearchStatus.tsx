import { motion, AnimatePresence } from "framer-motion";
import { Globe, Brain, Loader2, BookOpen } from "lucide-react";

interface SearchStatusProps {
  isSearching: boolean;
  isThinking: boolean;
  hasRagContext: boolean;
}

export function SearchStatus({ isSearching, isThinking, hasRagContext }: SearchStatusProps) {
  if (!isSearching && !isThinking && !hasRagContext) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        className="flex items-center gap-3 py-2"
      >
        {isSearching && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-1.5 text-[10px] font-medium text-primary"
          >
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Searching the web...</span>
          </motion.div>
        )}
        {hasRagContext && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-1.5 text-[10px] font-medium text-accent"
          >
            <BookOpen className="h-3 w-3" />
            <span>Using knowledge base</span>
          </motion.div>
        )}
        {isThinking && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground"
          >
            <Brain className="h-3 w-3" />
            <span>Thinking...</span>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
