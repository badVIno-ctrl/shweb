import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

interface RawUser {
  id: string;
  email: string;
  name: string;
  plan: string;
  role: string | null;
  streak: number;
  createdAt: string;
  lastActive: string;
}

export async function GET() {
  try {
    await requireAdmin();
  } catch (e) {
    return e instanceof Response ? e : NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const users = await prisma.$queryRawUnsafe<RawUser[]>(
    `SELECT id, email, name, plan, role, streak, "createdAt", "lastActive"
       FROM "User"
       ORDER BY "createdAt" DESC`,
  );

  // attempts/progress aggregates
  const attempts = await prisma.$queryRawUnsafe<Array<{ userId: string; n: number }>>(
    'SELECT "userId", COUNT(*)::int as n FROM "Attempt" GROUP BY "userId"',
  );
  const aMap = new Map(attempts.map((a) => [a.userId, Number(a.n)]));

  const progress = await prisma.$queryRawUnsafe<Array<{ userId: string; n: number }>>(
    'SELECT "userId", COUNT(*)::int as n FROM "Progress" GROUP BY "userId"',
  );
  const pMap = new Map(progress.map((p) => [p.userId, Number(p.n)]));

  return NextResponse.json({
    users: users.map((u) => ({
      ...u,
      role: u.role ?? 'user',
      attempts: aMap.get(u.id) ?? 0,
      lessonsTouched: pMap.get(u.id) ?? 0,
    })),
  });
}
