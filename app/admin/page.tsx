'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Crown,
  Search,
  Trash2,
  ShieldCheck,
  ShieldOff,
  Star,
  StarOff,
  RefreshCw,
  Users,
  Activity,
  Lock,
} from 'lucide-react';
import { GlassPanel } from '@/components/GlassPanel';
import { GlassButton } from '@/components/GlassButton';
import { apiFetch, getStoredUser } from '@/lib/api';
import { cn } from '@/lib/utils';

interface AdminUser {
  id: string;
  email: string;
  name: string;
  plan: string;
  role: string;
  streak: number;
  attempts: number;
  lessonsTouched: number;
  createdAt: string;
  lastActive: string;
}

export default function AdminPage() {
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState('');

  async function load() {
    setBusy(true);
    setError(null);
    try {
      const r = await apiFetch('/api/admin/users');
      if (!r.ok) {
        if (r.status === 403) setError('forbidden');
        else setError(`Ошибка ${r.status}`);
        setUsers(null);
        return;
      }
      const d = (await r.json()) as { users: AdminUser[] };
      setUsers(d.users);
    } catch {
      setError('сеть');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function patch(id: string, patch: Partial<AdminUser>) {
    const r = await apiFetch(`/api/admin/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (r.ok) void load();
  }

  async function remove(id: string) {
    if (!confirm('Удалить пользователя без возможности восстановления?')) return;
    const r = await apiFetch(`/api/admin/users/${id}`, { method: 'DELETE' });
    if (r.ok) void load();
  }

  const filtered = useMemo(() => {
    if (!users) return [];
    if (!q.trim()) return users;
    const needle = q.trim().toLowerCase();
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(needle) ||
        u.email.toLowerCase().includes(needle) ||
        u.id.toLowerCase().includes(needle),
    );
  }, [users, q]);

  const stats = useMemo(() => {
    if (!users) return null;
    return {
      total: users.length,
      pro: users.filter((u) => u.plan === 'pro' || u.plan === 'family').length,
      admins: users.filter((u) => u.role === 'admin').length,
      attempts: users.reduce((a, u) => a + u.attempts, 0),
    };
  }, [users]);

  if (error === 'forbidden') {
    const me = getStoredUser();
    return (
      <main className="mx-auto max-w-xl px-5 pb-20 pt-12">
        <Link
          href="/app"
          className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-text-primary"
        >
          <ArrowLeft size={16} strokeWidth={1.5} /> Кабинет
        </Link>
        <GlassPanel padding="lg" className="mt-6">
          <div className="flex items-start gap-3">
            <Lock size={22} strokeWidth={1.5} className="mt-1 text-aurora-3" />
            <div>
              <div className="font-display text-2xl font-semibold">
                Доступ запрещён
              </div>
              <p className="mt-1 text-sm text-text-muted">
                Чтобы войти в админку, авторизуйся под аккаунтом администратора.
                Сейчас ты как: <span className="text-text-primary">{me?.name ?? 'аноним'}</span>.
              </p>
              <div className="mt-4 flex gap-2">
                <Link href="/app">
                  <GlassButton variant="primary" size="md">
                    В кабинет
                  </GlassButton>
                </Link>
              </div>
            </div>
          </div>
        </GlassPanel>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 pb-16 pt-5 md:px-6 md:pt-8">
      <header className="flex items-center gap-3">
        <Link
          href="/app"
          className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-text-primary"
        >
          <ArrowLeft size={16} strokeWidth={1.5} /> Кабинет
        </Link>
        <h1 className="ml-2 font-display text-xl font-semibold tracking-tight md:text-2xl">
          Админка
        </h1>
        <span className="ml-2 inline-flex items-center gap-1 rounded-full border border-accent-gold/40 bg-accent-gold/[0.10] px-2.5 py-1 text-[11px] text-accent-gold">
          <Crown size={12} strokeWidth={2} /> ADMIN
        </span>
        <div className="ml-auto">
          <GlassButton variant="ghost" size="sm" onClick={load} disabled={busy}>
            <RefreshCw size={14} strokeWidth={1.5} />{' '}
            {busy ? 'обновляю…' : 'обновить'}
          </GlassButton>
        </div>
      </header>

      {/* Stats */}
      {stats && (
        <section className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat icon={<Users size={16} strokeWidth={1.5} />} label="всего" value={stats.total} />
          <Stat
            icon={<Crown size={16} strokeWidth={1.5} />}
            label="PRO"
            value={stats.pro}
            accent="gold"
          />
          <Stat
            icon={<ShieldCheck size={16} strokeWidth={1.5} />}
            label="админы"
            value={stats.admins}
            accent="aurora-2"
          />
          <Stat
            icon={<Activity size={16} strokeWidth={1.5} />}
            label="попыток"
            value={stats.attempts}
            accent="aurora-1"
          />
        </section>
      )}

      {/* Search */}
      <div className="mt-5 flex items-center gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-glass border border-white/10 bg-white/[0.03] px-3 py-2 focus-within:border-aurora-2/50">
          <Search size={16} strokeWidth={1.5} className="text-text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="поиск по имени, email или id"
            className="w-full bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
          />
        </div>
      </div>

      {/* Table */}
      <section className="mt-4 overflow-hidden rounded-glass border border-white/10">
        <div className="hidden grid-cols-[2fr_1.6fr_0.8fr_0.8fr_0.8fr_0.8fr_auto] items-center gap-3 bg-white/[0.03] px-4 py-2 text-[11px] uppercase tracking-widest text-text-muted md:grid">
          <div>Пользователь</div>
          <div>Email</div>
          <div>План</div>
          <div>Роль</div>
          <div>Попытки</div>
          <div>Темы</div>
          <div className="text-right">Действия</div>
        </div>
        {filtered.length === 0 && !busy && (
          <div className="px-4 py-6 text-center text-sm text-text-muted">
            пусто
          </div>
        )}
        <ul className="divide-y divide-white/5">
          {filtered.map((u) => (
            <li
              key={u.id}
              className="grid grid-cols-1 items-center gap-2 px-4 py-3 text-sm md:grid-cols-[2fr_1.6fr_0.8fr_0.8fr_0.8fr_0.8fr_auto] md:gap-3"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className={cn(
                    'grid h-9 w-9 shrink-0 place-items-center rounded-full border font-mono text-xs',
                    u.role === 'admin'
                      ? 'border-accent-gold/50 bg-accent-gold/10 text-accent-gold'
                      : 'border-white/10 bg-white/[0.04] text-text-muted',
                  )}
                >
                  {u.name[0]?.toUpperCase() ?? '?'}
                </div>
                <div className="min-w-0">
                  <div className="truncate font-medium text-text-primary">{u.name}</div>
                  <div className="truncate font-mono text-[10px] text-text-muted">
                    {u.id}
                  </div>
                </div>
              </div>
              <div className="truncate text-text-muted md:text-text-primary">{u.email}</div>
              <div>
                <Badge color={u.plan === 'pro' || u.plan === 'family' ? 'gold' : 'muted'}>
                  {u.plan}
                </Badge>
              </div>
              <div>
                <Badge color={u.role === 'admin' ? 'aurora-2' : 'muted'}>{u.role}</Badge>
              </div>
              <div className="text-text-muted">{u.attempts}</div>
              <div className="text-text-muted">{u.lessonsTouched}</div>
              <div className="flex items-center justify-end gap-1">
                <IconBtn
                  title={u.plan === 'pro' ? 'Снять PRO' : 'Выдать PRO'}
                  onClick={() => patch(u.id, { plan: u.plan === 'pro' ? 'free' : 'pro' })}
                >
                  {u.plan === 'pro' ? (
                    <StarOff size={14} strokeWidth={1.5} />
                  ) : (
                    <Star size={14} strokeWidth={1.5} className="text-accent-gold" />
                  )}
                </IconBtn>
                <IconBtn
                  title={u.role === 'admin' ? 'Снять админа' : 'Сделать админом'}
                  onClick={() => patch(u.id, { role: u.role === 'admin' ? 'user' : 'admin' })}
                >
                  {u.role === 'admin' ? (
                    <ShieldOff size={14} strokeWidth={1.5} />
                  ) : (
                    <ShieldCheck size={14} strokeWidth={1.5} className="text-aurora-2" />
                  )}
                </IconBtn>
                <IconBtn title="Удалить" onClick={() => remove(u.id)}>
                  <Trash2 size={14} strokeWidth={1.5} className="text-aurora-3" />
                </IconBtn>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

function Stat({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  accent?: 'gold' | 'aurora-1' | 'aurora-2';
}) {
  const accentClass =
    accent === 'gold'
      ? 'text-accent-gold'
      : accent === 'aurora-1'
        ? 'text-aurora-1'
        : accent === 'aurora-2'
          ? 'text-aurora-2'
          : 'text-text-primary';
  return (
    <GlassPanel padding="md">
      <div className="flex items-center gap-2 text-text-muted">
        {icon}
        <span className="text-xs uppercase tracking-widest">{label}</span>
      </div>
      <div className={cn('mt-1 font-display text-2xl font-semibold', accentClass)}>
        {value}
      </div>
    </GlassPanel>
  );
}

function Badge({
  color,
  children,
}: {
  color: 'gold' | 'aurora-2' | 'muted';
  children: React.ReactNode;
}) {
  const cls =
    color === 'gold'
      ? 'border-accent-gold/40 bg-accent-gold/10 text-accent-gold'
      : color === 'aurora-2'
        ? 'border-aurora-2/40 bg-aurora-2/10 text-aurora-2'
        : 'border-white/10 bg-white/[0.04] text-text-muted';
  return (
    <span className={cn('inline-flex rounded-full border px-2 py-0.5 text-[11px]', cls)}>
      {children}
    </span>
  );
}

function IconBtn({
  children,
  onClick,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="grid h-8 w-8 place-items-center rounded-md border border-white/10 bg-white/[0.04] text-text-muted hover:border-white/20 hover:text-text-primary"
    >
      {children}
    </button>
  );
}
