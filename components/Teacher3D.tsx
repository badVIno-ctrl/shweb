'use client';

/**
 * Teacher3D — procedural 3D character used by Viora Smart Academy (VSA).
 * Represents Dr. Viora, a young woman professor of mathematics.
 *
 * Built entirely from primitive geometries (no GLB / textures) so it works
 * fully offline. Acts as the default 3D teacher — the project no longer
 * depends on any third-party avatar service.
 *
 * The figure is composed in real-world-ish proportions (~1.7m tall) so the
 * silhouette reads as a person, not a blob:
 *   • feet  →  legs (slim cylinders)
 *   • A-line skirt
 *   • slim cylindrical torso under a fitted blazer
 *   • clear cylindrical neck
 *   • spherical head (slightly elongated)
 *   • shoulder-length hair with side bangs
 *   • rigged shoulders → upper arms → forearms → hands w/ five fingers
 *
 * Animation:
 *   • subtle idle sway and head bob
 *   • blink schedule (random 2–5s)
 *   • lip-sync from <audio> RMS (when audioEl provided)
 *   • per-action poses: 'wave', 'point', 'explain', 'listen', 'idle'
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { AvatarAction } from '@/lib/types';

interface Props {
  action: AvatarAction;
  audioEl: HTMLAudioElement | null;
}

// Palette — slightly warmer, richer than before so the teacher reads as alive
// under the cool studio rim light.
const SKIN = '#f5dcc4';
const SKIN_DARK = '#f5dcc4';
const BLUSH = '#e88a92';
const HAIR = '#3d2418';
const HAIR_HI = '#6b4a32';
const BLAZER = '#3a2f63';
const BLAZER_LIGHT = '#564890';
const BLOUSE = '#fbf1de';
const SKIRT = '#231b3f';
const ACCENT = '#A78BFA';
const LIPS = '#c8616f';
const EYE_DARK = '#191324';
const IRIS = '#3f7aa8';
const NAIL = '#c97487';
const TIGHTS = '#1a1428';
const SHOE = '#0f0d18';

export function Teacher3D({ action, audioEl }: Props) {
  const root = useRef<THREE.Group>(null!);
  const head = useRef<THREE.Group>(null!);
  const eyeL = useRef<THREE.Mesh>(null!);
  const eyeR = useRef<THREE.Mesh>(null!);
  const mouth = useRef<THREE.Mesh>(null!);
  const eyebrowL = useRef<THREE.Mesh>(null!);
  const eyebrowR = useRef<THREE.Mesh>(null!);
  const armR = useRef<THREE.Group>(null!);
  const armL = useRef<THREE.Group>(null!);
  const torso = useRef<THREE.Group>(null!);

  // ---- Audio analyser for lip-sync ----
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const dataRef = useRef<Uint8Array>(new Uint8Array(new ArrayBuffer(64)));

  useEffect(() => {
    if (!audioEl) {
      setAnalyser(null);
      return;
    }
    let ctx: AudioContext | null = null;
    let src: MediaElementAudioSourceNode | null = null;
    let an: AnalyserNode | null = null;
    try {
      const Ctx =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext!;
      ctx = new Ctx();
      src = ctx.createMediaElementSource(audioEl);
      an = ctx.createAnalyser();
      an.fftSize = 128;
      src.connect(an);
      an.connect(ctx.destination);
      setAnalyser(an);
    } catch {
      // Already-connected element or unsupported context — skip lip-sync.
    }
    return () => {
      try { src?.disconnect(); } catch { /* ignore */ }
      try { an?.disconnect(); } catch { /* ignore */ }
      try { ctx?.close(); } catch { /* ignore */ }
      setAnalyser(null);
    };
  }, [audioEl]);

  const blinkRef = useRef({ next: 2, t: 0 });

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;

    // Subtle whole-body sway. Breathing was attempted via torso.scale.y but
    // that scaled the head/arms too and opened a visible gap between torso
    // and skirt — kept as a TODO until rigged via per-mesh scale.
    if (root.current) {
      root.current.position.y = -0.95 + Math.sin(t * 1.2) * 0.012;
    }

    // ---- Arm poses by action ----
    if (armR.current && armL.current) {
      // rotation.z is the "lift": -1.6 ≈ horizontal, 0 ≈ down at side.
      let lR = -0.10;
      let lL = -0.10;
      let swingR = 0;
      let swingL = 0;
      if (action === 'wave') {
        lR = -2.05 + Math.sin(t * 7) * 0.12;
        swingR = Math.sin(t * 7) * 0.25;
      } else if (action === 'point') {
        lR = -1.45;
        swingR = -0.1;
      } else if (action === 'explain') {
        lR = -0.85 + Math.sin(t * 2.6) * 0.18;
        lL = -0.75 + Math.cos(t * 2.6) * 0.16;
        swingR = Math.sin(t * 2.6 + 0.4) * 0.15;
        swingL = Math.cos(t * 2.6 + 0.4) * 0.15;
      } else if (action === 'listen') {
        lR = -0.20;
        lL = -0.20;
      } else {
        lR = -0.10 + Math.sin(t * 0.9) * 0.03;
        lL = -0.10 + Math.sin(t * 0.9 + 0.6) * 0.03;
      }
      // Sign convention: rotation.z is applied so that POSITIVE values raise
      // the arm OUTWARD-and-up. With the arm capsule hanging down at local
      // (-y), rotating armR by +lR sends the hand to (+x, +y) — i.e. away
      // from the face and toward the board on the right. armL is mirrored
      // (negative). The previous version had armR.z = lR (a NEGATIVE value),
      // which rotated the arm across the body and clipped through the head.
      armR.current.rotation.z = THREE.MathUtils.damp(armR.current.rotation.z, -lR, 4, dt);
      armL.current.rotation.z = THREE.MathUtils.damp(armL.current.rotation.z, lL, 4, dt);
      armR.current.rotation.x = THREE.MathUtils.damp(armR.current.rotation.x, swingR, 4, dt);
      armL.current.rotation.x = THREE.MathUtils.damp(armL.current.rotation.x, swingL, 4, dt);
    }

    // ---- Head movement ----
    if (head.current) {
      const tilt = action === 'listen' ? 0.18 : 0;
      head.current.rotation.z = THREE.MathUtils.damp(head.current.rotation.z, tilt, 3, dt);
      head.current.rotation.y = Math.sin(t * 0.7) * 0.06;
      head.current.rotation.x = Math.sin(t * 0.55) * 0.03;
    }
    if (torso.current) {
      torso.current.rotation.y = Math.sin(t * 0.45) * 0.025;
    }

    // ---- Blink ----
    blinkRef.current.t += dt;
    let openY = 1;
    if (blinkRef.current.t > blinkRef.current.next) {
      const phase = blinkRef.current.t - blinkRef.current.next;
      if (phase < 0.16) {
        openY = Math.max(0.05, 1 - phase / 0.08);
        if (phase >= 0.08) openY = Math.min(1, (phase - 0.08) / 0.08);
      } else {
        blinkRef.current.t = 0;
        blinkRef.current.next = 2 + Math.random() * 3.5;
      }
    }
    if (eyeL.current) eyeL.current.scale.y = openY;
    if (eyeR.current) eyeR.current.scale.y = openY;

    // ---- Lip sync ----
    let mouthOpen = 0.25;
    if (analyser) {
      analyser.getByteFrequencyData(dataRef.current as unknown as Uint8Array<ArrayBuffer>);
      let sum = 0;
      for (let i = 0; i < 24; i++) sum += dataRef.current[i];
      const avg = sum / 24 / 255;
      mouthOpen = 0.20 + Math.min(1.0, avg * 2.6);
    } else if (action === 'explain') {
      mouthOpen = 0.20 + (Math.sin(t * 9) * 0.5 + 0.5) * 0.65;
    }
    if (mouth.current) {
      mouth.current.scale.y = THREE.MathUtils.damp(mouth.current.scale.y, mouthOpen, 22, dt);
      mouth.current.scale.x = THREE.MathUtils.damp(mouth.current.scale.x, 1 - mouthOpen * 0.25, 12, dt);
    }
    if (eyebrowL.current && eyebrowR.current) {
      const brow = action === 'explain' ? 0.012 + mouthOpen * 0.006 : 0;
      eyebrowL.current.position.y = 0.115 + brow;
      eyebrowR.current.position.y = 0.115 + brow;
    }
  });

  // ---- Materials ----
  // Skin uses a hint of emissive in its own colour to fake subsurface warmth
  // under cool stage lighting — without going full SSS shader.
  // No emissive tint — even a faint dark-red emissive shifts the whole face
  // toward brown under cool stage lighting.
  const skinMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: SKIN,
        // Higher roughness + envMapIntensity 0 makes the skin matte and
        // immune to the warm 'city' Environment IBL that was tinting it.
        roughness: 0.85,
        metalness: 0,
        envMapIntensity: 0,
      }),
    [],
  );
  const skinDarkMat = useMemo(() => new THREE.MeshStandardMaterial({ color: SKIN_DARK, roughness: 0.55 }), []);
  // Hair uses a touch of anisotropy-ish gloss; standard mat with low roughness
  // catches the rim light and reads as healthy hair instead of felt.
  const hairMat = useMemo(() => new THREE.MeshStandardMaterial({ color: HAIR, roughness: 0.55, metalness: 0.05 }), []);
  const hairHiMat = useMemo(() => new THREE.MeshStandardMaterial({ color: HAIR_HI, roughness: 0.5, metalness: 0.05 }), []);
  const blazerMat = useMemo(() => new THREE.MeshStandardMaterial({ color: BLAZER, roughness: 0.7 }), []);
  const blazerLightMat = useMemo(() => new THREE.MeshStandardMaterial({ color: BLAZER_LIGHT, roughness: 0.65 }), []);
  const blouseMat = useMemo(() => new THREE.MeshStandardMaterial({ color: BLOUSE, roughness: 0.5 }), []);
  const skirtMat = useMemo(() => new THREE.MeshStandardMaterial({ color: SKIRT, roughness: 0.7 }), []);
  const tightsMat = useMemo(() => new THREE.MeshStandardMaterial({ color: TIGHTS, roughness: 0.9 }), []);
  const accentMat = useMemo(() => new THREE.MeshStandardMaterial({ color: ACCENT, roughness: 0.4, metalness: 0.3 }), []);

  return (
    <group ref={root} position={[-1.6, -0.95, 0.4]}>
      {/* Soft contact shadow */}
      <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.45, 32]} />
        <meshBasicMaterial color="#000" transparent opacity={0.32} />
      </mesh>

      {/* ===== Lower body ===== */}
      <Shoe side={1} />
      <Shoe side={-1} />
      <Leg side={1} material={tightsMat} />
      <Leg side={-1} material={tightsMat} />
      {/* Knee-length A-line skirt — frustum so the waist matches the torso's
          bottom radius (0.16) and flares out at the hem (0.30). Closed top
          prevents seeing through to the legs from above; the bottom is left
          open so the legs stick out naturally. */}
      <mesh position={[0, 0.78, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.30, 0.34, 28, 1, false]} />
        <primitive object={skirtMat} attach="material" />
      </mesh>
      {/* Belt accent */}
      <mesh position={[0, 0.95, 0]}>
        <cylinderGeometry args={[0.165, 0.165, 0.025, 24]} />
        <primitive object={accentMat} attach="material" />
      </mesh>

      {/* ===== Torso ===== */}
      {/* Anchor sits directly on top of the belt (y=0.95) + half torso height
          (0.21) so the blazer cylinder's bottom edge meets the belt without a
          visible gap between waist and chest. */}
      <group ref={torso} position={[0, 1.16, 0]}>
        {/* Slim body — narrower at the waist, broader at chest */}
        <mesh castShadow position={[0, 0, 0]}>
          <cylinderGeometry args={[0.205, 0.16, 0.42, 24]} />
          <primitive object={blazerMat} attach="material" />
        </mesh>
        {/* Subtle chest curve */}
        <mesh position={[0, 0.06, 0.13]}>
          <sphereGeometry args={[0.14, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2.4]} />
          <primitive object={blazerMat} attach="material" />
        </mesh>
        {/* Blouse V-neck */}
        <mesh position={[0, 0.13, 0.18]}>
          <coneGeometry args={[0.10, 0.24, 3, 1, true]} />
          <primitive object={blouseMat} attach="material" />
        </mesh>
        {/* Lapels */}
        <mesh position={[-0.10, 0.13, 0.17]} rotation={[0, 0, 0.3]}>
          <boxGeometry args={[0.045, 0.26, 0.02]} />
          <primitive object={blazerLightMat} attach="material" />
        </mesh>
        <mesh position={[0.10, 0.13, 0.17]} rotation={[0, 0, -0.3]}>
          <boxGeometry args={[0.045, 0.26, 0.02]} />
          <primitive object={blazerLightMat} attach="material" />
        </mesh>
        {/* Lapel pin */}
        <mesh position={[0.13, 0.20, 0.20]}>
          <sphereGeometry args={[0.018, 12, 8]} />
          <primitive object={accentMat} attach="material" />
        </mesh>
        {/* Buttons */}
        {[-0.04, -0.16].map((y, i) => (
          <mesh key={i} position={[0, y, 0.20]}>
            <sphereGeometry args={[0.012, 8, 6]} />
            <meshStandardMaterial color="#0f0a22" />
          </mesh>
        ))}

        {/* Shoulders */}
        <mesh position={[-0.245, 0.18, 0]}>
          <sphereGeometry args={[0.085, 16, 12]} />
          <primitive object={blazerMat} attach="material" />
        </mesh>
        <mesh position={[0.245, 0.18, 0]}>
          <sphereGeometry args={[0.085, 16, 12]} />
          <primitive object={blazerMat} attach="material" />
        </mesh>

        {/* Arms */}
        <Arm groupRef={armL} side={-1} blazerMat={blazerMat} skinMat={skinMat} />
        <Arm groupRef={armR} side={1} blazerMat={blazerMat} skinMat={skinMat} />

        {/* Neck */}
        <mesh position={[0, 0.27, 0]}>
          <cylinderGeometry args={[0.052, 0.06, 0.10, 16]} />
          <primitive object={skinMat} attach="material" />
        </mesh>

        {/* ===== Head ===== */}
        <group ref={head} position={[0, 0.43, 0]}>
          {/* Cranium */}
          <mesh castShadow scale={[1, 1.15, 1.05]}>
            <sphereGeometry args={[0.135, 32, 24]} />
            <primitive object={skinMat} attach="material" />
          </mesh>
          {/* (No chin/cheek shading sphere — it was the dark patch staining
              the front of the face brown.) */}

          {/* Hair (bob cut) — base scalp + ring of strand capsules. */}
          <HairBob hairMat={hairMat} hairHiMat={hairHiMat} />

          {/* Eyebrows */}
          <mesh ref={eyebrowL} position={[-0.045, 0.115, 0.115]} rotation={[0, 0, 0.12]}>
            <boxGeometry args={[0.044, 0.011, 0.012]} />
            <meshStandardMaterial color={HAIR} />
          </mesh>
          <mesh ref={eyebrowR} position={[0.045, 0.115, 0.115]} rotation={[0, 0, -0.12]}>
            <boxGeometry args={[0.044, 0.011, 0.012]} />
            <meshStandardMaterial color={HAIR} />
          </mesh>

          {/* Eyes */}
          <Eye groupRef={eyeL} x={-0.045} />
          <Eye groupRef={eyeR} x={0.045} />

          {/* Glasses removed: the dark rims around the larger sclera read as
              a "mask" across the face on a small stylised character. */}

          {/* Nose — same skin tone as the rest of the face so it doesn't
              read as a brown blob from the front. */}
          <mesh position={[0, 0.005, 0.128]} rotation={[Math.PI / 2, 0, 0]}>
            <coneGeometry args={[0.012, 0.04, 10]} />
            <primitive object={skinMat} attach="material" />
          </mesh>

          {/* Lower lip — fuller, slightly redder. */}
          <mesh ref={mouth} position={[0, -0.052, 0.122]} scale={[1, 0.55, 0.6]}>
            <sphereGeometry args={[0.024, 18, 10]} />
            <meshStandardMaterial color={LIPS} roughness={0.35} />
          </mesh>
          {/* Subtle smile arc (upper lip line). */}
          <mesh position={[0, -0.04, 0.128]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.022, 0.0028, 8, 16, Math.PI]} />
            <meshStandardMaterial color={LIPS} roughness={0.5} />
          </mesh>

          {/* Cheek blush — soft pink discs blended with skin. */}
          <mesh position={[-0.085, -0.02, 0.108]}>
            <sphereGeometry args={[0.024, 12, 10]} />
            <meshStandardMaterial
              color={BLUSH}
              transparent
              opacity={0.35}
              roughness={0.7}
            />
          </mesh>
          <mesh position={[0.085, -0.02, 0.108]}>
            <sphereGeometry args={[0.024, 12, 10]} />
            <meshStandardMaterial
              color={BLUSH}
              transparent
              opacity={0.35}
              roughness={0.7}
            />
          </mesh>

          {/* Earrings (positioned at the actual ear level, on the sides). */}
          <mesh position={[-0.142, -0.025, 0.01]}>
            <sphereGeometry args={[0.012, 12, 10]} />
            <meshStandardMaterial color={ACCENT} metalness={0.7} roughness={0.18} />
          </mesh>
          <mesh position={[0.142, -0.025, 0.01]}>
            <sphereGeometry args={[0.012, 12, 10]} />
            <meshStandardMaterial color={ACCENT} metalness={0.7} roughness={0.18} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

