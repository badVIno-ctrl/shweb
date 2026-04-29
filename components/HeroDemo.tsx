'use client';

import { useEffect, useRef, useState } from 'react';
import type { BlackboardHandle } from './Blackboard';
import type { AvatarAction } from '@/lib/types';
import { Scene3D } from './Scene3D';
import { clientSpeak } from '@/lib/tts';

const AVATAR_URL =
  process.env.NEXT_PUBLIC_DEFAULT_AVATAR ?? 'https://models.readyplayer.me/64bfa15f0e72c63d7c3934a6.glb';

export function HeroDemo() {
  const ref = useRef<BlackboardHandle>(null);
  const [action, setAction] = useState<AvatarAction>('wave');
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    const t = setTimeout(async () => {
      ref.current?.exec({ action: 'write_text', text: 'Привет!' });
      const h = await clientSpeak('Привет! Я ваш 3D учитель профматана.', { rate: 1 });
      if (h.audio) setAudio(h.audio);
      setAction('explain');
      await h.ended;
      setAction('idle');
    }, 800);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="relative h-full w-full">
      <Scene3D ref={ref} avatarUrl={AVATAR_URL} avatarAction={action} audioEl={audio} />
    </div>
  );
}
