import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const { lessonId, stateJson } = (await req.json().catch(() => ({}))) as {
    lessonId?: string;
    stateJson?: string;
    sceneIndex?: number;
  };
  if (!stateJson) return NextResponse.json({ error: 'stateJson required' }, { status: 400 });
  const user = await getCurrentUser().catch(() => null);
  const snap = await prisma.boardSnapshot.create({
    data: {
      uuid: uuidv4(),
      userId: user?.id ?? null,
      lessonId: lessonId ?? null,
      stateJson,
    },
  });
  return NextResponse.json({ uuid: snap.uuid });
}
