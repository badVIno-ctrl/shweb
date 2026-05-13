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

export type MarkerShape = 'marker' | 'line' | 'triangle' | 'circle' | 'square' | 'rect';

export interface BlackboardHandle {
  exec: (cmd: BoardCommand) => void;
  reset: () => void;
  getCanvas: () => HTMLCanvasElement | null;
  getStateJson: () => string;
  loadState: (commands: BoardCommand[]) => void;
  setMarkerMode: (on: boolean) => void;
  setMarkerColor: (color: string) => void;
  setShape: (shape: MarkerShape) => void;
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
    start: { x: number; y: number } | null;
    base: ImageData | null;
    shift: boolean;
    snapshots: ImageData[];
  }>({ active: false, last: null, start: null, base: null, shift: false, snapshots: [] });
  /** Snapshot taken right after the last teacher command — the "theory" layer. */
  const theoryBaseRef = useRef<ImageData | null>(null);
  const markerOnRef = useRef(false);
  const colorRef = useRef('#FFE04B');
  const shapeRef = useRef<'marker' | 'line' | 'triangle' | 'circle' | 'square' | 'rect'>('marker');
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
    setShape: (s) => {
      shapeRef.current = s;
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

  /** Anti-aliased stroke style shared by marker and shape tools. */
  function applyStrokeStyle(ctx: CanvasRenderingContext2D): void {
    ctx.strokeStyle = colorRef.current;
    ctx.fillStyle = colorRef.current;
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = colorRef.current;
    ctx.shadowBlur = 10;
    ctx.imageSmoothingEnabled = true;
    (ctx as CanvasRenderingContext2D & { imageSmoothingQuality?: ImageSmoothingQuality })
      .imageSmoothingQuality = 'high';
  }

  /** Snap `p` to the 0°/45°/90° line anchored at `start` (for Shift-drag). */
  function snapStraight(
    start: { x: number; y: number },
    p: { x: number; y: number },
  ): { x: number; y: number } {
    const dx = p.x - start.x;
    const dy = p.y - start.y;
    const adx = Math.abs(dx);
    const ady = Math.abs(dy);
    // 45° diagonal when within the cone, otherwise snap to axis.
    const ratio = Math.min(adx, ady) / Math.max(adx, ady, 1);
    if (ratio > 0.4) {
      const m = Math.min(adx, ady);
      return { x: start.x + Math.sign(dx) * m, y: start.y + Math.sign(dy) * m };
    }
    return adx > ady
      ? { x: p.x, y: start.y }
      : { x: start.x, y: p.y };
  }

  /** Paint the selected shape from `start` to `end` on top of `base`. */
  function drawShape(
    ctx: CanvasRenderingContext2D,
    base: ImageData,
    start: { x: number; y: number },
    end: { x: number; y: number },
  ): void {
    ctx.putImageData(base, 0, 0);
    ctx.save();
    applyStrokeStyle(ctx);
    const shape = shapeRef.current;
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    switch (shape) {
      case 'line': {
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
        break;
      }
      case 'circle': {
        const cx = (start.x + end.x) / 2;
        const cy = (start.y + end.y) / 2;
        const r = Math.hypot(dx, dy) / 2;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
        break;
      }
      case 'square': {
        const side = Math.max(Math.abs(dx), Math.abs(dy));
        const x = start.x + (dx < 0 ? -side : 0);
        const y = start.y + (dy < 0 ? -side : 0);
        ctx.strokeRect(x, y, side, side);
        break;
      }
      case 'rect': {
        const x = Math.min(start.x, end.x);
        const y = Math.min(start.y, end.y);
        ctx.strokeRect(x, y, Math.abs(dx), Math.abs(dy));
        break;
      }
      case 'triangle': {
        ctx.beginPath();
        ctx.moveTo((start.x + end.x) / 2, start.y);
        ctx.lineTo(start.x, end.y);
        ctx.lineTo(end.x, end.y);
        ctx.closePath();
        ctx.stroke();
        break;
      }
      default:
        break;
    }
    ctx.restore();
  }

  function onDown(e: ThreeEvent<PointerEvent>) {
    if (!markerOnRef.current || !e.uv || !boardRef.current) return;
    e.stopPropagation();
    pushSnapshot();
    const p = uvToPx(e.uv);
    drawingRef.current.active = true;
    drawingRef.current.last = p;
    drawingRef.current.start = p;
    drawingRef.current.shift = !!(e.nativeEvent as PointerEvent).shiftKey;
    // For shape tools we need the pre-draw pixels to redraw preview each frame.
    if (shapeRef.current !== 'marker') {
      const c = boardRef.current;
      drawingRef.current.base = c.ctx.getImageData(0, 0, c.canvas.width, c.canvas.height);
    }
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
    drawingRef.current.shift = !!(e.nativeEvent as PointerEvent).shiftKey;
    const ctx = boardRef.current.ctx;
    let p = uvToPx(e.uv);
    const start = drawingRef.current.start;
    const shape = shapeRef.current;

    if (shape === 'marker') {
      // Freehand stroke; Shift forces a straight segment from the anchor.
      if (start && drawingRef.current.shift) p = snapStraight(start, p);
      const last = drawingRef.current.last;
      ctx.save();
      applyStrokeStyle(ctx);
      ctx.beginPath();
      if (last) ctx.moveTo(last.x, last.y);
      else ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      ctx.restore();
      drawingRef.current.last = p;
    } else if (start && drawingRef.current.base) {
      // Live shape preview: restore base + re-render the shape.
      const end = drawingRef.current.shift ? snapStraight(start, p) : p;
      drawShape(ctx, drawingRef.current.base, start, end);
    }
    if (textureRef.current) textureRef.current.needsUpdate = true;
  }
  function onUp() {
    drawingRef.current.active = false;
    drawingRef.current.last = null;
    drawingRef.current.start = null;
    drawingRef.current.base = null;
    drawingRef.current.shift = false;
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
