import { Suspense, useRef, useMemo, useCallback, useEffect, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Float } from "@react-three/drei";
import * as THREE from "three";
import { motion } from "framer-motion";

/* ── Types ───────────────────────────────────────── */
export type OrbState = "idle" | "userTyping" | "thinking" | "streaming" | "listening" | "processing";

interface HeroOrbProps {
  state?: OrbState;
}

/* ── Caustic pattern shader for floor ────────────── */
const causticVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const causticFragmentShader = `
  uniform float uTime;
  uniform float uIntensity;
  varying vec2 vUv;

  vec2 hash(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(dot(hash(i), f),
                   dot(hash(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0)), u.x),
               mix(dot(hash(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0)),
                   dot(hash(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0)), u.x), u.y);
  }

  float caustic(vec2 uv, float time) {
    float c = 0.0;
    float scale = 1.0;
    for (int i = 0; i < 4; i++) {
      vec2 p = uv * scale + time * 0.15;
      float n = noise(p);
      c += abs(n) / scale;
      scale *= 2.0;
    }
    return c;
  }

  void main() {
    vec2 centered = (vUv - 0.5) * 2.0;
    float dist = length(centered);

    // Fade out at edges
    float mask = smoothstep(1.0, 0.3, dist);

    float c1 = caustic(centered * 3.0, uTime);
    float c2 = caustic(centered * 3.0 + 5.0, uTime * 0.7 + 3.0);

    // Pink and cyan caustic channels
    vec3 pink = vec3(0.9, 0.35, 0.55) * c1;
    vec3 cyan = vec3(0.2, 0.85, 0.8) * c2;

    vec3 color = (pink + cyan) * mask * uIntensity;
    float alpha = (c1 + c2) * 0.35 * mask * uIntensity;

    gl_FragColor = vec4(color, alpha);
  }
`;

/* ── Inner energy shader ─────────────────────────── */
const innerVertexShader = `
  varying vec3 vPosition;
  varying vec3 vNormal;
  void main() {
    vPosition = position;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const innerFragmentShader = `
  uniform float uTime;
  uniform float uIntensity;
  uniform float uPulse;
  varying vec3 vPosition;
  varying vec3 vNormal;

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
    float speed = uTime * 0.25;
    float n1 = snoise(vPosition * 2.0 + vec3(speed, 0.0, 0.0)) * 0.5 + 0.5;
    float n2 = snoise(vPosition * 3.0 + vec3(0.0, speed * 0.6, speed * 0.4)) * 0.5 + 0.5;

    vec3 pink = vec3(0.92, 0.28, 0.52);
    vec3 cyan = vec3(0.15, 0.78, 0.78);

    vec3 color = mix(pink, cyan, n1 * 0.7 + vPosition.y * 0.3 + 0.3);

    float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 3.0);
    float pulse = 1.0 + sin(uTime * uPulse * 6.28) * 0.12 * uPulse;
    float alpha = (0.06 + n2 * 0.08 + fresnel * 0.2) * uIntensity * pulse;

    gl_FragColor = vec4(color * (1.0 + fresnel * 0.4), alpha);
  }
