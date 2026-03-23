import { motion } from "framer-motion";
import { Lightbulb, Code, PenLine, Zap, MoreHorizontal } from "lucide-react";

const chips = [
  { icon: Lightbulb, label: "Explain a concept" },
  { icon: Code, label: "Write code" },
  { icon: PenLine, label: "Help me write" },
  { icon: Zap, label: "Brainstorm ideas" },
];

interface ActionChipsProps {
  onSelect: (label: string) => void;
}

export function ActionChips({ onSelect }: ActionChipsProps) {
  return (
    <motion.div
      initial={{ y: 16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-wrap items-center justify-center gap-2"
    >
      {chips.map((chip, i) => (
        <motion.button
          key={chip.label}
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.3 + i * 0.07, ease: [0.16, 1, 0.3, 1] }}
          onClick={() => onSelect(chip.label)}
          className="flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-2 text-sm font-medium text-secondary-foreground shadow-soft backdrop-blur-sm transition-all duration-200 hover:shadow-glass hover:bg-card active:scale-[0.97]"
        >
          <chip.icon className="h-3.5 w-3.5 text-muted-foreground" />
          {chip.label}
        </motion.button>
      ))}
      <button className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card/60 text-muted-foreground shadow-soft backdrop-blur-sm transition-all duration-200 hover:shadow-glass hover:text-foreground active:scale-95">
        <MoreHorizontal className="h-4 w-4" />
      </button>
    </motion.div>
  );
}
