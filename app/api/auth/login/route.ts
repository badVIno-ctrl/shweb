import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, verifyPassword } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const ADMIN_NAME = 'badvino';
const ADMIN_PASSWORD = '26041986';
const ADMIN_EMAIL = 'badvino@viora.academy';

interface RawUser {
  id: string;
  email: string;
  name: string;
  plan: string;
  role: string | null;
  passwordHash: string | null;
}

async function findUserRaw(idOrEmail: string): Promise<RawUser | null> {
  const isEmail = idOrEmail.includes('@');
  const sql = isEmail
    ? 'SELECT id, email, name, plan, role, "passwordHash" FROM "User" WHERE email = $1 LIMIT 1'
    : 'SELECT id, email, name, plan, role, "passwordHash" FROM "User" WHERE name = $1 LIMIT 1';
  const arg = isEmail ? idOrEmail.toLowerCase() : idOrEmail;
  try {
    const rows = await prisma.$queryRawUnsafe<RawUser[]>(sql, arg);
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

function makeId(): string {
  // CUID-ish: c + 24 random alphanumerics — good enough for a unique id; Prisma
  // schema uses cuid() but raw INSERT can't call helper, so we generate here.
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let s = 'c';
  for (let i = 0; i < 24; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return s;
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    email?: string;
    login?: string;
    password?: string;
  };
  const password = body.password ?? '';
  const id = (body.login ?? body.email ?? '').trim();
  if (!id || !password) {
    return NextResponse.json({ error: 'логин и пароль обязательны' }, { status: 400 });
  }

  const isAdminAttempt =
    (id === ADMIN_NAME || id.toLowerCase() === ADMIN_EMAIL) && password === ADMIN_PASSWORD;

  let user = await findUserRaw(id);

  // Bootstrap admin row if missing
  if (!user && isAdminAttempt) {
    const hash = await hashPassword(ADMIN_PASSWORD);
    const newId = makeId();
    const now = new Date().toISOString();
    await prisma.$executeRawUnsafe(
      `INSERT INTO "User" (id, email, name, plan, role, streak, "passwordHash", "lastActive", "createdAt")
       VALUES ($1, $2, $3, 'pro', 'admin', 0, $4, $5::timestamp, $6::timestamp)`,
      newId,
      ADMIN_EMAIL,
      ADMIN_NAME,
      hash,
      now,
      now,
    );
    user = await findUserRaw(ADMIN_NAME);
  }

  // Repair admin password if mismatched
  if (user && isAdminAttempt) {
    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      const hash = await hashPassword(ADMIN_PASSWORD);
      await prisma.$executeRawUnsafe(
        `UPDATE "User" SET "passwordHash" = $1, plan = 'pro', role = 'admin', name = $2 WHERE id = $3`,
        hash,
        ADMIN_NAME,
        user.id,
      );
      user = await findUserRaw(ADMIN_NAME);
    } else {
      // Make sure role/plan are correct even on a successful match
      await prisma.$executeRawUnsafe(
        `UPDATE "User" SET plan = 'pro', role = 'admin' WHERE id = $1`,
        user.id,
      );
    }
  }

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json({ error: 'неверный логин или пароль' }, { status: 401 });
  }

  // Update lastActive (best effort)
  await prisma.$executeRawUnsafe(
    `UPDATE "User" SET "lastActive" = $1::timestamp WHERE id = $2`,
    new Date().toISOString(),
    user.id,
  ).catch(() => undefined);

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      plan: user.plan,
      role: user.role ?? 'user',
    },
  });
}
