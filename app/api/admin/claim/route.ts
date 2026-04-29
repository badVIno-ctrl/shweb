import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { forceRoleAndPlan, getRoleAndPlan } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const ADMIN_PASSWORD = process.env.ADMIN_MASTER_PASSWORD ?? '26041986';

/**
 * Promote the calling user (identified by x-user-id) to admin if they provide
 * the master password. This is the escape-hatch used by the cabinet's
 * "Активировать админ-доступ" button when login self-heal didn't promote.
 */
export async function POST(req: Request) {
  const userId = headers().get('x-user-id');
  if (!userId) return NextResponse.json({ error: 'не авторизован' }, { status: 401 });

  const { password } = (await req.json().catch(() => ({}))) as { password?: string };
  if (!password) return NextResponse.json({ error: 'нужен пароль' }, { status: 400 });
  if (password !== ADMIN_PASSWORD)
    return NextResponse.json({ error: 'неверный пароль' }, { status: 403 });

  const u = await prisma.user.findUnique({ where: { id: userId } });
  if (!u) return NextResponse.json({ error: 'пользователь не найден' }, { status: 404 });

  await forceRoleAndPlan(u.id, 'admin', 'pro');
  const rp = await getRoleAndPlan(u.id);

  return NextResponse.json({
    user: {
      id: u.id,
      name: u.name,
      email: u.email,
      plan: rp.plan,
      role: rp.role,
    },
  });
}
