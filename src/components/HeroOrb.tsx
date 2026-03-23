import { motion, useMotionValue, useTransform, useSpring } from "framer-motion";
import { useEffect, useCallback } from "react";
import orbImage from "@/assets/orb.png";

export type OrbState = "idle" | "userTyping" | "thinking" | "streaming" | "listening" | "processing";
interface HeroOrbProps { state?: OrbState; }

const stateConfig: Record<OrbState, { glowOpacity: number[]; glowScale: number[]; glowDuration: number; breatheScale: number[]; breatheDuration: number }> = {
  idle:       { glowOpacity: [0.3, 0.5, 0.3],  glowScale: [1.3, 1.45, 1.3],  glowDuration: 5,   breatheScale: [1, 1.02, 1],    breatheDuration: 6 },
  userTyping: { glowOpacity: [0.35, 0.55, 0.35], glowScale: [1.3, 1.5, 1.3],  glowDuration: 4,   breatheScale: [1, 1.03, 1],    breatheDuration: 4 },
  thinking:   { glowOpacity: [0.45, 0.8, 0.45], glowScale: [1.35, 1.6, 1.35], glowDuration: 1.8, breatheScale: [1, 1.05, 1],    breatheDuration: 2 },
  streaming:  { glowOpacity: [0.4, 0.65, 0.4],  glowScale: [1.3, 1.55, 1.3],  glowDuration: 2.5, breatheScale: [1, 1.04, 1],    breatheDuration: 2.8 },
  listening:  { glowOpacity: [0.5, 0.85, 0.5],  glowScale: [1.35, 1.65, 1.35], glowDuration: 1.5, breatheScale: [1, 1.06, 1],   breatheDuration: 1.8 },
  processing: { glowOpacity: [0.45, 0.75, 0.45], glowScale: [1.3, 1.55, 1.3], glowDuration: 2,   breatheScale: [1, 1.045, 1],   breatheDuration: 2.2 },
};

export function HeroOrb({ state = "idle" }: HeroOrbProps) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { damping: 25, stiffness: 120, mass: 0.8 };
  const rotateX = useSpring(useTransform(mouseY, [-1, 1], [10, -10]), springConfig);
  const rotateY = useSpring(useTransform(mouseX, [-1, 1], [-10, 10]), springConfig);
  const translateX = useSpring(useTransform(mouseX, [-1, 1], [-6, 6]), springConfig);
  const translateY = useSpring(useTransform(mouseY, [-1, 1], [-6, 6]), springConfig);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    mouseX.set((e.clientX - window.innerWidth / 2) / (window.innerWidth / 2));
    mouseY.set((e.clientY - window.innerHeight / 2) / (window.innerHeight / 2));
  }, [mouseX, mouseY]);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [handleMouseMove]);

  const cfg = stateConfig[state];

  return (
    <motion.div
      className="relative flex items-center justify-center"
      style={{ perspective: 900 }}
    >
      {/* Deep ambient glow */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{ width: 280, height: 280, background: "radial-gradient(circle, hsl(330 55% 65% / 0.3) 0%, hsl(195 55% 55% / 0.15) 50%, transparent 72%)", filter: "blur(45px)" }}
        animate={{ opacity: cfg.glowOpacity, scale: cfg.glowScale }}
        transition={{ duration: cfg.glowDuration, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Orb with 3D parallax */}
      <motion.div
        style={{ rotateX, rotateY, x: translateX, y: translateY, transformStyle: "preserve-3d" }}
        className="relative z-10"
      >
        <motion.img
          src={orbImage}
          alt="AI Orb"
          draggable={false}
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: cfg.breatheScale, opacity: 1 }}
          transition={{
            scale: { duration: cfg.breatheDuration, repeat: Infinity, ease: "easeInOut" },
            opacity: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
          }}
          className="relative z-10 h-48 w-48 object-contain select-none sm:h-56 sm:w-56 md:h-64 md:w-64"
          style={{ filter: `drop-shadow(0 18px 36px hsl(330 60% 50% / 0.2)) drop-shadow(0 4px 12px hsl(195 60% 50% / 0.12))` }}
        />

        {/* Gloss highlight */}
        <motion.div
          className="absolute top-[8%] left-[18%] z-20 rounded-full pointer-events-none"
          style={{ width: "58%", height: "28%", background: "linear-gradient(180deg, hsl(0 0% 100% / 0.25) 0%, hsl(0 0% 100% / 0) 100%)", filter: "blur(5px)" }}
          animate={{ opacity: state === "thinking" || state === "listening" ? [0.4, 0.75, 0.4] : [0.35, 0.6, 0.35] }}
          transition={{ duration: state === "thinking" ? 1.5 : 3, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>

      {/* Reflection */}
      <motion.img
        src={orbImage}
        alt=""
        aria-hidden
        draggable={false}
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.1 }}
        transition={{ duration: 0.8, delay: 0.3 }}
        className="absolute -bottom-14 z-0 h-28 w-28 scale-y-[-1] object-contain blur-md select-none sm:h-32 sm:w-32"
      />
    </motion.div>
  );
}