/* ============== sub-components ============== */

/**
 * Bob-cut hair: a scalp dome (sphere segment) plus a ring of capsule strands
 * draped down to the jawline, with a side-bang sweep across the forehead.
 * Each strand is its own capsule so the silhouette breaks up naturally instead
 * of being a single boxy chunk.
 */
function HairBob({
  hairMat,
  hairHiMat,
}: {
  hairMat: THREE.Material;
  hairHiMat: THREE.Material;
}) {
  // Three.js sphere parameterisation: phi sweeps around Y axis.
  //   x = -r*cos(phi)*sin(theta), z = r*sin(phi)*sin(theta)
  // → +Z (face direction) is at phi = π/2. Leave a 70° wedge open there for
  //   the face; the rest of the sphere wraps the back, sides and top of the
  //   head as a single continuous "bob" shell.
  const FACE_GAP = Math.PI * 0.39; // ≈ 70°
  const phiStart = Math.PI / 2 + FACE_GAP / 2;
  const phiLength = Math.PI * 2 - FACE_GAP;

  return (
    <group>
      {/* Main hair shell — covers top, sides and back of the head down past
          the jawline as ONE solid surface (no individual strands → no
          "sausage" silhouette, no scalp gaps). */}
      <mesh position={[0, 0.02, -0.005]} scale={[1.10, 1.22, 1.12]} castShadow>
        <sphereGeometry
          args={[0.148, 48, 36, phiStart, phiLength, 0, Math.PI * 0.78]}
        />
        <primitive object={hairMat} attach="material" />
      </mesh>

      {/* Inner shell — same face cutout as the outer shell so it doesn't
          drape across the forehead and look like brown skin. */}
      <mesh position={[0, 0.02, -0.005]} scale={[1.04, 1.18, 1.07]}>
        <sphereGeometry args={[0.144, 36, 24, phiStart, phiLength, 0, Math.PI * 0.55]} />
        <primitive object={hairMat} attach="material" />
      </mesh>

      {/* Bangs removed — leaves the forehead clear so the skin tone matches
          the rest of the face. The hair shell starts well above the brow line. */}
    </group>
  );
}

