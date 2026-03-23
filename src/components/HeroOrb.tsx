import { Suspense, useRef, useMemo, useCallback, useEffect, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Float } from "@react-three/drei";
import * as THREE from "three";
import { motion } from "framer-motion";

/* ── Types ───────────────────────────────────────── */
export type OrbState = "idle" | "userTyping" | "thinking" | "streaming" | "listening" | "processing";

interface HeroOrbProps {
  state?: OrbState;
}

/* ── Custom inner energy shader ──────────────────── */
const innerEnergyVertexShader = `
  varying vec3 vPosition;
  varying vec3 vNormal;
  varying vec2 vUv;
  void main() {
    vPosition = position;
    vNormal = normalize(normalMatrix * normal);
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const innerEnergyFragmentShader = `
  uniform float uTime;
  uniform float uIntensity;
  uniform float uPulse;
  varying vec3 vPosition;
  varying vec3 vNormal;
  varying vec2 vUv;

  // Simplex-style noise
  vec3 mod289(vec3 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
      + i.y + vec4(0.0, i1.y, i2.y, 1.0))
      + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }

  void main() {
    float speed = uTime * 0.3;
    float n1 = snoise(vPosition * 2.0 + vec3(speed, 0.0, 0.0)) * 0.5 + 0.5;
    float n2 = snoise(vPosition * 3.5 + vec3(0.0, speed * 0.7, speed * 0.5)) * 0.5 + 0.5;
    float n3 = snoise(vPosition * 1.5 - vec3(speed * 0.4, speed * 0.3, 0.0)) * 0.5 + 0.5;

    // Pink → purple → cyan gradient driven by noise
    vec3 pink = vec3(0.85, 0.35, 0.55);
    vec3 purple = vec3(0.55, 0.30, 0.70);
    vec3 cyan = vec3(0.25, 0.70, 0.75);

    vec3 color = mix(pink, purple, n1);
    color = mix(color, cyan, n2 * 0.6);

    // Fresnel for edge glow
    float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.5);

    // Pulse effect
    float pulse = 1.0 + sin(uTime * uPulse * 6.28) * 0.15 * uPulse;

    float alpha = (0.12 + n3 * 0.15 + fresnel * 0.3) * uIntensity * pulse;

    gl_FragColor = vec4(color * (1.0 + fresnel * 0.5), alpha);
  }
