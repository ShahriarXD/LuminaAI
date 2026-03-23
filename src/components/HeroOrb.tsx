import { Suspense, useRef, useMemo, useCallback, useEffect, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import * as THREE from "three";
import { motion } from "framer-motion";

export type OrbState = "idle" | "userTyping" | "thinking" | "streaming" | "listening" | "processing";
interface HeroOrbProps { state?: OrbState; }

/* ── Glass Sphere (optimized) ────────────────────── */
function GlassOrb({ mouse, state }: { mouse: React.MutableRefObject<{ x: number; y: number }>; state: OrbState }) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const velX = useRef(0);
  const velY = useRef(0);
  const scaleRef = useRef(1.5);

  const gradientMap = useMemo(() => {
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    const g = ctx.createLinearGradient(0, 0, size, size);
    g.addColorStop(0, "#d4267e");
    g.addColorStop(0.3, "#e84a8a");
    g.addColorStop(0.5, "#b06aaa");
    g.addColorStop(0.7, "#28c5b8");
    g.addColorStop(1, "#1aafa5");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }, []);

  useFrame((clock, delta) => {
    if (!meshRef.current) return;
    const t = clock.clock.elapsedTime;

    // Inertial mouse
    const spring = 0.03;
    const damp = 0.88;
    velX.current = (velX.current + (mouse.current.y * 0.18 - meshRef.current.rotation.x) * spring) * damp;
    velY.current = (velY.current + (mouse.current.x * 0.22 - meshRef.current.rotation.y) * spring) * damp;
    meshRef.current.rotation.x += velX.current;
    meshRef.current.rotation.y += velY.current + delta * 0.05;

    // State-driven scale with smooth lerp (faster transitions for thinking/streaming)
    const scales: Record<OrbState, number> = { idle: 1.5, userTyping: 1.52, thinking: 1.56, streaming: 1.54, listening: 1.58, processing: 1.55 };
    const lerpSpeed = state === "thinking" || state === "streaming" ? 0.06 : 0.025;
    const ts = scales[state] + Math.sin(t * (state === "thinking" ? 1.8 : 0.9)) * (state === "thinking" ? 0.02 : 0.01);
    scaleRef.current = THREE.MathUtils.lerp(scaleRef.current, ts, lerpSpeed);
    meshRef.current.scale.setScalar(scaleRef.current);
  });

  return (
    <mesh ref={meshRef} scale={1.5}>
      <sphereGeometry args={[1, 64, 64]} />
      <meshPhysicalMaterial
        map={gradientMap}
        transmission={0.93}
        roughness={0.03}
        metalness={0.0}
        thickness={3.5}
        ior={2.1}
        envMapIntensity={1.8}
        clearcoat={1}
        clearcoatRoughness={0.02}
        transparent
        opacity={0.9}
        side={THREE.DoubleSide}
        attenuationColor={new THREE.Color("#a04070")}
        attenuationDistance={2.2}
        specularIntensity={1.3}
        specularColor={new THREE.Color("#ffffff")}
      />
    </mesh>
  );
}

/* ── Minimal inner glow (lightweight) ────────────── */
function InnerGlow({ state }: { state: OrbState }) {
  const ref = useRef<THREE.Mesh>(null!);
  const matRef = useRef<THREE.MeshBasicMaterial>(null!);

  useFrame((clock) => {
    if (!ref.current || !matRef.current) return;
    const t = clock.clock.elapsedTime;

    const intensities: Record<OrbState, number> = {
      idle: 0.04, userTyping: 0.06, thinking: 0.14,
      streaming: 0.10, listening: 0.12, processing: 0.11,
    };
    const speeds: Record<OrbState, number> = {
      idle: 0.5, userTyping: 0.8, thinking: 2.2,
      streaming: 1.6, listening: 1.8, processing: 2.0,
    };

    const target = intensities[state];
    const speed = speeds[state];
    const lerpRate = state === "thinking" || state === "listening" ? 0.08 : 0.03;

    // Pulsing opacity
    const pulse = target + Math.sin(t * speed) * target * 0.5;
    matRef.current.opacity = THREE.MathUtils.lerp(matRef.current.opacity, pulse, lerpRate);

    // Color shift: pink when thinking, cyan when streaming
    if (state === "thinking" || state === "processing") {
      matRef.current.color.lerp(new THREE.Color("#e84a8a"), 0.02);
    } else if (state === "streaming") {
      matRef.current.color.lerp(new THREE.Color("#28c5b8"), 0.02);
    } else if (state === "listening") {
      matRef.current.color.lerp(new THREE.Color("#d06aee"), 0.02);
    } else {
      matRef.current.color.lerp(new THREE.Color("#c06aaa"), 0.01);
    }

    // Subtle scale pulse for thinking
    if (state === "thinking") {
      const s = 1.35 + Math.sin(t * 2.5) * 0.04;
      ref.current.scale.setScalar(s);
    } else {
      ref.current.scale.setScalar(THREE.MathUtils.lerp(ref.current.scale.x, 1.35, 0.03));
    }
  });

  return (
    <mesh ref={ref} scale={1.35}>
      <sphereGeometry args={[1, 32, 32]} />
      <meshBasicMaterial
        ref={matRef}
        transparent
        opacity={0.04}
        color="#c06aaa"
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        side={THREE.BackSide}
      />
    </mesh>
  );
}