function Eye({ groupRef, x }: { groupRef: React.RefObject<THREE.Mesh>; x: number }) {
  return (
    <group position={[x, 0.045, 0.108]}>
      {/* Sclera — slightly bigger so the iris reads cleanly even at distance. */}
      <mesh ref={groupRef}>
        <sphereGeometry args={[0.030, 24, 18]} />
        <meshStandardMaterial color="#fbf6ee" roughness={0.22} />
      </mesh>
      {/* Iris — soft cool blue. Larger ratio (≈0.6 of sclera) makes the eye
          look like a stylised cartoon eye instead of a thin slit. */}
      <mesh position={[0, 0, 0.020]}>
        <sphereGeometry args={[0.018, 22, 16]} />
        <meshStandardMaterial color={IRIS} roughness={0.4} />
      </mesh>
      {/* Pupil. */}
      <mesh position={[0, 0, 0.029]}>
        <sphereGeometry args={[0.009, 16, 12]} />
        <meshStandardMaterial color={EYE_DARK} />
      </mesh>
      {/* Catchlight — single most important detail for "alive" eyes. */}
      <mesh position={[0.006, 0.006, 0.033]}>
        <sphereGeometry args={[0.005, 12, 10]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      {/* Soft upper eyelid arc — torus segment in the face plane (XY) framing
          ONLY the top of the eye. Earlier this had rotation=[π/2,0,0] which
          rotated it into the XZ plane, producing a "robber mask" band across
          both eyes. Color is a desaturated brown, not pitch black, so it
          reads as a lash line instead of war paint. */}
      <mesh position={[0, 0.001, 0.028]}>
        <torusGeometry args={[0.030, 0.0028, 8, 20, Math.PI]} />
        <meshStandardMaterial color={'#3b2a3a'} roughness={0.7} />
      </mesh>
    </group>
  );
}

function Glasses() {
  return (
    // Pushed forward so the rims don't intersect the now-larger sclera.
    <group position={[0, 0.045, 0.150]}>
      <mesh position={[-0.045, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.030, 0.0035, 8, 24]} />
        <meshStandardMaterial color="#1a1f33" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0.045, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.030, 0.0035, 8, 24]} />
        <meshStandardMaterial color="#1a1f33" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.030, 0.004, 0.004]} />
        <meshStandardMaterial color="#1a1f33" metalness={0.7} />
      </mesh>
    </group>
  );
}

