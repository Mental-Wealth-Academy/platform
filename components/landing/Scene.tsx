'use client';

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useRef, useEffect, memo, useState } from "react";
import * as THREE from "three";

import { cubeFragmentShader, cubeVertexShader } from './cubeShaders';
import './scene.css';

const getDPR = () => {
  if (typeof window === 'undefined') return 1;
  return Math.min(window.devicePixelRatio || 1, 2);
};

// ── Shared mouse state (NDC: -1 to 1) ──────────────────────
const mouseNDC = { x: 0, y: 0 };

// ── Cube with cursor interaction ────────────────────────────
const RotatingCube = memo(({ position, rotationSpeed, scale, verticalSpeed, horizontalOnly }: {
  position: [number, number, number];
  rotationSpeed: [number, number, number];
  scale: number;
  verticalSpeed: number;
  horizontalOnly: boolean;
}) => {
  const mesh = useRef<THREE.Mesh>(null);
  const dprRef = useRef(getDPR());
  const textureRef = useRef<THREE.Texture | null>(null);
  const basePosition = useRef<[number, number, number]>(position);

  useEffect(() => {
    if (!textureRef.current && typeof window !== 'undefined') {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'rgba(255, 255, 255, 1.0)';
        ctx.fillRect(0, 0, 256, 256);
        textureRef.current = new THREE.CanvasTexture(canvas);
        textureRef.current.needsUpdate = true;
        if (mesh.current?.material) {
          const material = mesh.current.material as THREE.ShaderMaterial;
          if (material.uniforms?.utexture) {
            material.uniforms.utexture.value = textureRef.current;
          }
        }
      }
    }
  }, []);

  const uniforms = useRef({
    time: { value: 0.0 },
    rotationSpeed: { value: new THREE.Vector3(...rotationSpeed) },
    horizontalOnly: { value: horizontalOnly ? 1.0 : 0.0 },
    ucolor1: { value: new THREE.Vector3(0.318, 0.408, 1.0) },
    ucolor2: { value: new THREE.Vector3(1.0, 0.522, 0.106) },
    ucolor3: { value: new THREE.Vector3(0.910, 0.251, 0.341) },
    ucolor4: { value: new THREE.Vector3(1.0, 1.0, 1.0) },
    ucolor5: { value: new THREE.Vector3(0.4, 0.4, 0.43) },
    ucolor6: { value: new THREE.Vector3(0.298, 0.686, 0.314) },
    asciicode: { value: 100.0 },
    utexture: { value: null as THREE.Texture | null },
    uAsciiImageTexture: { value: new THREE.Texture() },
    uBackgroundColor: { value: new THREE.Vector3(0.53, 0.73, 0.98) },
    brightness: { value: 1.3 },
    asciiu: { value: 1.0 },
    resolution: {
      value: new THREE.Vector2(
        typeof window !== 'undefined' ? window.innerWidth * dprRef.current : 1920,
        typeof window !== 'undefined' ? window.innerHeight * dprRef.current : 1080
      ),
    },
  }).current;

  useEffect(() => {
    if (textureRef.current && uniforms.utexture) {
      uniforms.utexture.value = textureRef.current;
    }
  }, [uniforms]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const updateResolution = () => {
      dprRef.current = getDPR();
      if (uniforms.resolution.value && window.innerWidth > 0 && window.innerHeight > 0) {
        uniforms.resolution.value.set(
          window.innerWidth * dprRef.current,
          window.innerHeight * dprRef.current
        );
      }
    };
    updateResolution();
    window.addEventListener('resize', updateResolution);
    return () => window.removeEventListener('resize', updateResolution);
  }, [uniforms]);

  useFrame((state) => {
    const { clock, camera } = state;
    if (!mesh.current) return;

    const material = mesh.current.material as THREE.ShaderMaterial;
    if (material.uniforms) {
      material.uniforms.time.value = clock.getElapsedTime();
    }

    const time = clock.getElapsedTime();
    const yOffset = Math.sin(time * verticalSpeed) * 1.5;
    mesh.current.position.y = basePosition.current[1] + yOffset;

    // Cursor repulsion — cubes drift away from mouse in world space
    const mouseWorld = new THREE.Vector3(mouseNDC.x, mouseNDC.y, 0.5).unproject(camera);
    const dir = mouseWorld.sub(camera.position).normalize();
    const dist = -camera.position.z / dir.z;
    const mousePos = camera.position.clone().add(dir.multiplyScalar(dist));

    const dx = mesh.current.position.x - mousePos.x;
    const dy = mesh.current.position.y - mousePos.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    const influence = 6;

    if (d < influence && d > 0.01) {
      const force = ((influence - d) / influence) * 0.8;
      mesh.current.position.x += (dx / d) * force * 0.15;
      mesh.current.position.y += (dy / d) * force * 0.15;
    }

    // Gently drift back to base position
    mesh.current.position.x += (basePosition.current[0] - mesh.current.position.x) * 0.02;
  });

  return (
    <mesh ref={mesh} position={position} scale={scale}>
      <boxGeometry args={[1.0, 1.0, 1.0]} />
      <shaderMaterial
        fragmentShader={cubeFragmentShader}
        vertexShader={cubeVertexShader}
        uniforms={uniforms}
      />
    </mesh>
  );
});

