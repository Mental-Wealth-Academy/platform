'use client';

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useRef, useEffect, memo, useState } from "react";
import * as THREE from "three";

import './scene.css';

// ── Shared mouse state (NDC: -1 to 1) ──────────────────────
const mouseNDC = { x: 0, y: 0 };

// ── Realistic blue sky with drifting clouds ─────────────────
const SkyBackground = memo(({ reducedMotion = false }: { reducedMotion?: boolean }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const { scene } = useThree();

  const skyUniforms = useRef({
    time: { value: 0.0 },
    motionFactor: { value: reducedMotion ? 0.0 : 1.0 },
  }).current;

  const skyVertex = `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position, 1.0);
    }
  `;

  const skyFragment = `
    uniform float time;
    uniform float motionFactor;
    varying vec2 vUv;

    const float PI = 3.14159265359;

    // FBM noise for realistic clouds
    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }

    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      return mix(
        mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
        mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
        f.y
      );
    }

    float fbm(vec2 p) {
      float v = 0.0;
      float a = 0.5;
      vec2 shift = vec2(100.0);
      for (int i = 0; i < 5; i++) {
        v += a * noise(p);
        p = p * 2.0 + shift;
        a *= 0.5;
      }
      return v;
    }

    float cloudShape(vec2 uv, float seed) {
      float base = fbm(uv + seed);
      float detail = fbm(uv * 1.9 - seed * 0.37);
      return mix(base, detail, 0.35);
    }

    void getSkyPalette(
      float idx,
      out vec3 skyTop,
      out vec3 skyMid,
      out vec3 skyHorizon,
      out vec3 sunColor,
      out vec2 sunPos
    ) {
      if (idx < 0.5) {
        skyTop = vec3(0.18, 0.35, 0.75);
        skyMid = vec3(0.30, 0.52, 0.88);
        skyHorizon = vec3(0.55, 0.72, 0.94);
        sunColor = vec3(1.0, 0.95, 0.82);
        sunPos = vec2(0.65, 0.8);
      } else if (idx < 1.5) {
        skyTop = vec3(0.26, 0.23, 0.52);
        skyMid = vec3(0.45, 0.38, 0.70);
        skyHorizon = vec3(0.80, 0.69, 0.92);
        sunColor = vec3(1.0, 0.82, 0.68);
        sunPos = vec2(0.34, 0.72);
      } else {
        skyTop = vec3(0.09, 0.28, 0.46);
        skyMid = vec3(0.22, 0.54, 0.62);
        skyHorizon = vec3(0.71, 0.87, 0.88);
        sunColor = vec3(0.88, 0.98, 1.0);
        sunPos = vec2(0.76, 0.67);
      }
    }

    void main() {
      float motionTime = time * mix(0.18, 1.0, motionFactor);
      float phaseClock = motionTime * 0.075;
      float phaseIndex = floor(mod(phaseClock, 3.0));
      float nextPhase = mod(phaseIndex + 1.0, 3.0);
      float phaseProgress = fract(phaseClock);
      float transition = smoothstep(0.68, 0.95, phaseProgress);
      float transitionPulse = sin(transition * PI);
      float glitchPulse = transitionPulse * motionFactor;

      vec2 uv = vUv;
      float lineNoise = noise(vec2(vUv.y * 52.0, motionTime * 2.4));
      float scanDrift = sin(vUv.y * 120.0 + motionTime * 18.0) * 0.0035;
      uv.x += ((lineNoise - 0.5) * 0.085 + scanDrift) * glitchPulse;
      uv.y += sin(vUv.x * 26.0 + motionTime * 8.0) * 0.005 * glitchPulse;
      uv = clamp(uv, 0.0, 1.0);

      vec3 skyTopA;
      vec3 skyMidA;
      vec3 skyHorizonA;
      vec3 sunColorA;
      vec2 sunPosA;
      getSkyPalette(phaseIndex, skyTopA, skyMidA, skyHorizonA, sunColorA, sunPosA);

      vec3 skyTopB;
      vec3 skyMidB;
      vec3 skyHorizonB;
      vec3 sunColorB;
      vec2 sunPosB;
      getSkyPalette(nextPhase, skyTopB, skyMidB, skyHorizonB, sunColorB, sunPosB);

      vec3 skyTop = mix(skyTopA, skyTopB, transition);
      vec3 skyMid = mix(skyMidA, skyMidB, transition);
      vec3 skyHorizon = mix(skyHorizonA, skyHorizonB, transition);
      vec3 sunColor = mix(sunColorA, sunColorB, transition);
      vec2 sunPos = mix(sunPosA, sunPosB, transition);

      float t = uv.y;
      vec3 sky = mix(skyHorizon, skyMid, smoothstep(0.0, 0.4, t));
      sky = mix(sky, skyTop, smoothstep(0.4, 1.0, t));

      float glitchBand = smoothstep(0.62, 0.98, noise(vec2(floor(uv.y * 28.0), motionTime * 5.6)));
      sky += vec3(0.02, 0.04, 0.08) * glitchPulse * glitchBand;

      vec3 cloudHighlight = vec3(1.0, 0.995, 0.985);
      vec3 cloudBody = vec3(0.92, 0.95, 1.0);
      vec3 cloudShadow = vec3(0.56, 0.68, 0.88);

      // ── Far clouds — small, slow, faded, biased to the left + lower ──
      vec2 uvFar = uv * vec2(2.0, 1.5) + vec2(motionTime * 0.006, motionTime * 0.002);
      float farField = cloudShape(uvFar, 3.7);
      float farCloud = smoothstep(0.42, 0.72, farField) * 0.5;
      float farCore = smoothstep(0.54, 0.8, farField) * 0.28;
      // Fade: strongest bottom-left, fades toward top-right
      float farBias = smoothstep(0.8, 0.2, uv.x) * smoothstep(0.7, 0.15, uv.y);
      farCloud *= farBias;
      farCore *= farBias;
      // Haze tint — distant clouds pick up sky color
      vec3 farColor = mix(cloudBody, skyHorizon, 0.42);
      sky = mix(sky, farColor, farCloud * 0.62);
      sky = mix(sky, cloudHighlight, farCore * 0.22);

      // ── Mid clouds — moderate, medium speed ──
      vec2 uvMid = uv * vec2(3.0, 2.0) + vec2(motionTime * 0.012, motionTime * 0.004);
      float midField = cloudShape(uvMid, 7.1);
      float midCloud = smoothstep(0.4, 0.69, midField) * 0.66;
      float midCore = smoothstep(0.51, 0.79, midField) * 0.46;
      float midShadow = smoothstep(0.35, 0.64, midField) * (1.0 - smoothstep(0.54, 0.8, midField)) * 0.56;
      float midMask = smoothstep(0.05, 0.3, t) * smoothstep(1.0, 0.55, t);
      midCloud *= midMask;
      midCore *= midMask;
      midShadow *= midMask;
      sky = mix(sky, mix(cloudBody, cloudHighlight, 0.45), midCloud * 0.68);
      sky = mix(sky, cloudHighlight, midCore * 0.38);
      sky = mix(sky, cloudShadow, midShadow * 0.34);

      // ── Near clouds — larger, faster, more opaque, biased top-right ──
      vec2 uvNear = uv * vec2(1.4, 1.0) + vec2(motionTime * 0.025, -motionTime * 0.006);
      float nearField = cloudShape(uvNear, 11.2);
      float nearCloud = smoothstep(0.35, 0.62, nearField) * 0.92;
      float nearCore = smoothstep(0.47, 0.76, nearField) * 0.68;
      float nearShadow = smoothstep(0.3, 0.58, nearField) * (1.0 - smoothstep(0.5, 0.77, nearField)) * 0.76;
      // Fade: strongest top-right, fades toward bottom-left
      float nearBias = smoothstep(0.2, 0.85, uv.x) * smoothstep(0.3, 0.9, uv.y);
      nearCloud *= nearBias;
      nearCore *= nearBias;
      nearShadow *= nearBias;
      // Near clouds keep bright tops but get denser bodies and cooler undersides.
      sky = mix(sky, cloudBody, nearCloud * 0.78);
      sky = mix(sky, cloudHighlight, nearCore * 0.52);
      sky = mix(sky, cloudShadow, nearShadow * 0.42);

      // Clear center for hero text
      float centerClear = 1.0 - smoothstep(0.15, 0.4, length(uv - vec2(0.5, 0.5)));
      sky = mix(sky, mix(skyHorizon, skyMid, t), centerClear * 0.3);

      // Subtle sun glow — shifts with the current phase
      float sun = 1.0 - length((uv - sunPos) * vec2(1.5, 1.0));
      sun = pow(max(sun, 0.0), 5.0) * 0.16;
      sky += sunColor * sun;

      gl_FragColor = vec4(sky, 1.0);
    }
  `;

  useEffect(() => {
    scene.background = null;
  }, [scene]);

  useEffect(() => {
    skyUniforms.motionFactor.value = reducedMotion ? 0.0 : 1.0;
  }, [reducedMotion, skyUniforms]);

  useFrame(({ clock }) => {
    skyUniforms.time.value = clock.getElapsedTime();
  });

  return (
    <mesh ref={meshRef} renderOrder={-1} frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        vertexShader={skyVertex}
        fragmentShader={skyFragment}
        uniforms={skyUniforms}
        depthWrite={false}
        depthTest={false}
      />
    </mesh>
  );
});

