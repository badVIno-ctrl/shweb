'use client';

import {
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  forwardRef,
  useState,
} from 'react';
import * as THREE from 'three';
import { ThreeEvent } from '@react-three/fiber';
import {
  createBoardCanvas,
  renderBoardCommand,
  resetBoard,
  type BoardCanvas,
} from '@/lib/board-renderer';
import type { BoardCommand } from '@/lib/types';

export interface BlackboardHandle {
  exec: (cmd: BoardCommand) => void;
  reset: () => void;
  getCanvas: () => HTMLCanvasElement | null;
  getStateJson: () => string;
  loadState: (commands: BoardCommand[]) => void;
  setMarkerMode: (on: boolean) => void;
  setMarkerColor: (color: string) => void;
  undoMarker: () => void;
  /** Wipe ONLY user marker strokes; keep teacher's theory drawings intact. */
  eraseUserStrokes: () => void;
}

interface BlackboardProps {
  onCommandExec?: (cmd: BoardCommand) => void;
  /** Position of the board group inside the 3D scene. */
  position?: [number, number, number];
}

const BOARD_W = 4;
const BOARD_H = 2.5;
const TEX_W = 1600;
const TEX_H = 1000;

/** A 4×2.5m blackboard plane plus a slot for an extruded 3D solid in front. */
export const Blackboard = forwardRef<BlackboardHandle, BlackboardProps>(function Blackboard(
  { onCommandExec, position = [2, 0.6, -0.4] },
  ref,
) {
  const boardRef = useRef<BoardCanvas | null>(null);
  const textureRef = useRef<THREE.CanvasTexture | null>(null);
  const solidGroupRef = useRef<THREE.Group>(null);
  const commandsRef = useRef<BoardCommand[]>([]);
  const drawingRef = useRef<{
    active: boolean;
    last: { x: number; y: number } | null;
    snapshots: ImageData[];
  }>({ active: false, last: null, snapshots: [] });
  /** Snapshot taken right after the last teacher command — the "theory" layer. */
  const theoryBaseRef = useRef<ImageData | null>(null);
  const markerOnRef = useRef(false);
  const colorRef = useRef('#FFD86B');
  const [, force] = useState(0);

  const [boardCanvas, texture] = useMemo(() => {
    if (typeof document === 'undefined') return [null, null] as const;
    const c = createBoardCanvas(TEX_W, TEX_H);
    const t = new THREE.CanvasTexture(c.canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    boardRef.current = c;
    textureRef.current = t;
    return [c, t] as const;
  }, []);

  useImperativeHandle(ref, () => ({
    exec: (cmd) => {
      if (!boardRef.current) return;
      commandsRef.current.push(cmd);
      renderBoardCommand(boardRef.current, cmd);
      if (textureRef.current) textureRef.current.needsUpdate = true;
      if (cmd.action === 'draw_3d_solid') spawnSolid(solidGroupRef.current, cmd);
      else if (cmd.action === 'erase' && !cmd.region) clearSolid(solidGroupRef.current);
      // Refresh "theory" base layer so future user-stroke erase keeps this content.
      const c = boardRef.current;
      theoryBaseRef.current = c.ctx.getImageData(0, 0, c.canvas.width, c.canvas.height);
      drawingRef.current.snapshots = [];
      onCommandExec?.(cmd);
    },
    reset: () => {
      if (!boardRef.current) return;
      resetBoard(boardRef.current);
      if (textureRef.current) textureRef.current.needsUpdate = true;
      commandsRef.current = [];
      drawingRef.current.snapshots = [];
      const c = boardRef.current;
      theoryBaseRef.current = c.ctx.getImageData(0, 0, c.canvas.width, c.canvas.height);
      clearSolid(solidGroupRef.current);
    },
    eraseUserStrokes: () => {
      const c = boardRef.current;
      const base = theoryBaseRef.current;
      if (!c) return;
      if (base) {
        c.ctx.putImageData(base, 0, 0);
      } else {
        resetBoard(c);
      }
      drawingRef.current.snapshots = [];
      if (textureRef.current) textureRef.current.needsUpdate = true;
    },
    getCanvas: () => boardRef.current?.canvas ?? null,
    getStateJson: () => JSON.stringify(commandsRef.current),
    loadState: (commands) => {
      if (!boardRef.current) return;
      resetBoard(boardRef.current);
      commandsRef.current = [];
      clearSolid(solidGroupRef.current);
      for (const c of commands) {
        commandsRef.current.push(c);
        renderBoardCommand(boardRef.current, c);
        if (c.action === 'draw_3d_solid') spawnSolid(solidGroupRef.current, c);
      }
      if (textureRef.current) textureRef.current.needsUpdate = true;
      const cc = boardRef.current;
      theoryBaseRef.current = cc.ctx.getImageData(0, 0, cc.canvas.width, cc.canvas.height);
    },
    setMarkerMode: (on) => {
      markerOnRef.current = on;
      force((n) => n + 1);
    },
    setMarkerColor: (color) => {
      colorRef.current = color;
    },
    undoMarker: () => {
      const c = boardRef.current;
      const snaps = drawingRef.current.snapshots;
      if (!c || snaps.length === 0) return;
      const last = snaps.pop()!;
      c.ctx.putImageData(last, 0, 0);
      if (textureRef.current) textureRef.current.needsUpdate = true;
    },
  }));

  useEffect(() => () => {
    textureRef.current?.dispose();
  }, []);

  function uvToPx(uv: THREE.Vector2): { x: number; y: number } {
    return { x: uv.x * TEX_W, y: (1 - uv.y) * TEX_H };
  }

  function pushSnapshot() {
    const c = boardRef.current;
    if (!c) return;
    const snap = c.ctx.getImageData(0, 0, c.canvas.width, c.canvas.height);
    drawingRef.current.snapshots.push(snap);
    if (drawingRef.current.snapshots.length > 30) drawingRef.current.snapshots.shift();
  }

  function onDown(e: ThreeEvent<PointerEvent>) {
    if (!markerOnRef.current || !e.uv || !boardRef.current) return;
    e.stopPropagation();
    pushSnapshot();
    drawingRef.current.active = true;
    drawingRef.current.last = uvToPx(e.uv);
  }
  function onMove(e: ThreeEvent<PointerEvent>) {
    if (
      !markerOnRef.current ||
      !drawingRef.current.active ||
      !e.uv ||
      !boardRef.current
    )
      return;
    e.stopPropagation();
    const p = uvToPx(e.uv);
    const last = drawingRef.current.last;
    const ctx = boardRef.current.ctx;
    ctx.save();
    ctx.strokeStyle = colorRef.current;
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = colorRef.current;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    if (last) ctx.moveTo(last.x, last.y);
    else ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    ctx.restore();
    drawingRef.current.last = p;
    if (textureRef.current) textureRef.current.needsUpdate = true;
  }
  function onUp() {
    drawingRef.current.active = false;
    drawingRef.current.last = null;
  }

  if (!texture) return null;

  return (
    <group position={position}>
      {/* Frame */}
      <mesh position={[0, 0, -0.06]}>
        <boxGeometry args={[BOARD_W + 0.3, BOARD_H + 0.3, 0.1]} />
        <meshStandardMaterial color="#1a1f33" roughness={0.6} metalness={0.05} />
      </mesh>
      {/* Surface (also receives marker pointer events) */}
      <mesh
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={onUp}
      >
        <planeGeometry args={[BOARD_W, BOARD_H]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
      {/* 3D solid slot in front of board */}
      <group ref={solidGroupRef} position={[1.4, -0.8, 0.6]} />
    </group>
  );
});

function spawnSolid(
  group: THREE.Group | null,
  cmd: Extract<BoardCommand, { action: 'draw_3d_solid' }>,
): void {
  if (!group) return;
  clearSolid(group);
  const mat = new THREE.MeshStandardMaterial({
    color: '#A78BFA',
    metalness: 0.1,
    roughness: 0.4,
    transparent: true,
    opacity: 0.85,
    flatShading: true,
  });
  const wireMat = new THREE.LineBasicMaterial({ color: '#7AE7C7' });
  let geo: THREE.BufferGeometry;
  switch (cmd.shape) {
    case 'pyramid':
      geo = new THREE.ConeGeometry(0.5, cmd.height ?? 1.2, cmd.sides ?? 4, 1);
      break;
    case 'cube':
      geo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
      break;
    case 'sphere':
      geo = new THREE.SphereGeometry(0.5, 32, 16);
      break;
    case 'cone':
      geo = new THREE.ConeGeometry(0.5, cmd.height ?? 1, 32, 1);
      break;
    case 'cylinder':
      geo = new THREE.CylinderGeometry(0.5, 0.5, cmd.height ?? 1, 32);
      break;
  }
  const mesh = new THREE.Mesh(geo, mat);
  mesh.userData.profmath = 'solid';
  group.add(mesh);
  const wire = new THREE.LineSegments(new THREE.EdgesGeometry(geo), wireMat);
  wire.userData.profmath = 'solid';
  group.add(wire);
  mesh.scale.setScalar(0.001);
  const start = performance.now();
  const tick = () => {
    const t = Math.min(1, (performance.now() - start) / 600);
    const s = 0.001 + (1 - 0.001) * easeOutCubic(t);
    mesh.scale.setScalar(s);
    wire.scale.setScalar(s);
    if (t < 1) requestAnimationFrame(tick);
  };
  tick();
}

function clearSolid(group: THREE.Group | null): void {
  if (!group) return;
  const toRemove = group.children.filter((c) => c.userData.profmath === 'solid');
  for (const c of toRemove) {
    group.remove(c);
    const m = c as THREE.Mesh | THREE.LineSegments;
    if ('geometry' in m && m.geometry) m.geometry.dispose();
    const mat = (m as THREE.Mesh).material;
    if (mat) {
      if (Array.isArray(mat)) mat.forEach((mm) => mm.dispose());
      else (mat as THREE.Material).dispose();
    }
  }
}

function easeOutCubic(x: number): number {
  return 1 - Math.pow(1 - x, 3);
}