`;

/* ── Inner energy shell ──────────────────────────── */
function InnerEnergy({ state }: { state: OrbState }) {
  const matRef = useRef<THREE.ShaderMaterial>(null!);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uIntensity: { value: 1.0 },
      uPulse: { value: 0.0 },
    }),
    []
  );

  useFrame((_, delta) => {
    if (!matRef.current) return;
    uniforms.uTime.value += delta;

    // State-based intensity & pulse
    const targets = {
      idle: { intensity: 0.8, pulse: 0.0 },
      userTyping: { intensity: 1.1, pulse: 0.15 },
      thinking: { intensity: 1.6, pulse: 0.5 },
      streaming: { intensity: 1.4, pulse: 0.3 },
      listening: { intensity: 1.3, pulse: 0.6 },
      processing: { intensity: 1.5, pulse: 0.7 },
    };

    const target = targets[state];
    uniforms.uIntensity.value = THREE.MathUtils.lerp(uniforms.uIntensity.value, target.intensity, 0.03);
    uniforms.uPulse.value = THREE.MathUtils.lerp(uniforms.uPulse.value, target.pulse, 0.04);
  });

  return (
    <mesh scale={1.48}>
      <sphereGeometry args={[1, 64, 64]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={innerEnergyVertexShader}
        fragmentShader={innerEnergyFragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        side={THREE.FrontSide}
      />
    </mesh>
  );
}

/* ── Glass Sphere ────────────────────────────────── */
function GlassOrb({
  mouse,
  state,
}: {
  mouse: React.MutableRefObject<{ x: number; y: number }>;
  state: OrbState;
}) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const targetRotX = useRef(0);
  const targetRotY = useRef(0);
  const velocityX = useRef(0);
  const velocityY = useRef(0);
  const baseScale = useRef(1.6);

  // Gradient map texture
  const gradientMap = useMemo(() => {
    const size = 512;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, "hsl(330, 65%, 62%)");
    gradient.addColorStop(0.35, "hsl(300, 45%, 52%)");
    gradient.addColorStop(0.65, "hsl(260, 50%, 55%)");
    gradient.addColorStop(1, "hsl(195, 70%, 55%)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    // Add subtle noise texture for imperfections
    const imageData = ctx.getImageData(0, 0, size, size);
    for (let i = 0; i < imageData.data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 6;
      imageData.data[i] += noise;
      imageData.data[i + 1] += noise;
      imageData.data[i + 2] += noise;
    }
    ctx.putImageData(imageData, 0, 0);

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }, []);

  // Roughness map with micro variation
  const roughnessMap = useMemo(() => {
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, size, size);
    const imageData = ctx.getImageData(0, 0, size, size);
    for (let i = 0; i < imageData.data.length; i += 4) {
      const v = 8 + Math.random() * 18;
      imageData.data[i] = v;
      imageData.data[i + 1] = v;
      imageData.data[i + 2] = v;
    }
    ctx.putImageData(imageData, 0, 0);
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }, []);

  useFrame((clock, delta) => {
    if (!meshRef.current) return;
    const t = clock.clock.elapsedTime;

    // Inertial mouse tracking (weighted spring)
    targetRotX.current = mouse.current.y * 0.25;
    targetRotY.current = mouse.current.x * 0.3;

    const springK = 0.04;
    const damping = 0.92;

    velocityX.current = (velocityX.current + (targetRotX.current - meshRef.current.rotation.x) * springK) * damping;
    velocityY.current = (velocityY.current + (targetRotY.current - meshRef.current.rotation.y) * springK) * damping;

    meshRef.current.rotation.x += velocityX.current;
    meshRef.current.rotation.y += velocityY.current;

    // Slow idle rotation
    meshRef.current.rotation.y += delta * 0.08;

    // State-driven scale breathing
    const stateScales: Record<OrbState, number> = {
      idle: 1.6,
      userTyping: 1.62,
      thinking: 1.65,
      streaming: 1.63,
      listening: 1.67,
      processing: 1.64,
    };
    const targetScale = stateScales[state] + Math.sin(t * 1.2) * 0.015;
    baseScale.current = THREE.MathUtils.lerp(baseScale.current, targetScale, 0.03);
    meshRef.current.scale.setScalar(baseScale.current);
  });

  return (
    <mesh ref={meshRef} scale={1.6}>
      <sphereGeometry args={[1, 128, 128]} />
      <meshPhysicalMaterial
        map={gradientMap}
        roughnessMap={roughnessMap}
        transmission={0.94}
        roughness={0.04}
        metalness={0.02}
        thickness={3.0}
        ior={2.0}
        envMapIntensity={1.5}
        clearcoat={1}
        clearcoatRoughness={0.03}
        transparent
        opacity={0.88}
        side={THREE.DoubleSide}
        attenuationColor={new THREE.Color("hsl(310, 50%, 55%)")}
        attenuationDistance={2.5}
        specularIntensity={1.2}
        specularColor={new THREE.Color("hsl(210, 60%, 85%)")}
        sheen={0.15}
        sheenColor={new THREE.Color("hsl(195, 70%, 70%)")}
        sheenRoughness={0.3}
      />
    </mesh>
  );
}

/* ── Contact shadow plane ────────────────────────── */
function ContactShadow({ state }: { state: OrbState }) {
  const ref = useRef<THREE.Mesh>(null!);

  useFrame((clock) => {
    if (!ref.current) return;
    const t = clock.clock.elapsedTime;
    const breathe = 1 + Math.sin(t * 0.8) * 0.06;
    const stateGlow: Record<OrbState, number> = {
      idle: 0.18,
      userTyping: 0.22,
      thinking: 0.32,
      streaming: 0.28,
      listening: 0.35,
      processing: 0.30,
    };
    ref.current.scale.set(breathe, breathe, 1);
    (ref.current.material as THREE.MeshBasicMaterial).opacity = stateGlow[state];
  });

  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.65, 0]}>
      <planeGeometry args={[4.5, 4.5]} />
      <meshBasicMaterial
        transparent
        opacity={0.18}
        color={new THREE.Color("hsl(320, 55%, 65%)")}
        blending={THREE.NormalBlending}
        depthWrite={false}
      />
    </mesh>
  );
}

/* ── Caustic light spill ─────────────────────────── */
function CausticSpill({ state }: { state: OrbState }) {
  const ref = useRef<THREE.Mesh>(null!);

  useFrame((clock) => {
    if (!ref.current) return;
    const t = clock.clock.elapsedTime;
    ref.current.rotation.z = t * 0.1;
    const intensity = state === "idle" ? 0.08 : state === "thinking" || state === "streaming" ? 0.16 : 0.12;
    (ref.current.material as THREE.MeshBasicMaterial).opacity = THREE.MathUtils.lerp(
      (ref.current.material as THREE.MeshBasicMaterial).opacity,
      intensity + Math.sin(t * 2) * 0.03,
      0.05
    );
  });

  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.64, 0]}>
      <ringGeometry args={[1.2, 2.8, 64]} />
      <meshBasicMaterial
        transparent
        opacity={0.08}
        color={new THREE.Color("hsl(195, 65%, 70%)")}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}

/* ── Reactive point lights ───────────────────────── */
function ReactiveLight({ state }: { state: OrbState }) {
  const light1 = useRef<THREE.PointLight>(null!);
  const light2 = useRef<THREE.PointLight>(null!);

  useFrame((clock) => {
    const t = clock.clock.elapsedTime;

    const intensities: Record<OrbState, number> = {
      idle: 0.4,
      userTyping: 0.5,
      thinking: 0.8,
      streaming: 0.7,
      listening: 0.9,
      processing: 0.75,
    };
    const target = intensities[state];

    if (light1.current) {
      light1.current.intensity = THREE.MathUtils.lerp(light1.current.intensity, target, 0.04);
      light1.current.position.x = Math.sin(t * 0.5) * 3;
      light1.current.position.y = 2 + Math.cos(t * 0.3) * 0.5;
    }
    if (light2.current) {
      light2.current.intensity = THREE.MathUtils.lerp(light2.current.intensity, target * 0.6, 0.04);
      light2.current.position.x = Math.cos(t * 0.4) * -3;
    }
  });

  return (
    <>
      <pointLight ref={light1} position={[3, 2, 4]} intensity={0.4} color="hsl(330, 65%, 65%)" distance={12} />
      <pointLight ref={light2} position={[-3, -1, 4]} intensity={0.25} color="hsl(195, 70%, 65%)" distance={12} />
    </>
  );
}

/* ── Scene ────────────────────────────────────────── */
function OrbScene({
  mouse,
  state,
}: {
  mouse: React.MutableRefObject<{ x: number; y: number }>;
  state: OrbState;
}) {
  return (
    <>
      <ambientLight intensity={0.35} />
      <directionalLight position={[4, 6, 5]} intensity={0.7} color="hsl(40, 30%, 95%)" />
      <directionalLight position={[-3, 2, -2]} intensity={0.2} color="hsl(210, 40%, 80%)" />
      <ReactiveLight state={state} />
      <Environment preset="studio" />

      <Float speed={1.2} rotationIntensity={0.15} floatIntensity={0.4} floatingRange={[-0.06, 0.06]}>
        <GlassOrb mouse={mouse} state={state} />
        <InnerEnergy state={state} />
      </Float>

      <ContactShadow state={state} />
      <CausticSpill state={state} />
    </>
  );
}

/* ── Static fallback ─────────────────────────────── */
function StaticFallback() {
  return (
    <div className="relative flex items-center justify-center">
      <div
        className="absolute rounded-full"
        style={{
          width: 240,
          height: 240,
          background: "var(--gradient-orb-glow)",
          filter: "blur(40px)",
        }}
      />
      <div
        className="h-48 w-48 rounded-full sm:h-56 sm:w-56 md:h-64 md:w-64"
        style={{
          background: "linear-gradient(135deg, hsl(330 65% 60%), hsl(280 50% 55%), hsl(195 70% 55%))",
          boxShadow: "0 20px 60px hsl(330 60% 50% / 0.3), inset 0 -10px 30px hsl(195 70% 55% / 0.2)",
          animation: "float 6s ease-in-out infinite",
        }}
      />
    </div>
  );
}

/* ── Main export ──────────────────────────────────── */
export function HeroOrb({ state = "idle" }: HeroOrbProps) {
  const mouse = useRef({ x: 0, y: 0 });
  const [webGLSupported, setWebGLSupported] = useState(true);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    mouse.current.x = (e.clientX - cx) / cx;
    mouse.current.y = (e.clientY - cy) / cy;
  }, []);

  useEffect(() => {
    try {
      const c = document.createElement("canvas");
      const gl = c.getContext("webgl2") || c.getContext("webgl");
      if (!gl) setWebGLSupported(false);
    } catch {
      setWebGLSupported(false);
    }
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [handleMouseMove]);

  if (!webGLSupported) {
    return (
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      >
        <StaticFallback />
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ scale: 0.85, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
      className="relative"
      style={{ width: "min(320px, 70vw)", height: "min(320px, 70vw)" }}
    >
      {/* Ambient glow */}
      <motion.div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          background: "var(--gradient-orb-glow)",
          filter: "blur(50px)",
          transform: "scale(1.4)",
        }}
        animate={{
          opacity: state === "thinking" || state === "streaming" ? [0.5, 0.85, 0.5] : [0.35, 0.6, 0.35],
          scale: state === "listening" ? [1.3, 1.6, 1.3] : [1.3, 1.5, 1.3],
        }}
        transition={{ duration: state === "thinking" ? 2 : 5, repeat: Infinity, ease: "easeInOut" }}
      />

      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, 4.8], fov: 42 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance", toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.1 }}
        style={{ pointerEvents: "none" }}
      >
        <Suspense fallback={null}>
          <OrbScene mouse={mouse} state={state} />
        </Suspense>
      </Canvas>

      {/* Soft reflection below */}
      <div
        className="absolute -bottom-6 left-1/2 -translate-x-1/2 pointer-events-none"
        style={{
          width: "55%",
          height: 32,
          background: "linear-gradient(180deg, hsl(320 55% 65% / 0.12), transparent)",
          filter: "blur(10px)",
          borderRadius: "50%",
        }}
      />
    </motion.div>
  );
}
