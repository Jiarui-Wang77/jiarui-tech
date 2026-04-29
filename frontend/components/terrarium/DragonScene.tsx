"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

/* ─────────────────────────────────────────────────────────────
   Dragon Spine — sinuous TorusKnot with custom GLSL shader
   Performance budget: 200 tube segs × 48 radial, dpr ≤ 1.5
───────────────────────────────────────────────────────────── */
function DragonCore() {
  const meshRef = useRef<THREE.Mesh>(null!);
  const mat     = useRef<THREE.ShaderMaterial>(null!);

  const shader = useMemo(() => ({
    uniforms: {
      uTime:   { value: 0 },
      uMouse:  { value: new THREE.Vector2(0, 0) },
      uColorA: { value: new THREE.Color("#7c3aed") },
      uColorB: { value: new THREE.Color("#38bdf8") },
      uColorC: { value: new THREE.Color("#e0f2fe") },
    },
    vertexShader: /* glsl */ `
      uniform float uTime;
      uniform vec2  uMouse;
      varying vec3  vPosition;
      varying vec3  vNormal;
      varying float vDisplace;

      float hash(vec3 p) {
        p = fract(p * vec3(443.8975, 397.2973, 491.1871));
        p += dot(p, p.yzx + 19.19);
        return fract((p.x + p.y) * p.z);
      }
      float noise(vec3 p) {
        vec3 i = floor(p); vec3 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x), mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
          mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x), mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),
          f.z);
      }

      void main() {
        vPosition = position;
        vNormal   = normal;
        vec3 pos  = position;
        float n   = noise(pos * 0.8 + uTime * 0.16);
        float mi  = dot(normalize(pos.xy), uMouse) * 0.10;
        float d   = n * 0.32 + mi;
        vDisplace  = d;
        pos += normal * d;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3  uColorA;
      uniform vec3  uColorB;
      uniform vec3  uColorC;
      varying vec3  vPosition;
      varying vec3  vNormal;
      varying float vDisplace;

      void main() {
        float t1 = sin(vPosition.x * 1.8 + uTime * 0.55) * 0.5 + 0.5;
        float t2 = sin(vPosition.y * 2.0 - uTime * 0.38) * 0.5 + 0.5;

        vec3 col = mix(uColorA, uColorB, t1);
        col = mix(col, uColorC, t2 * 0.3);

        // Fresnel rim — boosted to compensate for no Bloom
        float fr = pow(1.0 - abs(dot(normalize(vNormal), vec3(0,0,1))), 2.4);
        col += uColorC * fr * 1.4;

        // Gentle pulse
        col *= (sin(uTime * 1.2) * 0.06 + 0.94);

        // Scale highlight
        col += uColorB * max(vDisplace - 0.15, 0.0) * 1.8;

        // Overall brightness boost (replaces Bloom)
        col *= 1.35;

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  }), []);

  useFrame(({ clock, mouse: m }) => {
    const t = clock.getElapsedTime();
    mat.current.uniforms.uTime.value = t;
    mat.current.uniforms.uMouse.value.set(m.x, m.y);
    meshRef.current.rotation.y = t * 0.09 + m.x * 0.22;
    meshRef.current.rotation.x = Math.sin(t * 0.13) * 0.16 + m.y * 0.10;
    meshRef.current.rotation.z = Math.cos(t * 0.10) * 0.07;
    meshRef.current.scale.setScalar(1 + Math.sin(t * 1.0) * 0.022);
  });

  return (
    <mesh ref={meshRef}>
      {/* ↓ 320→200 tube segments, 64→48 radial — big GPU saving */}
      <torusKnotGeometry args={[1.5, 0.44, 200, 48, 3, 5]} />
      <shaderMaterial ref={mat} args={[shader]} side={THREE.FrontSide} />
    </mesh>
  );
}

/* ─────────────────────────────────────────────────────────────
   Particle field — 900 pts (was 2200)
───────────────────────────────────────────────────────────── */
function DataDust() {
  const pointsRef = useRef<THREE.Points>(null!);
  const COUNT = 900;

  const positions = useMemo(() => {
    const pos = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      const r     = 3.5 + Math.random() * 5.5;
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(2 * Math.random() - 1);
      pos[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
    }
    return pos;
  }, []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    pointsRef.current.rotation.y = t * 0.020;
    pointsRef.current.rotation.x = Math.sin(t * 0.012) * 0.10;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#7c3aed"
        size={0.030}
        sizeAttenuation
        transparent
        opacity={0.60}
        depthWrite={false}
      />
    </points>
  );
}

/* ─────────────────────────────────────────────────────────────
   Orbit ring
───────────────────────────────────────────────────────────── */
function OrbitRing() {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    ref.current.rotation.x = t * 0.065;
    ref.current.rotation.z = t * 0.038;
  });
  return (
    <mesh ref={ref}>
      <torusGeometry args={[3.4, 0.011, 4, 160]} />
      <meshBasicMaterial color="#38bdf8" transparent opacity={0.22} />
    </mesh>
  );
}

/* ─────────────────────────────────────────────────────────────
   Canvas export
   · dpr capped at 1.5 (was 2) — halves GPU load on Retina
   · ChromaticAberration removed — was causing scroll flicker
   · Bloom intensity 1.8→1.1, threshold 0.18→0.28 (smoother)
   · performance.min=0.5 — R3F drops resolution under load
───────────────────────────────────────────────────────────── */
export default function DragonScene() {
  return (
    <Canvas
      camera={{ position: [0, 0, 7], fov: 52 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      style={{ background: "transparent" }}
      dpr={[1, 1.5]}
      performance={{ min: 0.5 }}
    >
      <ambientLight intensity={0.12} />
      <pointLight position={[4,  4,  4]}  intensity={1.2} color="#7c3aed" />
      <pointLight position={[-4,-3, -3]}  intensity={0.8} color="#38bdf8" />

      <DragonCore />
      <DataDust />
      <OrbitRing />
    </Canvas>
  );
}
