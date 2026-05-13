import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';

export const dynamic = 'force-dynamic';

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

  // Email uniqueness — Prisma Client works on any provider (SQLite/Postgres/...).
  const existing = await prisma.user.findUnique({
    where: { email: lcEmail },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json({ error: 'аккаунт уже существует' }, { status: 409 });
  }

  const hash = await hashPassword(password);
  const created = await prisma.user.create({
    data: {
      email: lcEmail,
      name: trimmedName,
      plan: 'free',
      role: 'user',
      streak: 0,
      passwordHash: hash,
    },
  });

  return NextResponse.json({
    user: {
      id: created.id,
      name: created.name,
      email: created.email,
      plan: created.plan,
      role: created.role,
    },
  });
}
