'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import styles from './TexturedBackground.module.css';

export default function TexturedBackground() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // ── Scene Setup ──
    const scene = new THREE.Scene();

    // ── Camera (Orthographic for 2D screen shader display) ──
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    camera.position.z = 1;

    // ── Renderer ──
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // ── Texture Loader ──
    const loader = new THREE.TextureLoader();
    
    // Load starry ivy texture
    const texture = loader.load('/images/preorder-bg.jpg', (tex) => {
      tex.minFilter = THREE.LinearFilter;
      tex.generateMipmaps = false;
      // Trigger a resize update to set correct aspect ratios once texture loaded
      handleResize();
    });

    // ── Custom Shader Material ──
    // Subtle fluid wave displacement + soft shimmer light overlay
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTexture: { value: texture },
        uTime: { value: 0 },
        uResolution: { value: new THREE.Vector2(width, height) },
        uTextureResolution: { value: new THREE.Vector2(1024, 576) } // Original texture aspect ratio
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D uTexture;
        uniform float uTime;
        uniform vec2 uResolution;
        uniform vec2 uTextureResolution;
        varying vec2 vUv;

        void main() {
          // Calculate object-fit: cover coordinates in shader
          vec2 screenAspect = uResolution;
          vec2 texAspect = uTextureResolution;
          
          float sAspect = screenAspect.x / screenAspect.y;
          float tAspect = texAspect.x / texAspect.y;
          
          vec2 uv = vUv;
          if (sAspect > tAspect) {
            float scale = sAspect / tAspect;
            uv.y = (uv.y - 0.5) / scale + 0.5;
          } else {
            float scale = tAspect / sAspect;
            uv.x = (uv.x - 0.5) / scale + 0.5;
          }

          // Subtle ripple wave distortion
          float waveX = sin(uv.y * 5.0 + uTime * 0.35) * 0.007;
          float waveY = cos(uv.x * 5.0 + uTime * 0.35) * 0.007;
          
          vec2 distortedUv = uv + vec2(waveX, waveY);
          
          // Clamp UVs to avoid edge bleed artifacts
          distortedUv = clamp(distortedUv, 0.0, 1.0);
          
          vec4 texColor = texture2D(uTexture, distortedUv);
          
          // Add a very subtle moving light shimmer
          float shimmer = sin(vUv.x * 2.5 - vUv.y * 2.0 + uTime * 0.6) * 0.025;
          texColor.rgb += vec3(shimmer);
          
          gl_FragColor = texColor;
        }
      `,
      transparent: true,
      depthWrite: false,
      depthTest: false
    });

    // ── Mesh Setup ──
    const geometry = new THREE.PlaneGeometry(2, 2);
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // ── Animation Loop ──
    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      material.uniforms.uTime.value = clock.getElapsedTime();
      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    // ── Resize Handler ──
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      renderer.setSize(w, h);
      material.uniforms.uResolution.value.set(w, h);
    };

    window.addEventListener('resize', handleResize);

    // ── Cleanup ──
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      texture.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={containerRef} className={styles.bgContainer} />;
}
