import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';

export const dynamic = 'force-dynamic';

interface RawCount {
  c: number;
}

function makeId(): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let s = 'c';
  for (let i = 0; i < 24; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return s;
}

export async function POST(req: Request) {
  const { email, name, password } = (await req.json().catch(() => ({}))) as {
    email?: string;
    name?: string;
    password?: string;
  };
  if (!email || !name || !password)
    return NextResponse.json({ error: 'email, name и пароль обязательны' }, { status: 400 });
  if (password.length < 6)
    return NextResponse.json({ error: 'пароль должен быть не короче 6 символов' }, { status: 400 });

  const lcEmail = email.toLowerCase().trim();
  const trimmedName = name.trim();

  // Uniqueness check on email
  const existing = await prisma.$queryRawUnsafe<RawCount[]>(
    'SELECT COUNT(*)::int as c FROM "User" WHERE email = $1',
    lcEmail,
  );
  if ((existing[0]?.c ?? 0) > 0) {
    return NextResponse.json({ error: 'аккаунт уже существует' }, { status: 409 });
  }

  const id = makeId();
  const hash = await hashPassword(password);
  const now = new Date().toISOString();
  await prisma.$executeRawUnsafe(
    `INSERT INTO "User" (id, email, name, plan, role, streak, "passwordHash", "lastActive", "createdAt")
     VALUES ($1, $2, $3, 'free', 'user', 0, $4, $5::timestamp, $6::timestamp)`,
    id,
    lcEmail,
    trimmedName,
    hash,
    now,
    now,
  );

  return NextResponse.json({
    user: {
      id,
      name: trimmedName,
      email: lcEmail,
      plan: 'free',
      role: 'user',
    },
  });
}
