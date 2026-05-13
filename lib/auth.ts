// Minimal demo auth. Real auth would use NextAuth + sessions; for the demo we
// pass the user id via the `x-user-id` header (set client-side from localStorage).
import { headers } from 'next/headers';
import { prisma } from './prisma';
import { sha256Hex } from './utils';

// Fixed salt — keeps password hashes stable between seed and runtime regardless
// of which terminal / env-loading path was used. NOT real security; this is a
// demo deployment. For production, switch to bcrypt/argon2 + per-user salt.
const PWD_SALT = 'vsa-fixed-salt-do-not-change';

export async function hashPassword(plain: string): Promise<string> {
  return sha256Hex(`${PWD_SALT}::${plain}`);
}

export async function verifyPassword(plain: string, hash: string | null): Promise<boolean> {
  if (!hash) return false;
  return (await hashPassword(plain)) === hash;
}

export interface AppUser {
  id: string;
  email: string;
  name: string;
  plan: string;
  role: string;
  streak: number;
  lastActive?: Date;
  createdAt?: Date;
}

/**
 * Read role+plan via Prisma Client. Works on any provider (SQLite/Postgres/...).
 * Falls back to safe defaults if the row is missing or the client is mid-generate.
 */
export async function getRoleAndPlan(userId: string): Promise<{ role: string; plan: string }> {
  try {
    const u = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, plan: true },
    });
    return {
      role: u?.role ?? 'user',
      plan: u?.plan ?? 'free',
    };
  } catch {
    return { role: 'user', plan: 'free' };
  }
}

/** Force a user's role/plan. Used by admin self-heal and demo guard. */
export async function forceRoleAndPlan(
  userId: string,
  role: string,
  plan: string,
): Promise<void> {
  await prisma.user.update({ where: { id: userId }, data: { role, plan } });
}

export async function getCurrentUser(): Promise<AppUser> {
  let userId: string | null = null;
  try {
    userId = headers().get('x-user-id');
  } catch {
    /* not in a request scope — fall through to demo user */
  }

  if (userId) {
    const u = await prisma.user.findUnique({ where: { id: userId } });
    if (u) {
      await prisma.user
        .update({ where: { id: u.id }, data: { lastActive: new Date() } })
        .catch(() => undefined);
      const rp = await getRoleAndPlan(u.id);
      return {
        id: u.id,
        email: u.email,
        name: u.name,
        plan: rp.plan,
        role: rp.role,
        streak: u.streak,
        lastActive: u.lastActive,
        createdAt: u.createdAt,
      };
    }
  }

  // Anonymous fallback: read-only demo user (free plan).
  const demo = await prisma.user.upsert({
    where: { email: 'demo@viora.academy' },
    update: { lastActive: new Date() },
    create: {
      email: 'demo@viora.academy',
      name: 'Гость',
      plan: 'free',
      streak: 0,
    },
  });
  // Ensure demo is not admin and is on free plan, regardless of past state.
  await forceRoleAndPlan(demo.id, 'user', 'free').catch(() => undefined);
  return {
    id: demo.id,
    email: demo.email,
    name: demo.name,
    plan: 'free',
    role: 'user',
    streak: demo.streak,
    lastActive: demo.lastActive,
    createdAt: demo.createdAt,
  };
}

export async function requireAdmin(): Promise<AppUser> {
  const u = await getCurrentUser();
  if (u.role !== 'admin') {
    throw new Response('forbidden', { status: 403 });
  }
  return u;
}