function Arm({
  groupRef,
  side,
  blazerMat,
  skinMat,
}: {
  groupRef: React.RefObject<THREE.Group>;
  side: 1 | -1;
  blazerMat: THREE.Material;
  skinMat: THREE.Material;
}) {
  return (
    <group ref={groupRef} position={[side * 0.245, 0.16, 0]}>
      <mesh position={[0, -0.14, 0]} castShadow>
        <capsuleGeometry args={[0.045, 0.20, 8, 12]} />
        <primitive object={blazerMat} attach="material" />
      </mesh>
      <mesh position={[0, -0.27, 0]}>
        <sphereGeometry args={[0.046, 12, 10]} />
        <primitive object={blazerMat} attach="material" />
      </mesh>
      <mesh position={[0, -0.38, 0]} castShadow>
        <capsuleGeometry args={[0.04, 0.18, 8, 12]} />
        <primitive object={blazerMat} attach="material" />
      </mesh>
      <mesh position={[0, -0.475, 0]}>
        <cylinderGeometry args={[0.043, 0.043, 0.018, 16]} />
        <meshStandardMaterial color={BLOUSE} />
      </mesh>
      <group position={[0, -0.52, 0]}>
        <mesh>
          <sphereGeometry args={[0.04, 16, 12]} />
          <primitive object={skinMat} attach="material" />
        </mesh>
        {[-0.022, -0.011, 0, 0.012, 0.022].map((x, i) => (
          <group key={i} position={[x, -0.038, 0]}>
            <mesh>
              <capsuleGeometry args={[0.0072, 0.038 - Math.abs(i - 2) * 0.005, 6, 8]} />
              <primitive object={skinMat} attach="material" />
            </mesh>
            <mesh position={[0, -0.022, 0]}>
              <sphereGeometry args={[0.005, 6, 6]} />
              <meshStandardMaterial color={NAIL} roughness={0.3} />
            </mesh>
          </group>
        ))}
        <mesh position={[side * 0.034, -0.018, 0.01]} rotation={[0, 0, side * -0.7]}>
          <capsuleGeometry args={[0.0078, 0.030, 6, 8]} />
          <primitive object={skinMat} attach="material" />
        </mesh>
      </group>
    </group>
  );
}

function Leg({ side, material }: { side: 1 | -1; material: THREE.Material }) {
  return (
    <group position={[side * 0.085, 0.40, 0]}>
      <mesh castShadow>
        <capsuleGeometry args={[0.058, 0.40, 8, 12]} />
        <primitive object={material} attach="material" />
      </mesh>
    </group>
  );
}

function Shoe({ side }: { side: 1 | -1 }) {
  return (
    <mesh position={[side * 0.085, 0.04, 0.055]} castShadow>
      <boxGeometry args={[0.10, 0.05, 0.18]} />
      <meshStandardMaterial color={SHOE} roughness={0.3} metalness={0.2} />
    </mesh>
  );
}