`;

/* ── Inner energy shell ──────────────────────────── */
function InnerEnergy({ state }: { state: OrbState }) {
  const matRef = useRef<THREE.ShaderMaterial>(null!);
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uIntensity: { value: 0.8 },
    uPulse: { value: 0.0 },
  }), []);

  useFrame((_, delta) => {
    if (!matRef.current) return;
    uniforms.uTime.value += delta;
    const targets: Record<OrbState, { i: number; p: number }> = {
      idle: { i: 0.8, p: 0.0 },
      userTyping: { i: 1.0, p: 0.15 },
      thinking: { i: 1.5, p: 0.5 },
      streaming: { i: 1.3, p: 0.3 },
      listening: { i: 1.2, p: 0.6 },
      processing: { i: 1.4, p: 0.7 },
    };
    const t = targets[state];
    uniforms.uIntensity.value = THREE.MathUtils.lerp(uniforms.uIntensity.value, t.i, 0.03);
    uniforms.uPulse.value = THREE.MathUtils.lerp(uniforms.uPulse.value, t.p, 0.04);
  });

  return (
    <mesh scale={1.52}>
      <sphereGeometry args={[1, 64, 64]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={innerVertexShader}
        fragmentShader={innerFragmentShader}
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
function GlassOrb({ mouse, state }: { mouse: React.MutableRefObject<{ x: number; y: number }>; state: OrbState }) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const velX = useRef(0);
  const velY = useRef(0);
  const scaleRef = useRef(1.55);

  // Vivid pink-to-cyan gradient matching reference
  const gradientMap = useMemo(() => {
    const size = 512;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;

    // Diagonal gradient matching the reference: magenta-pink top-left → teal-cyan bottom-right
    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, "#d4267e");    // deep magenta-pink
    gradient.addColorStop(0.25, "#e84a8a"); // hot pink
    gradient.addColorStop(0.45, "#c06aaa"); // pink-purple transition
    gradient.addColorStop(0.55, "#6dc5c5"); // teal transition
    gradient.addColorStop(0.75, "#28c5b8"); // bright cyan-teal
    gradient.addColorStop(1, "#1aafa5");    // deep teal
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    // Very subtle noise for micro imperfections
    const imageData = ctx.getImageData(0, 0, size, size);
    for (let i = 0; i < imageData.data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 4;
      imageData.data[i] = Math.min(255, Math.max(0, imageData.data[i] + noise));
      imageData.data[i + 1] = Math.min(255, Math.max(0, imageData.data[i + 1] + noise));
      imageData.data[i + 2] = Math.min(255, Math.max(0, imageData.data[i + 2] + noise));
    }
    ctx.putImageData(imageData, 0, 0);

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }, []);

  useFrame((clock, delta) => {
    if (!meshRef.current) return;
    const t = clock.clock.elapsedTime;

    // Inertial spring mouse tracking
    const targetX = mouse.current.y * 0.2;
    const targetY = mouse.current.x * 0.25;
    const spring = 0.035;
    const damp = 0.9;

    velX.current = (velX.current + (targetX - meshRef.current.rotation.x) * spring) * damp;
    velY.current = (velY.current + (targetY - meshRef.current.rotation.y) * spring) * damp;

    meshRef.current.rotation.x += velX.current;
    meshRef.current.rotation.y += velY.current;
    meshRef.current.rotation.y += delta * 0.06; // slow idle spin

    // State breathing
    const scales: Record<OrbState, number> = {
      idle: 1.55, userTyping: 1.57, thinking: 1.6,
      streaming: 1.58, listening: 1.62, processing: 1.59,
    };
    const ts = scales[state] + Math.sin(t * 1.0) * 0.012;
    scaleRef.current = THREE.MathUtils.lerp(scaleRef.current, ts, 0.025);
    meshRef.current.scale.setScalar(scaleRef.current);
  });

  return (
    <mesh ref={meshRef} scale={1.55}>
      <sphereGeometry args={[1, 128, 128]} />
      <meshPhysicalMaterial
        map={gradientMap}
        transmission={0.92}
        roughness={0.02}
        metalness={0.0}
        thickness={4.0}
        ior={2.2}
        envMapIntensity={2.0}
        clearcoat={1}
        clearcoatRoughness={0.01}
        transparent
        opacity={0.92}
        side={THREE.DoubleSide}
        attenuationColor={new THREE.Color("#b04080")}
        attenuationDistance={2.0}
        specularIntensity={1.5}
        specularColor={new THREE.Color("#ffffff")}
        reflectivity={1.0}
      />
    </mesh>
  );
}

/* ── Caustic floor pattern ───────────────────────── */
function CausticFloor({ state }: { state: OrbState }) {
  const matRef = useRef<THREE.ShaderMaterial>(null!);
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uIntensity: { value: 0.6 },
  }), []);

  useFrame((_, delta) => {
    if (!matRef.current) return;
    uniforms.uTime.value += delta;
    const intensities: Record<OrbState, number> = {
      idle: 0.6, userTyping: 0.7, thinking: 0.9,
      streaming: 0.8, listening: 1.0, processing: 0.85,
    };
    uniforms.uIntensity.value = THREE.MathUtils.lerp(
      uniforms.uIntensity.value, intensities[state], 0.03
    );
  });

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.58, 0]}>
      <planeGeometry args={[6, 6]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={causticVertexShader}
        fragmentShader={causticFragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

/* ── Contact shadow ──────────────────────────────── */
function ContactShadow() {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame((clock) => {
    if (!ref.current) return;
    const s = 1 + Math.sin(clock.clock.elapsedTime * 0.7) * 0.04;
    ref.current.scale.set(s, s, 1);
  });

  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.59, 0.05]}>
      <circleGeometry args={[1.2, 64]} />
      <meshBasicMaterial
        transparent
        opacity={0.12}
        color={new THREE.Color("#2a2a3a")}
        depthWrite={false}
      />
    </mesh>
  );
}

/* ── Reactive lights ─────────────────────────────── */
function ReactiveLight({ state }: { state: OrbState }) {
  const l1 = useRef<THREE.PointLight>(null!);
  const l2 = useRef<THREE.PointLight>(null!);

  useFrame((clock) => {
    const t = clock.clock.elapsedTime;
    const mult: Record<OrbState, number> = {
      idle: 1, userTyping: 1.1, thinking: 1.6,
      streaming: 1.4, listening: 1.7, processing: 1.5,
    };
    const m = mult[state];
    if (l1.current) {
      l1.current.intensity = THREE.MathUtils.lerp(l1.current.intensity, 0.6 * m, 0.04);
      l1.current.position.x = Math.sin(t * 0.4) * 3.5;
      l1.current.position.y = 2.5 + Math.cos(t * 0.25) * 0.4;
    }
    if (l2.current) {
      l2.current.intensity = THREE.MathUtils.lerp(l2.current.intensity, 0.4 * m, 0.04);
      l2.current.position.x = Math.cos(t * 0.35) * -3.5;
    }
  });

  return (
    <>
      <pointLight ref={l1} position={[3.5, 2.5, 4]} color="#e84a8a" distance={14} />
      <pointLight ref={l2} position={[-3.5, -1, 4]} color="#28c5b8" distance={14} />
    </>
  );
}

/* ── Scene ────────────────────────────────────────── */
function OrbScene({ mouse, state }: { mouse: React.MutableRefObject<{ x: number; y: number }>; state: OrbState }) {
  return (
    <>
      <ambientLight intensity={0.5} color="#f0e8f0" />
      <directionalLight position={[5, 8, 6]} intensity={1.0} color="#ffffff" />
      <directionalLight position={[-4, 3, -3]} intensity={0.3} color="#d0e0f0" />
      <spotLight position={[0, 6, 3]} angle={0.5} penumbra={0.8} intensity={0.5} color="#ffffff" />
      <ReactiveLight state={state} />
      <Environment preset="studio" />

      <Float speed={1.0} rotationIntensity={0.1} floatIntensity={0.3} floatingRange={[-0.04, 0.04]}>
        <GlassOrb mouse={mouse} state={state} />
        <InnerEnergy state={state} />
      </Float>

      <ContactShadow />
      <CausticFloor state={state} />
    </>
  );
}

/* ── Static fallback ─────────────────────────────── */
function StaticFallback() {
  return (
    <div className="relative flex items-center justify-center">
      <div className="absolute rounded-full" style={{ width: 240, height: 240, background: "var(--gradient-orb-glow)", filter: "blur(40px)" }} />
      <div
        className="h-48 w-48 rounded-full sm:h-56 sm:w-56 md:h-64 md:w-64"
        style={{
          background: "linear-gradient(135deg, #d4267e, #c06aaa, #28c5b8)",
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
      if (!(c.getContext("webgl2") || c.getContext("webgl"))) setWebGLSupported(false);
    } catch { setWebGLSupported(false); }
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [handleMouseMove]);

  if (!webGLSupported) {
    return <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}><StaticFallback /></motion.div>;
  }

  return (
    <motion.div
      initial={{ scale: 0.85, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
      className="relative"
      style={{ width: "min(340px, 72vw)", height: "min(340px, 72vw)" }}
    >
      {/* Ambient glow */}
      <motion.div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, hsl(330 60% 70% / 0.25) 0%, hsl(195 60% 60% / 0.15) 50%, transparent 75%)", filter: "blur(45px)", transform: "scale(1.5)" }}
        animate={{
          opacity: state === "thinking" || state === "streaming" ? [0.5, 0.85, 0.5] : [0.3, 0.55, 0.3],
          scale: state === "listening" ? [1.4, 1.7, 1.4] : [1.4, 1.6, 1.4],
        }}
        transition={{ duration: state === "thinking" ? 2 : 5, repeat: Infinity, ease: "easeInOut" }}
      />

      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 0.3, 4.5], fov: 40 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance", toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.2 }}
        style={{ pointerEvents: "none" }}
      >
        <Suspense fallback={null}>
          <OrbScene mouse={mouse} state={state} />
        </Suspense>
      </Canvas>
    </motion.div>
  );
}
