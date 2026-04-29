import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function PATCH(req: Request, ctx: { params: { id: string } }) {
  try {
    await requireAdmin();
  } catch (e) {
    return e instanceof Response ? e : NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const { plan, role, name } = (await req.json().catch(() => ({}))) as {
    plan?: string;
    role?: string;
    name?: string;
  };
  const cols: string[] = [];
  const args: unknown[] = [];
  if (plan && ['free', 'pro', 'family'].includes(plan)) {
    cols.push('plan');
    args.push(plan);
  }
  if (role && ['user', 'admin'].includes(role)) {
    cols.push('role');
    args.push(role);
  }
  if (typeof name === 'string' && name.trim().length > 0) {
    cols.push('name');
    args.push(name.trim());
  }
  if (cols.length === 0) {
    return NextResponse.json({ error: 'нечего менять' }, { status: 400 });
  }
  // Postgres-style numbered placeholders: col1 = $1, col2 = $2 …, id = $N+1.
  const setClause = cols.map((c, i) => `"${c}" = $${i + 1}`).join(', ');
  args.push(ctx.params.id);
  await prisma.$executeRawUnsafe(
    `UPDATE "User" SET ${setClause} WHERE id = $${cols.length + 1}`,
    ...args,
  );
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: { params: { id: string } }) {
  try {
    await requireAdmin();
  } catch (e) {
    return e instanceof Response ? e : NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  // Cascade-delete dependent rows manually since SQLite migrations don't always
  // wire ON DELETE CASCADE consistently.
  await prisma.$executeRawUnsafe('DELETE FROM "Attempt" WHERE "userId" = $1', ctx.params.id).catch(() => undefined);
  await prisma.$executeRawUnsafe('DELETE FROM "Progress" WHERE "userId" = $1', ctx.params.id).catch(() => undefined);
  await prisma.$executeRawUnsafe('DELETE FROM "ChatMessage" WHERE "userId" = $1', ctx.params.id).catch(() => undefined);
  await prisma.$executeRawUnsafe('DELETE FROM "BoardSnapshot" WHERE "userId" = $1', ctx.params.id).catch(() => undefined);
  await prisma.$executeRawUnsafe('DELETE FROM "User" WHERE id = $1', ctx.params.id);
  return NextResponse.json({ ok: true });
}