/* ── Floor caustic (simple additive plane) ───────── */
function CausticFloor({ state }: { state: OrbState }) {
  const ref = useRef<THREE.Mesh>(null!);
  const matRef = useRef<THREE.MeshBasicMaterial>(null!);

  useFrame((clock) => {
    if (!ref.current || !matRef.current) return;
    const t = clock.clock.elapsedTime;
    ref.current.rotation.z = t * 0.08;
    const opacities: Record<OrbState, number> = {
      idle: 0.06, userTyping: 0.08, thinking: 0.14,
      streaming: 0.11, listening: 0.15, processing: 0.12,
    };
    const target = opacities[state] + Math.sin(t * 1.5) * 0.02;
    matRef.current.opacity = THREE.MathUtils.lerp(matRef.current.opacity, target, 0.04);
  });

  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.55, 0]}>
      <ringGeometry args={[0.6, 2.8, 64]} />
      <meshBasicMaterial
        ref={matRef}
        transparent
        opacity={0.06}
        color="#60a0a0"
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}

/* ── Contact shadow ──────────────────────────────── */
function Shadow() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.56, 0]}>
      <circleGeometry args={[1.0, 48]} />
      <meshBasicMaterial transparent opacity={0.08} color="#1a1a2a" depthWrite={false} />
    </mesh>
  );
}

/* ── Scene ────────────────────────────────────────── */
function OrbScene({ mouse, state }: { mouse: React.MutableRefObject<{ x: number; y: number }>; state: OrbState }) {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[4, 6, 5]} intensity={0.9} />
      <directionalLight position={[-3, 2, -2]} intensity={0.25} color="#d0e0f0" />
      <pointLight position={[3, 2, 3]} intensity={0.5} color="#e84a8a" distance={10} />
      <pointLight position={[-3, -1, 3]} intensity={0.3} color="#28c5b8" distance={10} />

      <Float speed={1.0} rotationIntensity={0.08} floatIntensity={0.25} floatingRange={[-0.03, 0.03]}>
        <GlassOrb mouse={mouse} state={state} />
        <InnerGlow state={state} />
      </Float>

      <Shadow />
      <CausticFloor state={state} />
    </>
  );
}

/* ── Static fallback ─────────────────────────────── */
function StaticFallback() {
  return (
    <div className="relative flex items-center justify-center">
      <div className="absolute rounded-full" style={{ width: 220, height: 220, background: "var(--gradient-orb-glow)", filter: "blur(35px)" }} />
      <div className="h-48 w-48 rounded-full sm:h-56 sm:w-56" style={{
        background: "linear-gradient(135deg, #d4267e, #b06aaa, #28c5b8)",
        boxShadow: "0 16px 50px hsl(330 60% 50% / 0.25)",
        animation: "float 6s ease-in-out infinite",
      }} />
    </div>
  );
}

/* ── Main export ──────────────────────────────────── */
export function HeroOrb({ state = "idle" }: HeroOrbProps) {
  const mouse = useRef({ x: 0, y: 0 });
  const [supported, setSupported] = useState(true);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    mouse.current.x = (e.clientX - window.innerWidth / 2) / (window.innerWidth / 2);
    mouse.current.y = (e.clientY - window.innerHeight / 2) / (window.innerHeight / 2);
  }, []);

  useEffect(() => {
    try {
      const c = document.createElement("canvas");
      if (!(c.getContext("webgl2") || c.getContext("webgl"))) setSupported(false);
    } catch { setSupported(false); }
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [handleMouseMove]);

  if (!supported) {
    return <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.6 }}><StaticFallback /></motion.div>;
  }

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
      className="relative"
      style={{ width: "min(300px, 68vw)", height: "min(300px, 68vw)" }}
    >
      <motion.div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, hsl(330 55% 65% / 0.2) 0%, hsl(195 55% 55% / 0.1) 50%, transparent 72%)", filter: "blur(40px)", transform: "scale(1.4)" }}
        animate={{
          opacity: state === "thinking" ? [0.5, 0.8, 0.5] : state === "streaming" ? [0.4, 0.65, 0.4] : [0.25, 0.45, 0.25],
          scale: state === "listening" ? [1.3, 1.6, 1.3] : [1.35, 1.5, 1.35],
        }}
        transition={{ duration: state === "thinking" ? 1.5 : state === "streaming" ? 2.5 : 4.5, repeat: Infinity, ease: "easeInOut" }}
      />

      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 0.2, 4.2], fov: 38 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance", toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.15 }}
        style={{ pointerEvents: "none" }}
      >
        <Suspense fallback={null}>
          <OrbScene mouse={mouse} state={state} />
        </Suspense>
      </Canvas>
    </motion.div>
  );
}