SkyBackground.displayName = 'SkyBackground';

// ── Barrel-distorted iridescent wireframe overlay ───────────
const GasLeakWire = memo(({ reducedMotion = false }: { reducedMotion?: boolean }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  const wireUniforms = useRef({
    time: { value: 0.0 },
    mouse: { value: new THREE.Vector2(0.5, 0.5) },
    motionFactor: { value: reducedMotion ? 0.0 : 1.0 },
  }).current;

  const wireVertex = `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position, 1.0);
    }
  `;

  const wireFragment = `
    uniform float time;
    uniform vec2 mouse;
    uniform float motionFactor;
    varying vec2 vUv;

    // Barrel distortion
    vec2 barrel(vec2 uv, vec2 center, float k1, float k2) {
      vec2 d = uv - center;
      float r2 = dot(d, d);
      return center + d * (1.0 + k1 * r2 + k2 * r2 * r2);
    }

    // Smooth noise
    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float noise(vec2 p) {
      vec2 i = floor(p), f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y);
    }

    // Caustic pattern — gentle, asymmetric, no split-screen
    float caustic(vec2 uv, float t) {
      float c = 0.0;
      // Single slow layer — large gentle curves, drifting diagonally
      vec2 p1 = uv * 1.8 + vec2(t * 0.04, t * 0.025);
      c += pow(0.5 + 0.5 * sin(noise(p1) * 5.0 + t * 0.3), 2.0);
      // Smaller detail — different angle to break symmetry
      vec2 p2 = uv * 3.5 + vec2(-t * 0.06, t * 0.035);
      c += pow(0.5 + 0.5 * sin(noise(p2 + 7.3) * 6.0 - t * 0.2), 2.5) * 0.35;
      return c * 0.6;
    }

    void main() {
      float motionTime = time * mix(0.18, 1.0, motionFactor);
      vec2 center = mix(vec2(0.5), mouse, 0.25);
      float breathe = sin(motionTime * 0.35) * 0.1;
      float k1 = 1.4 + breathe;
      float k2 = 0.9 + breathe * 0.4;

      // Chromatic barrel splits
      vec2 uvR = barrel(vUv, center, k1 * 1.06, k2 * 1.08);
      vec2 uvG = barrel(vUv, center, k1, k2);
      vec2 uvB = barrel(vUv, center, k1 * 0.94, k2 * 0.92);

      // Caustics per channel — each sees slightly different distortion
      float cR = caustic(uvR, motionTime);
      float cG = caustic(uvG, motionTime + 0.3);
      float cB = caustic(uvB, motionTime + 0.6);

      // Iridescent color shift based on angle + distance
      vec2 p = vUv - 0.5;
      float angle = atan(p.y, p.x);
      float dist = length(p);

      float hueShift = angle * 0.3 + dist * 2.5 + motionTime * 0.08;
      vec3 iri = vec3(
        0.5 + 0.5 * sin(hueShift * 6.2832),
        0.5 + 0.5 * sin(hueShift * 6.2832 + 2.094),
        0.5 + 0.5 * sin(hueShift * 6.2832 + 4.189)
      );

      // Combine caustics with iridescence
      vec3 color;
      color.r = cR * iri.r;
      color.g = cG * iri.g;
      color.b = cB * iri.b;

      // Subtle vein highlights — very gentle
      float veins = max(cR, max(cG, cB));
      color += vec3(0.9, 0.88, 1.0) * pow(veins, 5.0) * 0.06;

      // Mouse glow — barely there, just a warmth
      float mouseDist = length(vUv - mouse);
      float mouseGlow = exp(-mouseDist * mouseDist * 12.0) * 0.04;
      color += iri * mouseGlow;

      // Wide vignette — caustics live mostly in the periphery, not center
      float vignette = smoothstep(0.0, 0.25, dist) * (1.0 - smoothstep(0.5, 0.95, dist));

      float alpha = max(color.r, max(color.g, color.b)) * mix(0.08, 0.13, motionFactor) * vignette;

      gl_FragColor = vec4(color, alpha);
    }
  `;

  useEffect(() => {
    wireUniforms.motionFactor.value = reducedMotion ? 0.0 : 1.0;
  }, [reducedMotion, wireUniforms]);

  useFrame(({ clock }) => {
    wireUniforms.time.value = clock.getElapsedTime();
    wireUniforms.mouse.value.set(
      mouseNDC.x * 0.5 + 0.5,
      mouseNDC.y * 0.5 + 0.5
    );
  });

  return (
    <mesh ref={meshRef} renderOrder={0} frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        vertexShader={wireVertex}
        fragmentShader={wireFragment}
        uniforms={wireUniforms}
        transparent={true}
        depthWrite={false}
        depthTest={false}
      />
    </mesh>
  );
});

GasLeakWire.displayName = 'GasLeakWire';

// ── Mouse tracker ───────────────────────────────────────────
const MouseTracker = memo(() => {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onMove = (e: MouseEvent) => {
      mouseNDC.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouseNDC.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);
  return null;
});

MouseTracker.displayName = 'MouseTracker';

// ── Main scene ──────────────────────────────────────────────
const Scene = memo(() => {
  const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1;
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = () => setPrefersReducedMotion(mediaQuery.matches);

    handleChange();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  return (
    <Canvas
      camera={{ position: [0, 0, 10], fov: 75 }}
      dpr={[dpr, dpr]}
      style={{ width: '100%', height: '100%', cursor: 'none' }}
      gl={{
        antialias: true,
        powerPreference: 'high-performance',
        alpha: true,
        stencil: false,
        depth: true,
      }}
      frameloop="always"
      performance={{ min: 0.5 }}
    >
      <MouseTracker />
      <SkyBackground reducedMotion={prefersReducedMotion} />
      <GasLeakWire reducedMotion={prefersReducedMotion} />
    </Canvas>
  );
});

Scene.displayName = 'Scene';

export default Scene;
