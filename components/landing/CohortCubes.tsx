'use client';

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useRef, useEffect, memo } from "react";
import * as THREE from "three";
import { cubeFragmentShader, cubeVertexShader } from './cubeShaders';

const getDPR = () => {
  if (typeof window === 'undefined') return 1;
  return Math.min(window.devicePixelRatio || 1, 2);
};

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
    uBackgroundColor: { value: new THREE.Vector3(0.957, 0.961, 0.996) },
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
        uniforms.resolution.value.set(window.innerWidth * dprRef.current, window.innerHeight * dprRef.current);
      }
    };
    updateResolution();
    window.addEventListener('resize', updateResolution);
    return () => window.removeEventListener('resize', updateResolution);
  }, [uniforms]);

  useFrame((state) => {
    if (!mesh.current) return;
    const material = mesh.current.material as THREE.ShaderMaterial;
    if (material.uniforms) material.uniforms.time.value = state.clock.getElapsedTime();
    const yOffset = Math.sin(state.clock.getElapsedTime() * verticalSpeed) * 1.5;
    mesh.current.position.y = basePosition.current[1] + yOffset;
  });

  return (
    <mesh ref={mesh} position={position} scale={scale}>
      <boxGeometry args={[1.0, 1.0, 1.0]} />
      <shaderMaterial fragmentShader={cubeFragmentShader} vertexShader={cubeVertexShader} uniforms={uniforms} />
    </mesh>
  );
});

RotatingCube.displayName = 'RotatingCube';

const CubesScene = memo(() => {
  const cubes = [];
  const count = 10;
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
    const x = (gridX - 0.5) * visibleWidth * 0.85 + (Math.random() - 0.5) * visibleWidth * 0.2;
    const y = (gridY - 0.5) * visibleHeight * 0.7 + (Math.random() - 0.5) * visibleHeight * 0.2;

    cubes.push({
      position: [x, y, (Math.random() - 0.5) * 6] as [number, number, number],
      rotationSpeed: [(Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.4] as [number, number, number],
      scale: 1.5 + Math.random() * 2.0,
      verticalSpeed: (Math.random() - 0.5) * 0.8,
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

const BgColor = memo(() => {
  const { scene } = useThree();
  useEffect(() => { scene.background = new THREE.Color('#f4f5fe'); }, [scene]);
  return null;
});

BgColor.displayName = 'BgColor';

const CohortCubes = memo(() => {
  const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1;

  return (
    <Canvas
      camera={{ position: [0, 0, 10], fov: 75 }}
      dpr={[dpr, dpr]}
      style={{ width: '100%', height: '100%' }}
      gl={{ antialias: true, powerPreference: 'high-performance', alpha: false, stencil: false, depth: true }}
      frameloop="always"
      performance={{ min: 0.5 }}
    >
      <BgColor />
      <Suspense fallback={null}>
        <CubesScene />
      </Suspense>
    </Canvas>
  );
});

CohortCubes.displayName = 'CohortCubes';

export default CohortCubes;
