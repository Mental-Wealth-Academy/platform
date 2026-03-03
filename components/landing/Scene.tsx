'use client';

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useRef, useEffect, memo } from "react";
import * as THREE from "three";

import { cubeFragmentShader, cubeVertexShader } from './cubeShaders';
import './scene.css';

// Use device pixel ratio for crisp rendering on high-DPI displays
const getDPR = () => {
  if (typeof window === 'undefined') return 1;
  return Math.min(window.devicePixelRatio || 1, 2);
};

// Cube component with unique rotation
const RotatingCube = memo(({ position, rotationSpeed, scale, verticalSpeed, horizontalOnly }: { position: [number, number, number], rotationSpeed: [number, number, number], scale: number, verticalSpeed: number, horizontalOnly: boolean }) => {
  const mesh = useRef<THREE.Mesh>(null);
  const dprRef = useRef(getDPR());
  const textureRef = useRef<THREE.Texture | null>(null);
  const basePosition = useRef<[number, number, number]>(position);

  // Create solid white texture (no gradient) - texture overlay removed in shader
  useEffect(() => {
    if (!textureRef.current && typeof window !== 'undefined') {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Solid white texture (texture overlay is disabled in shader, so this won't affect colors)
        ctx.fillStyle = 'rgba(255, 255, 255, 1.0)';
        ctx.fillRect(0, 0, 256, 256);
        
        textureRef.current = new THREE.CanvasTexture(canvas);
        textureRef.current.needsUpdate = true;
        
        // Update uniform if material exists
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
    // Brand colors - 6 colors for 6 faces
    ucolor1: { value: new THREE.Vector3(0.318, 0.408, 1.0) }, // Primary: #5168FF (rgb(81, 104, 255))
    ucolor2: { value: new THREE.Vector3(1.0, 0.722, 0.0) }, // Warm amber: #FFB800 (rgb(255, 184, 0))
    ucolor3: { value: new THREE.Vector3(0.910, 0.251, 0.341) }, // Pinkish red: #E84057 (rgb(232, 64, 87))
    ucolor4: { value: new THREE.Vector3(1.0, 1.0, 1.0) }, // White: rgb(255, 255, 255)
    ucolor5: { value: new THREE.Vector3(0.118, 0.047, 0.224) }, // Dark purple: #1E0C39 (rgb(30, 12, 57))
    ucolor6: { value: new THREE.Vector3(1.0, 0.522, 0.106) }, // Orange: #FF851B (rgb(255, 133, 27))
    asciicode: { value: 100.0 }, // Higher value = tighter spacing between stars (doubled to halve spacing)
    utexture: { value: null as THREE.Texture | null },
    uAsciiImageTexture: { value: new THREE.Texture() },
    uBackgroundColor: { value: new THREE.Vector3(0.957, 0.961, 0.996) }, // Background: #f4f5fe
    brightness: { value: 1.3 },
    asciiu: { value: 1.0 }, // Not used in current implementation
    resolution: {
      value: new THREE.Vector2(
        typeof window !== 'undefined' ? window.innerWidth * dprRef.current : 1920,
        typeof window !== 'undefined' ? window.innerHeight * dprRef.current : 1080
      ),
    },
  }).current;

  // Update texture uniforms when textures are ready
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
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', updateResolution);
      }
    };
  }, [uniforms]);

  useFrame((state) => {
    const { clock } = state;
    if (mesh.current) {
      if (mesh.current.material) {
        const material = mesh.current.material as THREE.ShaderMaterial;
        if (material.uniforms) {
          material.uniforms.time.value = clock.getElapsedTime();
        }
      }
      // Animate vertical position
      const time = clock.getElapsedTime();
      const yOffset = Math.sin(time * verticalSpeed) * 1.5; // Vertical movement amplitude
      mesh.current.position.y = basePosition.current[1] + yOffset;
    }
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

const CubesScene = memo(() => {
  // Generate cubes with unique positions and rotation speeds
  const cubes = [];
  const count = 25;
  
  // Calculate viewport bounds for even distribution
  // Camera is at z=10, fov=75, so we can calculate visible area
  const cameraZ = 10;
  const fov = 75;
  const aspect = typeof window !== 'undefined' ? window.innerWidth / window.innerHeight : 16/9;
  const fovRad = (fov * Math.PI) / 180;
  const visibleHeight = 2 * Math.tan(fovRad / 2) * cameraZ;
  const visibleWidth = visibleHeight * aspect;
  
  // Use grid-based distribution with some randomness for more even spread
  const gridSize = Math.ceil(Math.sqrt(count));
  
  for (let i = 0; i < count; i++) {
    // Grid-based distribution with randomization
    const gridX = (i % gridSize) / (gridSize - 1);
    const gridY = Math.floor(i / gridSize) / (gridSize - 1);
    
    // Convert grid position to viewport coordinates with randomization
    const baseX = (gridX - 0.5) * visibleWidth * 0.8; // Use 80% of visible width
    const baseY = (gridY - 0.5) * visibleHeight * 0.8; // Use 80% of visible height
    
    // Add random offset to break grid pattern and reach edges
    const x = baseX + (Math.random() - 0.5) * visibleWidth * 0.3;
    const y = baseY + (Math.random() - 0.5) * visibleHeight * 0.3;
    // Depth spread
    const z = (Math.random() - 0.5) * 8;
    
    // Unique rotation speeds for each cube
    const rotX = (Math.random() - 0.5) * 0.5;
    const rotY = (Math.random() - 0.5) * 0.5;
    const rotZ = (Math.random() - 0.5) * 0.5;
    
    // Scale variation - larger cubes for more presence
    const scale = 1.8 + Math.random() * 2.2; // Range: 1.8 to 4.0
    
    // Vertical movement speed - some move up, some move down (positive = up, negative = down)
    const verticalSpeed = (Math.random() - 0.5) * 1.0; // Range: -0.5 to 0.5 (doubled from 0.25)
    
    // Some cubes rotate only horizontally (around Y axis) - about 40% of cubes
    const horizontalOnly = Math.random() < 0.4;
    
    cubes.push({
      position: [x, y, z] as [number, number, number],
      rotationSpeed: [rotX, rotY, rotZ] as [number, number, number],
      scale: scale,
      verticalSpeed: verticalSpeed,
      horizontalOnly: horizontalOnly,
    });
  }

  return (
    <>
      {cubes.map((cube, i) => (
        <RotatingCube
          key={i}
          position={cube.position}
          rotationSpeed={cube.rotationSpeed}
          scale={cube.scale}
          verticalSpeed={cube.verticalSpeed}
          horizontalOnly={cube.horizontalOnly}
        />
      ))}
    </>
  );
});

CubesScene.displayName = 'CubesScene';

const SceneBackground = memo(() => {
  const { scene } = useThree();
  useEffect(() => {
    scene.background = new THREE.Color('#f4f5fe');
  }, [scene]);
  return null;
});

SceneBackground.displayName = 'SceneBackground';

const Scene = memo(() => {
  const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1;
  
  return (
    <Canvas
      camera={{ position: [0, 0, 10], fov: 75 }}
      dpr={[dpr, dpr]}
      style={{ width: '100%', height: '100%', background: '#f4f5fe' }}
      gl={{
        antialias: true,
        powerPreference: 'high-performance',
        alpha: false,
        stencil: false,
        depth: true
      }}
      frameloop="always"
      performance={{ min: 0.5 }}
    >
      <SceneBackground />
      <Suspense fallback={null}>
        <CubesScene />
      </Suspense>
    </Canvas>
  );
});

Scene.displayName = 'Scene';

export default Scene;

