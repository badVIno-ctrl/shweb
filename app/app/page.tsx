'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ChevronRight,
  CheckCircle2,
  Sparkles,
  BookOpen,
  Dumbbell,
  Settings,
  Crown,
  Lock,
  LogIn,
  LogOut,
  PlayCircle,
  ShieldCheck,
  KeyRound,
} from 'lucide-react';
import { GlassPanel } from '@/components/GlassPanel';
import { GlassButton } from '@/components/GlassButton';
import { EgeTheoryPlayer } from '@/components/EgeTheoryPlayer';
import { EgePracticePanel } from '@/components/EgePracticePanel';
import { AuthModal } from '@/components/AuthModal';
import { EGE_TASKS, getTaskById } from '@/lib/ege-tasks';
import { apiFetch, getStoredUser, isPro, setStoredUser, type StoredUser } from '@/lib/api';
import { cn } from '@/lib/utils';
import { VsaLogo } from '@/components/VsaLogo';
import { SettingsModal } from '@/components/SettingsModal';

interface Me {
  user: StoredUser & { plan: string; role: string; streak: number };
}

const WATCHED_KEY = 'pm_watched_tasks';
type Stage = 'theory' | 'practice';

export default function Cabinet() {
  const [me, setMe] = useState<Me['user'] | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [stage, setStage] = useState<Stage>('theory');
  const [watched, setWatched] = useState<Record<number, boolean>>({});
  const [mobileListOpen, setMobileListOpen] = useState(true);
  const router = useRouter();

  function loadMe() {
    apiFetch('/api/me')
      .then((r) => r.json())
      .then((d: Me) => setMe(d.user))
      .catch(() => undefined);
  }

  useEffect(() => {
    loadMe();
    try {
      const raw = localStorage.getItem(WATCHED_KEY);
      if (raw) setWatched(JSON.parse(raw));
    } catch {/* ignore */}
    const handler = () => loadMe();
    window.addEventListener('pm-user-change', handler);
    return () => window.removeEventListener('pm-user-change', handler);
  }, []);

  function persist(next: Record<number, boolean>) {
    setWatched(next);
    try {
      localStorage.setItem(WATCHED_KEY, JSON.stringify(next));
    } catch {/* ignore */}
  }

  const stored = getStoredUser();
  const userIsPro = isPro({ plan: me?.plan, role: me?.role });
  const isLoggedIn = !!stored?.id;
  const task = selected ? getTaskById(selected) : null;
  const watchedCount = useMemo(
    () => Object.values(watched).filter(Boolean).length,
    [watched],
  );

  function selectTask(id: number) {
    if (!userIsPro) return; // paywalled
    setSelected(id);
    setStage(watched[id] ? 'practice' : 'theory');
    setMobileListOpen(false);
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setTimeout(() => {
        document
          .getElementById('task-pane')
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
    }
  }

  function logout() {
    setStoredUser(null);
    setMe(null);
    setSelected(null);
  }

  return (
    <main className="mx-auto max-w-7xl px-4 pb-16 pt-5 md:px-6 md:pt-8">
      {/* Header */}
      <header className="flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2">
          <VsaLogo size={36} />
          <div className="hidden flex-col leading-none md:flex">
            <span className="font-display text-lg font-semibold tracking-tight">
              Viora <span className="text-aurora-2">Smart Academy</span>
            </span>
            <span className="mt-0.5 text-[10px] uppercase tracking-[0.25em] text-text-muted">VSA</span>
          </div>
        </Link>
        <Link
          href="/"
          className="ml-2 hidden text-sm text-text-muted hover:text-text-primary md:inline-flex md:items-center md:gap-1"
        >
          <ArrowLeft size={14} strokeWidth={1.5} /> На главную
        </Link>
        <div className="ml-auto flex items-center gap-2 md:gap-3">
          {userIsPro && (
            <span className="inline-flex items-center gap-1 rounded-full border border-accent-gold/30 bg-accent-gold/[0.10] px-3 py-1 text-xs text-accent-gold">
              <Crown size={14} strokeWidth={1.5} />{' '}
              {me?.role === 'admin' ? 'ADMIN' : 'PRO'}
            </span>
          )}
          {me?.role === 'admin' && (
            <Link
              href="/admin"
              className="hidden items-center gap-1 rounded-full border border-aurora-2/40 bg-aurora-2/[0.10] px-3 py-1 text-xs text-aurora-2 hover:bg-aurora-2/[0.18] sm:inline-flex"
              title="Админ-панель"
            >
              <ShieldCheck size={12} strokeWidth={2} /> админка
            </Link>
          )}
          {userIsPro && (
            <span className="hidden rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-text-muted sm:inline-flex">
              {watchedCount}/{EGE_TASKS.length} тем
            </span>
          )}
          {isLoggedIn ? (
            <>
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                className="grid h-9 w-9 place-items-center overflow-hidden rounded-full border border-white/10 bg-white/[0.06] font-mono text-aurora-2 transition hover:border-aurora-2/50"
                title={`${me?.name ?? 'профиль'} · открыть настройки`}
              >
                {(() => {
                  try {
                    const a = typeof window !== 'undefined' ? localStorage.getItem('vsa_avatar') : null;
                    if (a) return <img src={a} alt="" className="h-full w-full object-cover" />;
                  } catch { /* ignore */ }
                  return (me?.name ?? '?')[0];
                })()}
              </button>
              <button
                onClick={() => { logout(); }}
                className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-text-muted hover:text-text-primary"
                title="Выйти"
                type="button"
              >
                <LogOut size={16} strokeWidth={1.5} />
              </button>
            </>
          ) : (
            <GlassButton size="sm" variant="ghost" onClick={() => setAuthOpen(true)}>
              <LogIn size={16} strokeWidth={1.5} /> Войти
            </GlassButton>
          )}
          <button
            onClick={() => setSettingsOpen(true)}
            className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-text-muted hover:text-text-primary"
            title="Настройки и профиль"
            type="button"
          >
            <Settings size={18} strokeWidth={1.5} />
          </button>
        </div>
      </header>

      {/* Paywall */}
      {!userIsPro && (
        <Paywall
          isLoggedIn={isLoggedIn}
          onLogin={() => setAuthOpen(true)}
          onActivated={loadMe}
        />
      )}

      {/* Mobile back to list */}
      {userIsPro && selected && (
        <button
          onClick={() => setMobileListOpen(true)}
          className="mt-4 flex items-center gap-2 text-sm text-aurora-2 md:hidden"
          type="button"
        >
          <ArrowLeft size={14} strokeWidth={1.5} /> К списку заданий
        </button>
      )}

      {/* Cabinet */}
      <div
        className={cn(
          'mt-5 grid gap-5 md:mt-7 md:grid-cols-[340px_1fr]',
          !userIsPro && 'opacity-60',
        )}
      >
        {/* Left: Программа курса */}
        <GlassPanel
          padding="md"
          className={cn(
            'h-fit md:sticky md:top-4',
            selected && !mobileListOpen && 'hidden md:block',
          )}
        >
          <div className="mb-3 flex items-center justify-between">
            <div className="font-display text-base font-semibold">
              Программа курса
            </div>
            {me && (
              <span className="text-xs text-text-muted">
                streak {me.streak}🔥
              </span>
            )}
          </div>

          <div className="flex flex-col gap-1">
            {EGE_TASKS.map((t) => {
              const isWatched = !!watched[t.id];
              const active = selected === t.id;
              const locked = !userIsPro;
              return (
                <button
                  key={t.id}
                  onClick={() => selectTask(t.id)}
                  disabled={locked}
                  className={cn(
                    'group flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition-colors',
                    active
                      ? 'border-aurora-2/40 bg-aurora-2/10'
                      : 'border-transparent hover:border-white/10 hover:bg-white/[0.04]',
                    locked && 'cursor-not-allowed',
                  )}
                  type="button"
                >
                  <div
                    className={cn(
                      'grid h-8 w-8 shrink-0 place-items-center rounded-lg border font-mono text-xs',
                      active
                        ? 'border-aurora-2/50 bg-aurora-2/20 text-aurora-2'
                        : 'border-white/10 bg-white/[0.04] text-text-muted',
                    )}
                  >
                    {t.id}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-text-primary">
                      Задание {t.id}: {t.title}
                    </div>
                    <div className="text-[11px] text-text-muted">
                      {t.primary} перв · {t.approxTest} тест.
                    </div>
                  </div>
                  {locked ? (
                    <Lock
                      size={14}
                      strokeWidth={1.5}
                      className="text-text-muted"
                    />
                  ) : isWatched ? (
                    <CheckCircle2
                      size={16}
                      strokeWidth={1.5}
                      className="text-aurora-1"
                    />
                  ) : (
                    <ChevronRight
                      size={16}
                      strokeWidth={1.5}
                      className="text-text-muted opacity-0 transition-opacity group-hover:opacity-100"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </GlassPanel>

        {/* Right pane */}
        <div
          id="task-pane"
          className={cn(
            'flex flex-col gap-5',
            selected && mobileListOpen && 'hidden md:flex',
          )}
        >
          {!task && userIsPro && (
            <GlassPanel padding="lg" className="relative overflow-hidden">
              <div className="absolute inset-0 -z-10 opacity-50">
                <div className="absolute -right-20 -top-20 h-[420px] w-[420px] rounded-full bg-aurora-2/30 blur-3xl" />
                <div className="absolute -bottom-24 left-10 h-[320px] w-[320px] rounded-full bg-aurora-1/25 blur-3xl" />
              </div>
              <div className="font-display text-2xl font-semibold md:text-3xl">
                Привет, {me?.name ?? '...'}
              </div>
              <p className="mt-2 max-w-xl text-text-muted">
                Выбери любое задание профиля слева — и запусти короткий
                мини-урок. После просмотра откроется бесконечная практика для
                этого номера.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <GlassButton variant="gold" size="md" onClick={() => selectTask(1)}>
                  <Sparkles size={16} strokeWidth={1.5} /> Начать с задания 1
                </GlassButton>
                <Link href="/lesson/pythagoras">
                  <GlassButton variant="primary" size="md">
                    <PlayCircle size={16} strokeWidth={1.5} /> Демо-урок
                  </GlassButton>
                </Link>
              </div>
            </GlassPanel>
          )}

          {task && userIsPro && (
            <>
              <GlassPanel padding="lg">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs uppercase tracking-widest text-text-muted">
                      Задание {task.id}
                    </div>
                    <div className="mt-1 font-display text-2xl font-semibold md:text-3xl">
                      {task.title}
                    </div>
                    <p className="mt-2 max-w-2xl text-sm text-text-muted">
                      {task.description}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 text-xs">
                    <span className="rounded-full border border-accent-gold/30 bg-accent-gold/[0.10] px-2.5 py-1 text-accent-gold">
                      {task.primary} первичных
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-text-muted">
                      {task.approxTest} тестовых
                    </span>
                  </div>
                </div>
                <div className="mt-5 flex gap-2">
                  <StageTab
                    active={stage === 'theory'}
                    icon={<BookOpen size={14} strokeWidth={1.5} />}
                    onClick={() => setStage('theory')}
                  >
                    Теория
                  </StageTab>
                  <StageTab
                    active={stage === 'practice'}
                    icon={<Dumbbell size={14} strokeWidth={1.5} />}
                    onClick={() => setStage('practice')}
                    disabled={!watched[task.id]}
                    hint={
                      !watched[task.id]
                        ? 'Сначала отметь теорию как просмотренную'
                        : undefined
                    }
                  >
                    Практика
                  </StageTab>
                </div>
              </GlassPanel>

              <GlassPanel padding="lg">
                {stage === 'theory' && (
                  <EgeTheoryPlayer
                    key={task.id}
                    task={task}
                    onWatched={() => {
                      const next = { ...watched, [task.id]: true };
                      persist(next);
                      setStage('practice');
                    }}
                  />
                )}
                {stage === 'practice' && watched[task.id] && (
                  <EgePracticePanel key={task.id} task={task} />
                )}
                {stage === 'practice' && !watched[task.id] && (
                  <div className="text-sm text-text-muted">
                    Сначала посмотри теорию и нажми «Просмотрено».
                  </div>
                )}
              </GlassPanel>
            </>
          )}
        </div>
      </div>

      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        onSuccess={() => {
          setAuthOpen(false);
          loadMe();
        }}
      />
      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        user={me}
        onUpdated={loadMe}
      />
    </main>
  );
}

function StageTab({
  active,
  icon,
  children,
  onClick,
  disabled,
  hint,
}: {
  active: boolean;
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={hint}
      className={cn(
        'inline-flex items-center gap-2 rounded-glass border px-3 py-1.5 text-sm transition-colors',
        active
          ? 'border-aurora-2/50 bg-aurora-2/15 text-text-primary'
          : 'border-white/10 bg-white/[0.03] text-text-muted hover:text-text-primary',
        disabled && 'cursor-not-allowed opacity-50',
      )}
    >
      {icon}
      {children}
    </button>
  );
}

function Paywall({
  isLoggedIn,
  onLogin,
  onActivated,
}: {
  isLoggedIn: boolean;
  onLogin: () => void;
  onActivated: () => void;
}) {
  const [askPwd, setAskPwd] = useState(false);
  const [pwd, setPwd] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function activate() {
    setBusy(true);
    setErr(null);
    try {
      const r = await apiFetch('/api/admin/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pwd }),
      });
      if (!r.ok) {
        const d = (await r.json().catch(() => ({}))) as { error?: string };
        setErr(d.error ?? `ошибка ${r.status}`);
        return;
      }
      const d = (await r.json()) as { user: StoredUser };
      setStoredUser(d.user);
      onActivated();
      setAskPwd(false);
      setPwd('');
    } catch {
      setErr('сеть');
    } finally {
      setBusy(false);
    }
  }
  return (
    <GlassPanel padding="lg" className="mt-6 relative overflow-hidden">
      <div className="absolute inset-0 -z-10 opacity-60">
        <div className="absolute -right-20 -top-20 h-[420px] w-[420px] rounded-full bg-accent-gold/20 blur-3xl" />
        <div className="absolute -bottom-24 left-10 h-[320px] w-[320px] rounded-full bg-aurora-2/20 blur-3xl" />
      </div>
      <div className="flex flex-wrap items-start gap-4">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-accent-gold/30 bg-accent-gold/10 text-accent-gold">
          <Crown size={22} strokeWidth={1.5} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-display text-2xl font-semibold">
            Все 19 заданий открываются с PRO
          </div>
          <p className="mt-1 max-w-2xl text-text-muted">
            500 ₽ в месяц. Виртуальный 3D-учитель, бесконечная практика и
            проверка ответов ИИ. Бесплатный демо-урок доступен без подписки.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/pricing">
              <GlassButton variant="gold" size="md">
                <Crown size={16} strokeWidth={1.5} /> Купить PRO
              </GlassButton>
            </Link>
            <Link href="/lesson/pythagoras">
              <GlassButton variant="primary" size="md">
                <PlayCircle size={16} strokeWidth={1.5} /> Демо-урок
              </GlassButton>
            </Link>
            {!isLoggedIn && (
              <GlassButton variant="ghost" size="md" onClick={onLogin}>
                <LogIn size={16} strokeWidth={1.5} /> Войти
              </GlassButton>
            )}
            {isLoggedIn && !askPwd && (
              <GlassButton variant="ghost" size="md" onClick={() => setAskPwd(true)}>
                <KeyRound size={16} strokeWidth={1.5} /> Активировать админ
              </GlassButton>
            )}
          </div>
          {askPwd && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <input
                type="password"
                value={pwd}
                onChange={(e) => setPwd(e.target.value)}
                placeholder="мастер-пароль админа"
                className="flex-1 min-w-[180px] rounded-glass border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-aurora-2/50"
                autoFocus
              />
              <GlassButton variant="gold" size="md" onClick={activate} disabled={busy || !pwd}>
                {busy ? '…' : 'Подтвердить'}
              </GlassButton>
              <GlassButton variant="ghost" size="sm" onClick={() => { setAskPwd(false); setErr(null); }}>
                Отмена
              </GlassButton>
              {err && <div className="w-full text-sm text-aurora-3">{err}</div>}
            </div>
          )}
        </div>
      </div>
    </GlassPanel>
  );
}