RotatingCube.displayName = 'RotatingCube';

// ── Cube distribution ───────────────────────────────────────
const CubesScene = memo(() => {
  const cubes = [];
  const count = 12;
  const cameraZ = 10;
  const fov = 75;
  const aspect = typeof window !== 'undefined' ? window.innerWidth / window.innerHeight : 16 / 9;
  const fovRad = (fov * Math.PI) / 180;
  const visibleHeight = 2 * Math.tan(fovRad / 2) * cameraZ;
  const visibleWidth = visibleHeight * aspect;
  const gridSize = Math.ceil(Math.sqrt(count));

  for (let i = 0; i < count; i++) {
    const gridX = (i % gridSize) / (gridSize - 1);
    const gridY = Math.floor(i / gridSize) / (gridSize - 1);
    const baseX = (gridX - 0.5) * visibleWidth * 0.8;
    const baseY = (gridY - 0.5) * visibleHeight * 0.8;
    let x = baseX + (Math.random() - 0.5) * visibleWidth * 0.3;
    let y = baseY + (Math.random() - 0.5) * visibleHeight * 0.3;

    const deadZoneX = visibleWidth * 0.42;
    const deadZoneY = visibleHeight * 0.30;
    if (Math.abs(x) < deadZoneX && Math.abs(y) < deadZoneY) {
      if (Math.abs(x) / deadZoneX < Math.abs(y) / deadZoneY) {
        y = y >= 0 ? deadZoneY + Math.random() * 2 : -deadZoneY - Math.random() * 2;
      } else {
        x = x >= 0 ? deadZoneX + Math.random() * 2 : -deadZoneX - Math.random() * 2;
      }
    }

    cubes.push({
      position: [x, y, (Math.random() - 0.5) * 8] as [number, number, number],
      rotationSpeed: [(Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.5] as [number, number, number],
      scale: 1.8 + Math.random() * 2.2,
      verticalSpeed: (Math.random() - 0.5) * 1.0,
      horizontalOnly: Math.random() < 0.4,
    });
  }

  return (
    <>
      {cubes.map((cube, i) => (
        <RotatingCube key={i} {...cube} />
      ))}
    </>
  );
});

CubesScene.displayName = 'CubesScene';

// ── Realistic blue sky with drifting clouds ─────────────────
const SkyBackground = memo(() => {
  const meshRef = useRef<THREE.Mesh>(null);
  const { scene } = useThree();

  const skyUniforms = useRef({
    time: { value: 0.0 },
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
    varying vec2 vUv;

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

    void main() {
      // Sky gradient — deep blue top to lighter horizon
      vec3 skyTop = vec3(0.18, 0.35, 0.75);     // deep blue
      vec3 skyMid = vec3(0.30, 0.52, 0.88);     // rich blue
      vec3 skyHorizon = vec3(0.55, 0.72, 0.94); // lighter blue horizon

      float t = vUv.y;
      vec3 sky = mix(skyHorizon, skyMid, smoothstep(0.0, 0.4, t));
      sky = mix(sky, skyTop, smoothstep(0.4, 1.0, t));

      vec3 cloudHighlight = vec3(1.0, 0.995, 0.985);
      vec3 cloudBody = vec3(0.92, 0.95, 1.0);
      vec3 cloudShadow = vec3(0.56, 0.68, 0.88);

      // ── Far clouds — small, slow, faded, biased to the left + lower ──
      vec2 uvFar = vUv * vec2(2.0, 1.5) + vec2(time * 0.006, time * 0.002);
      float farField = cloudShape(uvFar, 3.7);
      float farCloud = smoothstep(0.42, 0.72, farField) * 0.5;
      float farCore = smoothstep(0.54, 0.8, farField) * 0.28;
      // Fade: strongest bottom-left, fades toward top-right
      float farBias = smoothstep(0.8, 0.2, vUv.x) * smoothstep(0.7, 0.15, vUv.y);
      farCloud *= farBias;
      farCore *= farBias;
      // Haze tint — distant clouds pick up sky color
      vec3 farColor = mix(cloudBody, skyHorizon, 0.42);
      sky = mix(sky, farColor, farCloud * 0.62);
      sky = mix(sky, cloudHighlight, farCore * 0.22);

      // ── Mid clouds — moderate, medium speed ──
      vec2 uvMid = vUv * vec2(3.0, 2.0) + vec2(time * 0.012, time * 0.004);
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
      vec2 uvNear = vUv * vec2(1.4, 1.0) + vec2(time * 0.025, -time * 0.006);
      float nearField = cloudShape(uvNear, 11.2);
      float nearCloud = smoothstep(0.35, 0.62, nearField) * 0.92;
      float nearCore = smoothstep(0.47, 0.76, nearField) * 0.68;
      float nearShadow = smoothstep(0.3, 0.58, nearField) * (1.0 - smoothstep(0.5, 0.77, nearField)) * 0.76;
      // Fade: strongest top-right, fades toward bottom-left
      float nearBias = smoothstep(0.2, 0.85, vUv.x) * smoothstep(0.3, 0.9, vUv.y);
      nearCloud *= nearBias;
      nearCore *= nearBias;
      nearShadow *= nearBias;
      // Near clouds keep bright tops but get denser bodies and cooler undersides.
      sky = mix(sky, cloudBody, nearCloud * 0.78);
      sky = mix(sky, cloudHighlight, nearCore * 0.52);
      sky = mix(sky, cloudShadow, nearShadow * 0.42);

      // Clear center for hero text
      float centerClear = 1.0 - smoothstep(0.15, 0.4, length(vUv - vec2(0.5, 0.5)));
      sky = mix(sky, mix(skyHorizon, skyMid, t), centerClear * 0.3);

      // Subtle sun glow — upper area
      float sun = 1.0 - length((vUv - vec2(0.65, 0.8)) * vec2(1.5, 1.0));
      sun = pow(max(sun, 0.0), 5.0) * 0.15;
      sky += vec3(sun * 1.0, sun * 0.95, sun * 0.8);

      gl_FragColor = vec4(sky, 1.0);
    }
  `;

  useEffect(() => {
    scene.background = null;
  }, [scene]);

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
const GasLeakWire = memo(() => {
  const meshRef = useRef<THREE.Mesh>(null);

  const wireUniforms = useRef({
    time: { value: 0.0 },
    mouse: { value: new THREE.Vector2(0.5, 0.5) },
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
      vec2 center = mix(vec2(0.5), mouse, 0.25);
      float breathe = sin(time * 0.35) * 0.1;
      float k1 = 1.4 + breathe;
      float k2 = 0.9 + breathe * 0.4;

      // Chromatic barrel splits
      vec2 uvR = barrel(vUv, center, k1 * 1.06, k2 * 1.08);
      vec2 uvG = barrel(vUv, center, k1, k2);
      vec2 uvB = barrel(vUv, center, k1 * 0.94, k2 * 0.92);

      // Caustics per channel — each sees slightly different distortion
      float cR = caustic(uvR, time);
      float cG = caustic(uvG, time + 0.3);
      float cB = caustic(uvB, time + 0.6);

      // Iridescent color shift based on angle + distance
      vec2 p = vUv - 0.5;
      float angle = atan(p.y, p.x);
      float dist = length(p);

      float hueShift = angle * 0.3 + dist * 2.5 + time * 0.08;
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

      float alpha = max(color.r, max(color.g, color.b)) * 0.13 * vignette;

      gl_FragColor = vec4(color, alpha);
    }
  `;

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
      <SkyBackground />
      <GasLeakWire />
    </Canvas>
  );
});

Scene.displayName = 'Scene';

export default Scene;
