'use client';

import {
  Suspense,
  type ForwardedRef,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Stars, ContactShadows, Html, OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import {
  Pen,
  ZoomIn,
  ZoomOut,
  Eraser,
  Undo2,
  Maximize2,
  Plus,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
} from 'lucide-react';
import { Avatar } from './Avatar';
import { Teacher3D } from './Teacher3D';
import { Blackboard, type BlackboardHandle } from './Blackboard';
import type { AvatarAction } from '@/lib/types';

interface Scene3DProps {
  avatarUrl: string;
  avatarAction: AvatarAction;
  audioEl?: HTMLAudioElement | null;
  starry?: boolean;
  /** Show the on-screen toolbar (marker / zoom / reset). Default true. */
  showToolbar?: boolean;
}

const MARKER_COLORS = ['#FFD86B', '#7AE7C7', '#FF8FB1', '#A78BFA', '#FFFFFF'];
const BOARD_OFFSET_X = 6;
const BOARD_BASE: [number, number, number] = [2, 0.6, -0.4];

function boardPosition(idx: number): [number, number, number] {
  return [BOARD_BASE[0] + idx * BOARD_OFFSET_X, BOARD_BASE[1], BOARD_BASE[2]];
}

/**
 * Smoothly tween OrbitControls target + camera to focus a board, but ONLY while
 * a tween is active. Once converged, the tweener releases control so the user
 * can freely rotate / zoom / pan via OrbitControls.
 */
function CameraTweener({
  controlsRef,
  focusedIdx,
}: {
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
  focusedIdx: number;
}) {
  const tweenActive = useRef(false);
  const wantTarget = useRef(new THREE.Vector3(...boardPosition(0)));
  const wantPos = useRef(new THREE.Vector3());

  useEffect(() => {
    const c = controlsRef.current;
    if (!c) return;
    // Capture the user's current camera-to-target offset so the tween preserves
    // their zoom / angle.
    const cam = c.object as THREE.PerspectiveCamera;
    const offset = cam.position.clone().sub(c.target);
    wantTarget.current.set(...boardPosition(focusedIdx));
    wantPos.current.copy(wantTarget.current).add(offset);
    tweenActive.current = true;
  }, [focusedIdx, controlsRef]);

  useFrame((_, dt) => {
    if (!tweenActive.current) return;
    const c = controlsRef.current;
    if (!c) return;
    const k = 1 - Math.pow(0.001, Math.min(0.1, dt));
    c.target.lerp(wantTarget.current, k);
    const cam = c.object as THREE.PerspectiveCamera;
    cam.position.lerp(wantPos.current, k);
    c.update();
    if (
      c.target.distanceTo(wantTarget.current) < 0.01 &&
      cam.position.distanceTo(wantPos.current) < 0.01
    ) {
      tweenActive.current = false;
    }
  });
  return null;
}

export const Scene3D = forwardRef(function Scene3D(
  { avatarUrl, avatarAction, audioEl, starry = false, showToolbar = true }: Scene3DProps,
  ref: ForwardedRef<BlackboardHandle>,
) {
  const [lowQ, setLowQ] = useState(false);
  const [hasWebGL, setHasWebGL] = useState(true);
  const [avatarBroken, setAvatarBroken] = useState(false);
  const [marker, setMarker] = useState(false);
  const [color, setColor] = useState(MARKER_COLORS[0]);
  const [boards, setBoards] = useState<number[]>([0]);
  const [focused, setFocused] = useState(0);
  const boardHandles = useRef<Record<number, BlackboardHandle | null>>({});
  const orbitRef = useRef<OrbitControlsImpl | null>(null);

  useImperativeHandle(ref, () => {
    const focusedHandle = () => boardHandles.current[focused] ?? boardHandles.current[0];
    return {
      exec: (cmd) => boardHandles.current[0]?.exec(cmd),
      reset: () => boardHandles.current[0]?.reset(),
      getCanvas: () => focusedHandle()?.getCanvas() ?? null,
      getStateJson: () => boardHandles.current[0]?.getStateJson() ?? '[]',
      loadState: (cmds) => boardHandles.current[0]?.loadState(cmds),
      setMarkerMode: (on) =>
        Object.values(boardHandles.current).forEach((h) => h?.setMarkerMode(on)),
      setMarkerColor: (c) =>
        Object.values(boardHandles.current).forEach((h) => h?.setMarkerColor(c)),
      undoMarker: () => focusedHandle()?.undoMarker(),
      eraseUserStrokes: () => focusedHandle()?.eraseUserStrokes(),
    };
  });

  useEffect(() => {
    const cores = navigator.hardwareConcurrency ?? 4;
    setLowQ(window.devicePixelRatio < 2 || cores < 4);
    try {
      const c = document.createElement('canvas');
      const gl = c.getContext('webgl2') || c.getContext('webgl');
      if (!gl) setHasWebGL(false);
    } catch {
      setHasWebGL(false);
    }
  }, []);

  useEffect(() => {
    Object.values(boardHandles.current).forEach((h) => {
      h?.setMarkerMode(marker);
      h?.setMarkerColor(color);
    });
  }, [marker, color]);

  // Ctrl+Z everywhere undoes the last marker stroke on the focused board.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
        const tgt = e.target as HTMLElement | null;
        if (tgt && /input|textarea/i.test(tgt.tagName)) return;
        e.preventDefault();
        const h = boardHandles.current[focused] ?? boardHandles.current[0];
        h?.undoMarker();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [focused]);

  function zoom(delta: number) {
    const o = orbitRef.current;
    if (!o) return;
    const cam = o.object as THREE.PerspectiveCamera;
    const target = o.target;
    const dir = cam.position.clone().sub(target);
    const next = dir.length() * (delta > 0 ? 0.85 : 1.18);
    const min = (o.minDistance ?? 1) + 0.01;
    const max = (o.maxDistance ?? 100) - 0.01;
    dir.setLength(Math.min(max, Math.max(min, next)));
    cam.position.copy(target).add(dir);
    o.update();
  }

  function addBoard() {
    setBoards((arr) => {
      const nextId = (arr[arr.length - 1] ?? 0) + 1;
      const next = [...arr, nextId];
      setTimeout(() => setFocused(nextId), 0);
      return next;
    });
  }
  function focusPrev() {
    const i = boards.indexOf(focused);
    if (i > 0) setFocused(boards[i - 1]);
  }
  function focusNext() {
    const i = boards.indexOf(focused);
    if (i < boards.length - 1) setFocused(boards[i + 1]);
  }
  function focusMain() {
    setFocused(0);
  }

  if (!hasWebGL) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-4 text-text-muted">
        <div className="text-2xl text-text-primary">2D-режим</div>
        <p>WebGL недоступен — 3D-сцена отключена. Аудио и доска работают.</p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full" onContextMenu={(e) => e.preventDefault()}>
      <Canvas
        shadows
        dpr={typeof window !== 'undefined' ? Math.min(window.devicePixelRatio ?? 1, lowQ ? 1 : 2) : 1}
        camera={{ position: [2, 0.6, 4.6], fov: 38 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
      >
        <color attach="background" args={[starry ? '#06081a' : '#0A0E1A']} />
        <fog attach="fog" args={[starry ? '#06081a' : '#0A0E1A', 12, 40]} />

        <ambientLight intensity={0.45} color={starry ? '#A78BFA' : '#ffffff'} />
        <directionalLight
          position={[-3, 4, 3]}
          intensity={1.1}
          color={starry ? '#A78BFA' : '#ffffff'}
          castShadow
          shadow-mapSize={[1024, 1024]}
        />
        <directionalLight position={[3, 4, 2]} intensity={0.6} color="#7AE7C7" />

        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.95, 0]} receiveShadow>
          <circleGeometry args={[40, 64]} />
          <meshStandardMaterial color={starry ? '#0a0d22' : '#0F1424'} roughness={0.95} />
        </mesh>
        <ContactShadows
          position={[0, -0.94, 0]}
          opacity={0.5}
          scale={12}
          blur={2.4}
          far={4}
          color="#000000"
        />

        {starry && <Stars radius={60} depth={40} count={2500} factor={2.4} fade speed={0.6} />}

        <CameraTweener controlsRef={orbitRef} focusedIdx={focused} />
        <OrbitControls
          ref={orbitRef as never}
          enableDamping
          dampingFactor={0.08}
          minDistance={1.6}
          maxDistance={11}
          minPolarAngle={Math.PI / 2.4}
          maxPolarAngle={Math.PI / 1.8}
          enablePan
          panSpeed={0.8}
          screenSpacePanning={false}
          mouseButtons={
            {
              LEFT: marker ? undefined : THREE.MOUSE.ROTATE,
              MIDDLE: THREE.MOUSE.DOLLY,
              RIGHT: THREE.MOUSE.PAN,
            } as unknown as { LEFT: THREE.MOUSE; MIDDLE: THREE.MOUSE; RIGHT: THREE.MOUSE }
          }
        />

        <Suspense
          fallback={
            <Html center>
              <div className="rounded-glass border border-white/10 bg-white/[0.04] px-4 py-2 text-text-muted backdrop-blur-glass">
                Загружаем 3D…
              </div>
            </Html>
          }
        >
          {avatarBroken ? (
            <Teacher3D action={avatarAction} audioEl={audioEl ?? null} />
          ) : (
            <Avatar
              url={avatarUrl}
              action={avatarAction}
              audioEl={audioEl ?? null}
              lowQuality={lowQ}
              onLoadFailure={() => setAvatarBroken(true)}
            />
          )}

          {boards.map((id, idx) => (
            <Blackboard
              key={id}
              ref={(h) => {
                boardHandles.current[id] = h;
              }}
              position={boardPosition(idx)}
            />
          ))}
          <Environment preset={starry ? 'night' : 'city'} background={false} />
        </Suspense>
      </Canvas>

      {showToolbar && (
        <div className="pointer-events-none absolute inset-0 flex flex-col">
          <div className="flex w-full items-start justify-between gap-2 p-2 md:p-3">
            <div className="pointer-events-auto flex flex-wrap items-center gap-1 rounded-glass border border-white/10 bg-bg-deep/60 p-1 text-text-muted backdrop-blur">
              <ToolBtn
                active={marker}
                onClick={() => setMarker((m) => !m)}
                title={marker ? 'Выключить фломастер' : 'Фломастер (Ctrl+Z — отмена, ПКМ — двигать)'}
              >
                <Pen size={14} strokeWidth={2} />
              </ToolBtn>
              {marker && (
                <>
                  <div className="mx-1 flex items-center gap-1">
                    {MARKER_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        aria-label={`цвет ${c}`}
                        className={
                          'h-4 w-4 rounded-full border ' +
                          (color === c
                            ? 'border-white/80 ring-2 ring-aurora-2/40'
                            : 'border-white/30')
                        }
                        style={{ background: c }}
                      />
                    ))}
                  </div>
                  <ToolBtn
                    onClick={() => {
                      const h = boardHandles.current[focused] ?? boardHandles.current[0];
                      h?.undoMarker();
                    }}
                    title="Отменить штрих (Ctrl+Z)"
                  >
                    <Undo2 size={14} strokeWidth={2} />
                  </ToolBtn>
                </>
              )}
              <ToolBtn
                onClick={() => {
                  const h = boardHandles.current[focused] ?? boardHandles.current[0];
                  h?.eraseUserStrokes();
                }}
                title="Стереть свои штрихи (теория сохраняется)"
              >
                <Eraser size={14} strokeWidth={2} />
              </ToolBtn>
            </div>

            <div className="pointer-events-auto flex items-center gap-1 rounded-glass border border-white/10 bg-bg-deep/60 p-1 text-text-muted backdrop-blur">
              <ToolBtn onClick={focusPrev} title="Предыдущая доска">
                <ChevronLeft size={14} strokeWidth={2} />
              </ToolBtn>
              <span className="px-1 font-mono text-[11px]">
                {boards.indexOf(focused) + 1}/{boards.length}
              </span>
              <ToolBtn onClick={focusNext} title="Следующая доска">
                <ChevronRight size={14} strokeWidth={2} />
              </ToolBtn>
              <ToolBtn onClick={focusMain} title="К главной доске (теория)" active={focused === 0}>
                <LayoutGrid size={14} strokeWidth={2} />
              </ToolBtn>
              <ToolBtn onClick={addBoard} title="Создать новую пустую доску">
                <Plus size={14} strokeWidth={2} />
              </ToolBtn>
            </div>

            <div className="pointer-events-auto flex items-center gap-1 rounded-glass border border-white/10 bg-bg-deep/60 p-1 text-text-muted backdrop-blur">
              <ToolBtn onClick={() => zoom(1)} title="Приблизить">
                <ZoomIn size={14} strokeWidth={2} />
              </ToolBtn>
              <ToolBtn onClick={() => zoom(-1)} title="Отдалить">
                <ZoomOut size={14} strokeWidth={2} />
              </ToolBtn>
              <ToolBtn onClick={() => setFocused(0)} title="Сбросить вид">
                <Maximize2 size={14} strokeWidth={2} />
              </ToolBtn>
            </div>
          </div>

          {marker && (
            <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-bg-deep/70 px-3 py-1 text-[11px] text-text-muted backdrop-blur">
              ЛКМ — рисовать · ПКМ — двигать камеру · Ctrl+Z — отменить штрих
            </div>
          )}
        </div>
      )}
    </div>
  );
});

function ToolBtn({
  children,
  onClick,
  active,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={
        'grid h-7 w-7 place-items-center rounded-md transition-colors ' +
        (active
          ? 'bg-aurora-2/30 text-text-primary'
          : 'hover:bg-white/[0.08] hover:text-text-primary')
      }
    >
      {children}
    </button>
  );
}
