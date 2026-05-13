import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, verifyPassword } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const ADMIN_NAME = 'badvino';
const ADMIN_PASSWORD = '26041986';
const ADMIN_EMAIL = 'badvino@viora.academy';

/**
 * Find user by either email (contains '@') or by username (`name`).
 * Uses Prisma Client API so this works across SQLite / Postgres / MySQL —
 * raw SQL with `$1::timestamp` casts is Postgres-only and breaks on SQLite.
 */
async function findUser(idOrEmail: string) {
  const isEmail = idOrEmail.includes('@');
  return prisma.user.findFirst({
    where: isEmail
      ? { email: idOrEmail.toLowerCase() }
      : { name: idOrEmail },
    select: {
      id: true,
      email: true,
      name: true,
      plan: true,
      role: true,
      passwordHash: true,
    },
  });
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

  let user = await findUser(id);

  // Bootstrap admin row if missing — handy for fresh DBs that haven't been seeded.
  if (!user && isAdminAttempt) {
    const hash = await hashPassword(ADMIN_PASSWORD);
    await prisma.user.create({
      data: {
        email: ADMIN_EMAIL,
        name: ADMIN_NAME,
        plan: 'pro',
        role: 'admin',
        streak: 0,
        passwordHash: hash,
      },
    });
    user = await findUser(ADMIN_NAME);
  }

  // Repair admin password / role if the row exists but credentials drifted.
  if (user && isAdminAttempt) {
    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      const hash = await hashPassword(ADMIN_PASSWORD);
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: hash, plan: 'pro', role: 'admin', name: ADMIN_NAME },
      });
      user = await findUser(ADMIN_NAME);
    } else {
      await prisma.user.update({
        where: { id: user.id },
        data: { plan: 'pro', role: 'admin' },
      });
    }
  }

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    // Diagnostic: write all login state to a file the dev can inspect.
    try {
      const fs = await import('fs');
      const path = await import('path');
      const computed = await hashPassword(password);
      const dump = {
        when: new Date().toISOString(),
        input: id,
        passwordTried: password,
        foundUser: user
          ? { id: user.id, name: user.name, email: user.email, plan: user.plan, role: user.role }
          : null,
        passwordHashStored: user?.passwordHash ?? null,
        passwordHashComputed: computed,
        saltUsed: process.env.NEXTAUTH_SECRET ?? 'vsa-salt',
      };
      fs.writeFileSync(path.join(process.cwd(), 'login-debug.json'), JSON.stringify(dump, null, 2));
    } catch {
      /* ignore — diagnostic only */
    }
    return NextResponse.json({ error: 'неверный логин или пароль' }, { status: 401 });
  }

  // Best-effort lastActive bump — failure must not block login.
  await prisma.user
    .update({ where: { id: user.id }, data: { lastActive: new Date() } })
    .catch(() => undefined);

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
