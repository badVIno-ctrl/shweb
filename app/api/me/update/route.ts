import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, hashPassword, verifyPassword } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.name === 'Гость') {
    return NextResponse.json({ error: 'нужно войти' }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as {
    name?: string;
    oldPassword?: string;
    newPassword?: string;
  };

  // Password change branch
  if (body.newPassword) {
    if (body.newPassword.length < 6) {
      return NextResponse.json({ error: 'мин. 6 символов' }, { status: 400 });
    }
    const cur = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, passwordHash: true },
    });
    if (!cur) return NextResponse.json({ error: 'юзер не найден' }, { status: 404 });
    if (cur.passwordHash) {
      const ok = await verifyPassword(body.oldPassword ?? '', cur.passwordHash);
      if (!ok) return NextResponse.json({ error: 'неверный текущий пароль' }, { status: 401 });
    }
    const hash = await hashPassword(body.newPassword);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: hash } });
    return NextResponse.json({ ok: true });
  }

  // Profile update branch (name only for now)
  if (body.name) {
    const trimmed = body.name.trim();
    if (trimmed.length < 1 || trimmed.length > 32) {
      return NextResponse.json({ error: 'ник: 1–32 символа' }, { status: 400 });
    }
    await prisma.user.update({ where: { id: user.id }, data: { name: trimmed } });
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: trimmed,
        plan: user.plan,
        role: user.role,
      },
    });
  }

  return NextResponse.json({ error: 'нечего обновлять' }, { status: 400 });
}
