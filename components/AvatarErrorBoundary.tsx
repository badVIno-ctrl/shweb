'use client';

import * as React from 'react';

interface State {
  failed: boolean;
}

/** Catches GLTF/network errors from <Avatar/> so the rest of the scene keeps rendering. */
export class AvatarErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  State
> {
  state: State = { failed: false };
  static getDerivedStateFromError(): State {
    return { failed: true };
  }
  componentDidCatch(err: unknown) {
    console.warn('[Avatar] failed to load — using placeholder.', err);
  }
  render() {
    if (this.state.failed) return this.props.fallback;
    return this.props.children;
  }
}

/** Stylised placeholder used when the GLB fails to load. */
export function AvatarPlaceholder() {
  return (
    <group position={[-1.6, -0.9, 0]} rotation={[0, 0.25, 0]}>
      {/* head */}
      <mesh position={[0, 1.55, 0]} castShadow>
        <sphereGeometry args={[0.18, 32, 24]} />
        <meshStandardMaterial color="#A78BFA" roughness={0.4} metalness={0.2} />
      </mesh>
      {/* torso */}
      <mesh position={[0, 1.0, 0]} castShadow>
        <capsuleGeometry args={[0.22, 0.7, 6, 16]} />
        <meshStandardMaterial color="#7AE7C7" roughness={0.6} />
      </mesh>
      {/* legs */}
      <mesh position={[0, 0.25, 0]} castShadow>
        <capsuleGeometry args={[0.18, 0.6, 6, 16]} />
        <meshStandardMaterial color="#1a1f33" roughness={0.8} />
      </mesh>
    </group>
  );
}
