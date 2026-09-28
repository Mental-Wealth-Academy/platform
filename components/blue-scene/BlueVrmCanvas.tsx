'use client';

import { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  VRMLoaderPlugin,
  VRMUtils,
  type VRM,
  type VRMExpressionPresetName,
} from '@pixiv/three-vrm';
import {
  type DirectionalLight,
  Euler,
  MathUtils,
  Quaternion,
  SRGBColorSpace,
  type Object3D,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const MODEL_URL = '/models/blue.vrm';
const CAMERA_HEIGHT = 1.47;
const CAMERA_DISTANCE = 0.94;
const VISEME_SEQUENCE: VRMExpressionPresetName[] = [
  'aa',
  'ih',
  'aa',
  'oh',
  'ee',
  'ou',
  'ih',
  'aa',
  'ee',
  'oh',
  'ou',
];
const MOUTH_EXPRESSIONS: VRMExpressionPresetName[] = ['aa', 'ih', 'ou', 'ee', 'oh'];

interface BlueVrmCanvasProps {
  active: boolean;
  analyserRef?: MutableRefObject<AnalyserNode | null>;
  audioRef?: MutableRefObject<HTMLAudioElement | null>;
  companionVolumeRef?: MutableRefObject<number>;
  companionMode?: 'idle' | 'listening' | 'speaking';
  reducedMotion: boolean;
  onError: () => void;
  onReady: () => void;
}

type BlueModelProps = BlueVrmCanvasProps;

function CameraAim() {
  const camera = useThree((state) => state.camera);

  useEffect(() => {
    camera.lookAt(0, CAMERA_HEIGHT, 0);
    camera.updateProjectionMatrix();
  }, [camera]);

  return null;
}

function SceneLights() {
  const keyLightRef = useRef<DirectionalLight | null>(null);
  const blueLightRef = useRef<DirectionalLight | null>(null);

  useEffect(() => {
    const context = document.createElement('canvas').getContext('2d', {
      willReadFrequently: true,
    });
    if (!context) return;

    const applyCssColor = (
      light: DirectionalLight | null,
      variableName: string,
    ) => {
      const cssColor = window
        .getComputedStyle(document.documentElement)
        .getPropertyValue(variableName)
        .trim();
      if (!light || !cssColor) return;

      context.clearRect(0, 0, 1, 1);
      context.fillStyle = cssColor;
      context.fillRect(0, 0, 1, 1);
      const [red, green, blue] = context.getImageData(0, 0, 1, 1).data;
      light.color.setRGB(red / 255, green / 255, blue / 255, SRGBColorSpace);
    };

    applyCssColor(keyLightRef.current, '--color-text-light');
    applyCssColor(blueLightRef.current, '--color-primary');
  }, []);

  return (
    <>
      <ambientLight intensity={1.7} />
      <directionalLight ref={keyLightRef} intensity={2.2} position={[1.5, 3, 4]} />
      <directionalLight ref={blueLightRef} intensity={0.8} position={[-3, 1.2, 1.5]} />
    </>
  );
}

function readVoiceLevel(
  analyser: AnalyserNode | null,
  waveformRef: MutableRefObject<Uint8Array<ArrayBuffer> | null>,
): number {
  if (!analyser) return 0;

  if (!waveformRef.current || waveformRef.current.length !== analyser.fftSize) {
    waveformRef.current = new Uint8Array(new ArrayBuffer(analyser.fftSize));
  }

  const waveform = waveformRef.current;
  analyser.getByteTimeDomainData(waveform);

  let squareSum = 0;
  for (let i = 0; i < waveform.length; i += 1) {
    const sample = (waveform[i] - 128) / 128;
    squareSum += sample * sample;
  }

  const rms = Math.sqrt(squareSum / waveform.length);
  return MathUtils.clamp((rms - 0.018) * 8.5, 0, 1);
}

function setBroadcastPose(vrm: VRM): void {
  const leftUpperArm = vrm.humanoid.getNormalizedBoneNode('leftUpperArm');
  const rightUpperArm = vrm.humanoid.getNormalizedBoneNode('rightUpperArm');
  const leftLowerArm = vrm.humanoid.getNormalizedBoneNode('leftLowerArm');
  const rightLowerArm = vrm.humanoid.getNormalizedBoneNode('rightLowerArm');

  leftUpperArm?.rotation.set(0.08, 0.05, -1.08);
  rightUpperArm?.rotation.set(0.08, -0.05, 1.08);
  leftLowerArm?.rotation.set(0, 0.04, -0.08);
  rightLowerArm?.rotation.set(0, -0.04, 0.08);
}

function BlueModel({
  active,
  analyserRef,
  audioRef,
  companionVolumeRef,
  companionMode = 'idle',
  reducedMotion,
  onError,
  onReady,
}: BlueModelProps) {
  const [vrm, setVrm] = useState<VRM | null>(null);
  const waveformRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const voiceLevelRef = useRef(0);
  const expressionValuesRef = useRef<Record<string, number>>({});
  const headRef = useRef<Object3D | null>(null);
  const chestRef = useRef<Object3D | null>(null);
  const headBaseRef = useRef(new Quaternion());
  const chestBaseRef = useRef(new Quaternion());
  const motionEuler = useMemo(() => new Euler(), []);
  const motionQuaternion = useMemo(() => new Quaternion(), []);

  useEffect(() => {
    let disposed = false;
    let loadedVrm: VRM | null = null;
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));

    loader.load(
      MODEL_URL,
      (gltf) => {
        try {
          const nextVrm = gltf.userData.vrm as VRM | undefined;
          if (!nextVrm) {
            onError();
            return;
          }

          if (disposed) {
            VRMUtils.deepDispose(nextVrm.scene);
            return;
          }

          try {
            VRMUtils.removeUnnecessaryVertices(nextVrm.scene);
          } catch {
            // Non-critical optimization; proceed if fails
          }
          try {
            VRMUtils.combineSkeletons(nextVrm.scene);
          } catch {
            // Non-critical optimization; proceed if fails
          }
          try {
            VRMUtils.combineMorphs(nextVrm);
          } catch {
            // Non-critical optimization; proceed if fails
          }

          nextVrm.scene.traverse((object) => {
            object.frustumCulled = false;
          });

          setBroadcastPose(nextVrm);
          headRef.current = nextVrm.humanoid.getNormalizedBoneNode('head');
          chestRef.current = nextVrm.humanoid.getNormalizedBoneNode('chest');
          headRef.current?.quaternion.normalize();
          chestRef.current?.quaternion.normalize();
          headBaseRef.current.copy(headRef.current?.quaternion ?? new Quaternion());
          chestBaseRef.current.copy(chestRef.current?.quaternion ?? new Quaternion());

          loadedVrm = nextVrm;
          setVrm(nextVrm);
          onReady();
        } catch {
          onError();
        }
      },
      undefined,
      () => onError(),
    );

    return () => {
      disposed = true;
      if (loadedVrm) {
        VRMUtils.deepDispose(loadedVrm.scene);
      }
    };
  }, [onError, onReady]);

  useFrame((state, delta) => {
    if (!vrm) return;

    const time = state.clock.elapsedTime;
    let measuredLevel = 0;

    if (companionVolumeRef) {
      if (companionMode === 'speaking') {
        measuredLevel = MathUtils.clamp(companionVolumeRef.current, 0, 1);
      } else {
        measuredLevel = 0;
      }
    } else {
      const analyser = active ? analyserRef?.current ?? null : null;
      measuredLevel = readVoiceLevel(analyser, waveformRef);
    }

    const voiceLevel = MathUtils.damp(
      voiceLevelRef.current,
      measuredLevel,
      measuredLevel > voiceLevelRef.current ? 24 : 14,
      delta,
    );
    voiceLevelRef.current = voiceLevel;

    const audioTime = audioRef?.current?.currentTime ?? time;
    const visemeCursor = audioTime * 7.5;
    const visemeIndex = Math.floor(visemeCursor) % VISEME_SEQUENCE.length;
    const nextVisemeIndex = (visemeIndex + 1) % VISEME_SEQUENCE.length;
    const blend = MathUtils.smoothstep(visemeCursor % 1, 0.35, 0.75);
    const expressionManager = vrm.expressionManager;

    MOUTH_EXPRESSIONS.forEach((expressionName) => {
      const firstWeight = VISEME_SEQUENCE[visemeIndex] === expressionName ? 1 - blend : 0;
      const secondWeight = VISEME_SEQUENCE[nextVisemeIndex] === expressionName ? blend : 0;
      const target = voiceLevel * Math.min(1, firstWeight + secondWeight);
      const current = expressionValuesRef.current[expressionName] ?? 0;
      const next = MathUtils.damp(current, target, 28, delta);
      expressionValuesRef.current[expressionName] = next;
      expressionManager?.setValue(expressionName, next);
    });

    const blinkPhase = time % 4.6;
    const blinkTarget =
      !reducedMotion && blinkPhase > 4.28
        ? Math.sin(((blinkPhase - 4.28) / 0.32) * Math.PI)
        : 0;
    const currentBlink = expressionValuesRef.current.blink ?? 0;
    const nextBlink = MathUtils.damp(currentBlink, blinkTarget, 36, delta);
    expressionValuesRef.current.blink = nextBlink;
    expressionManager?.setValue('blink', nextBlink);

    if (!reducedMotion) {
      vrm.scene.position.y = Math.sin(time * 0.82) * 0.006;
      vrm.scene.rotation.y = Math.sin(time * 0.42) * 0.024;

      if (headRef.current) {
        const listeningTilt = companionMode === 'listening' ? 0.035 : 0;
        motionEuler.set(
          Math.sin(time * 0.66) * 0.018 + voiceLevel * Math.sin(time * 5.2) * 0.012 + (companionMode === 'listening' ? 0.02 : 0),
          Math.sin(time * 0.38) * 0.026 + listeningTilt,
          Math.sin(time * 0.51) * 0.01,
        );
        motionQuaternion.setFromEuler(motionEuler);
        headRef.current.quaternion.copy(headBaseRef.current).multiply(motionQuaternion);
      }

      if (chestRef.current) {
        motionEuler.set(Math.sin(time * 0.82) * 0.008, 0, Math.sin(time * 0.37) * 0.006);
        motionQuaternion.setFromEuler(motionEuler);
        chestRef.current.quaternion.copy(chestBaseRef.current).multiply(motionQuaternion);
      }
    }

    vrm.update(delta);
  });

  if (!vrm) return null;
  return <primitive object={vrm.scene} />;
}

export default function BlueVrmCanvas(props: BlueVrmCanvasProps) {
  const dpr = typeof window === 'undefined' ? 1 : Math.min(window.devicePixelRatio || 1, 1.5);

  return (
    <Canvas
      aria-hidden="true"
      camera={{ position: [0, CAMERA_HEIGHT, CAMERA_DISTANCE], fov: 30, near: 0.1, far: 20 }}
      dpr={[1, dpr]}
      frameloop={props.reducedMotion ? 'demand' : 'always'}
      gl={{
        alpha: true,
        antialias: true,
        depth: true,
        powerPreference: 'high-performance',
        stencil: false,
      }}
      onCreated={({ gl }) => {
        gl.setClearColor(0x000000, 0);
      }}
    >
      <CameraAim />
      <SceneLights />
      <BlueModel {...props} />
    </Canvas>
  );
}
