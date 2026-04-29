'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { Scene3D } from '@/components/Scene3D';
import { GlassPanel } from '@/components/GlassPanel';
import { GlassButton } from '@/components/GlassButton';
import type { BlackboardHandle } from '@/components/Blackboard';
import type { AvatarAction, BoardCommand } from '@/lib/types';
import { clientSpeak } from '@/lib/tts';
import { Play } from 'lucide-react';

const AVATAR_URL =
  process.env.NEXT_PUBLIC_DEFAULT_AVATAR ?? 'https://models.readyplayer.me/64bfa15f0e72c63d7c3934a6.glb';

interface ShareData {
  uuid: string;
  lesson?: { title: string; slug: string };
  commands: BoardCommand[];
  intro?: string;
}

export default function SharePage() {
  const { uuid } = useParams<{ uuid: string }>();
  const [data, setData] = useState<ShareData | null>(null);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [action, setAction] = useState<AvatarAction>('idle');
  const ref = useRef<BlackboardHandle>(null);
  const [welcomed, setWelcomed] = useState(false);

  useEffect(() => {
    if (!uuid) return;
    fetch(`/api/share/${uuid}`)
      .then((r) => r.json())
      .then((d: ShareData) => setData(d))
      .catch(() => undefined);
  }, [uuid]);

  useEffect(() => {
    if (data && ref.current) {
      ref.current.loadState(data.commands ?? []);
    }
  }, [data]);

  async function welcome() {
    if (!data || welcomed) return;
    setWelcomed(true);
    setAction('wave');
    const text =
      data.intro ??
      `Привет! Расскажу с того места, где вы остановились — урок «${data.lesson?.title ?? 'математика'}».`;
    const h = await clientSpeak(text, { rate: 1 });
    setAudio(h.audio ?? null);
    setAction('explain');
    await h.ended;
    setAction('idle');
    setAudio(null);
  }

  return (
    <div className="fixed inset-0">
      <Scene3D ref={ref} avatarUrl={AVATAR_URL} avatarAction={action} audioEl={audio} />
      <div className="absolute inset-x-0 top-4 z-10 flex justify-center px-4">
        <GlassPanel className="flex items-center gap-3" padding="md">
          <div className="font-display text-lg">
            {data?.lesson?.title ?? 'Доска поделена'}
          </div>
          <GlassButton size="sm" variant="gold" onClick={welcome} disabled={welcomed}>
            <Play size={18} strokeWidth={1.5} />
            {welcomed ? 'Идёт…' : 'Послушать продолжение'}
          </GlassButton>
        </GlassPanel>
      </div>
    </div>
  );
}
