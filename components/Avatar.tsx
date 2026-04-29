'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GLTFLoader } from 'three-stdlib';
import type { AvatarAction } from '@/lib/types';

interface AvatarProps {
  url: string;
  action?: AvatarAction;
  audioEl?: HTMLAudioElement | null;
  lowQuality?: boolean;
  onLoadFailure?: () => void;
}

/**
 * Ready Player Me .glb avatar with audio-energy lipsync. Loads via GLTFLoader
 * directly (NOT useGLTF) so failures don't suspend or surface in Next.js dev
 * error overlay — the parent simply gets `onLoadFailure` and renders a fallback.
 */
export function Avatar({ url, action = 'idle', audioEl = null, lowQuality, onLoadFailure }: AvatarProps) {
  const [scene, setScene] = useState<THREE.Group | null>(null);
  const rootRef = useRef<THREE.Group>(null);
  const tRef = useRef(0);
  const actionRef = useRef<AvatarAction>(action);
  actionRef.current = action;

  // Build URL with morph targets / LOD on the fly
  const lod = useMemo(() => {
    const base = url.split('?')[0];
    const params = new URLSearchParams(url.includes('?') ? url.split('?')[1] : '');
    if (!params.has('morphTargets')) params.set('morphTargets', 'ARKit,Oculus Visemes');
    if (lowQuality && !params.has('textureAtlas')) params.set('textureAtlas', '512');
    return `${base}?${params.toString()}`;
  }, [url, lowQuality]);

  // Manual GLB load with proper error handling
  useEffect(() => {
    let cancelled = false;
    const loader = new GLTFLoader();
    loader.setCrossOrigin('anonymous');
    loader
      .loadAsync(lod)
      .then((gltf) => {
        if (cancelled) return;
        setScene(gltf.scene);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        // Silenced — caller swaps in placeholder.
        // eslint-disable-next-line no-console
        console.warn('[Avatar] failed to load', err);
        onLoadFailure?.();
      });
    return () => {
      cancelled = true;
    };
  }, [lod, onLoadFailure]);

  // --- Web Audio analyser tied to the active <audio> element ---
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const dataRef = useRef<Uint8Array | null>(null);

  useEffect(() => {
    if (!audioEl) return;
    try {
      const Ctx =
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext ??
        window.AudioContext;
      const ctx = new Ctx();
      const src = ctx.createMediaElementSource(audioEl);
      const an = ctx.createAnalyser();
      an.fftSize = 256;
      src.connect(an);
      an.connect(ctx.destination);
      audioCtxRef.current = ctx;
      analyserRef.current = an;
      dataRef.current = new Uint8Array(an.frequencyBinCount);
    } catch {
      /* element already connected — ignore */
    }
    return () => {
      audioCtxRef.current?.close().catch(() => undefined);
      audioCtxRef.current = null;
      analyserRef.current = null;
    };
  }, [audioEl]);

  // Find skinned meshes with morph targets we care about
  const morphTargets = useMemo(() => {
    if (!scene) return [] as Array<{ mesh: THREE.Mesh; idxs: number[] }>;
    const targets: Array<{ mesh: THREE.Mesh; idxs: number[] }> = [];
    scene.traverse((obj: THREE.Object3D) => {
      const m = obj as THREE.Mesh;
      if (m.isMesh && m.morphTargetDictionary && m.morphTargetInfluences) {
        const dict = m.morphTargetDictionary;
        const candidates = ['mouthOpen', 'jawOpen', 'viseme_aa', 'viseme_E', 'viseme_O', 'viseme_U'];
        const idxs = candidates.map((n) => dict[n]).filter((v): v is number => typeof v === 'number');
        if (idxs.length > 0) targets.push({ mesh: m, idxs });
      }
    });
    return targets;
  }, [scene]);

  useFrame((_state, delta) => {
    tRef.current += delta;
    const t = tRef.current;

    // Lip-sync energy
    let energy = 0;
    if (analyserRef.current && dataRef.current) {
      analyserRef.current.getByteFrequencyData(dataRef.current as Uint8Array<ArrayBuffer>);
      let sum = 0;
      for (let i = 0; i < dataRef.current.length; i++) sum += dataRef.current[i];
      energy = Math.min(1, sum / dataRef.current.length / 90);
    }
    const open = energy * 1.1;
    for (const { mesh, idxs } of morphTargets) {
      if (!mesh.morphTargetInfluences) continue;
      for (const i of idxs) {
        mesh.morphTargetInfluences[i] +=
          (open - mesh.morphTargetInfluences[i]) * Math.min(1, delta * 18);
      }
    }

    const root = rootRef.current;
    if (!root) return;
    const a = actionRef.current;
    const breathing = Math.sin(t * 1.4) * 0.015;
    if (a === 'wave') {
      root.position.y = -0.9 + breathing;
      root.rotation.y = Math.sin(t * 2) * 0.15;
      root.rotation.z = Math.sin(t * 4) * 0.04;
    } else if (a === 'explain') {
      root.position.y = -0.9 + breathing;
      root.rotation.y = Math.sin(t * 0.8) * 0.06;
      root.rotation.z = 0;
    } else if (a === 'listen') {
      root.position.y = -0.9 + breathing * 0.5;
      root.rotation.y = THREE.MathUtils.lerp(root.rotation.y, 0.1, delta * 2);
    } else if (a === 'point') {
      root.position.y = -0.9 + breathing;
      root.rotation.y = THREE.MathUtils.lerp(root.rotation.y, -0.25, delta * 3);
    } else {
      root.position.y = -0.9 + breathing;
      root.rotation.y = THREE.MathUtils.lerp(root.rotation.y, 0, delta * 1.5);
      root.rotation.z = 0;
    }
  });

  return (
    <group ref={rootRef} position={[-1.6, -0.9, 0]} rotation={[0, 0.25, 0]}>
      {scene && <primitive object={scene} />}
    </group>
  );
}
