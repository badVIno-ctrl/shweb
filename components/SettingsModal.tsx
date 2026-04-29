'use client';

import { useEffect, useRef, useState } from 'react';
import { GlassPanel } from './GlassPanel';
import { GlassButton } from './GlassButton';
import {
  X,
  User as UserIcon,
  Camera,
  KeyRound,
  Trash2,
  Sparkles,
  Volume2,
  Sun,
  Palette,
  Save,
  Crown,
} from 'lucide-react';
// `Palette` icon is still used as the sidebar icon for the appearance tab.
import { apiFetch, getStoredUser, setStoredUser, type StoredUser } from '@/lib/api';

interface Props {
  open: boolean;
  onClose: () => void;
  user: (StoredUser & { plan?: string; role?: string; streak?: number }) | null;
  onUpdated: () => void;
}

const AVATAR_KEY = 'vsa_avatar';
const PREFS_KEY = 'vsa_prefs';

interface Prefs {
  ttsRate: number;     // 0.7..1.4
  accent: string;      // hex
  highContrast: boolean;
  reducedMotion: boolean;
  starryDefault: boolean;
}

const DEFAULT_PREFS: Prefs = {
  ttsRate: 1.0,
  accent: '#A78BFA',
  highContrast: false,
  reducedMotion: false,
  starryDefault: false,
};

type Tab = 'profile' | 'security' | 'appearance' | 'study' | 'data';

export function SettingsModal({ open, onClose, user, onUpdated }: Props) {
  const [tab, setTab] = useState<Tab>('profile');
  const [name, setName] = useState(user?.name ?? '');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [pwdOld, setPwdOld] = useState('');
  const [pwdNew, setPwdNew] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setName(user?.name ?? '');
    setMsg(null);
    setPwdOld('');
    setPwdNew('');
    try {
      const a = localStorage.getItem(AVATAR_KEY);
      setAvatar(a);
      const raw = localStorage.getItem(PREFS_KEY);
      if (raw) setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(raw) });
    } catch { /* ignore */ }
  }, [open, user]);

  if (!open) return null;

  function flash(kind: 'ok' | 'err', text: string) {
    setMsg({ kind, text });
    setTimeout(() => setMsg(null), 2400);
  }

  async function saveProfile() {
    if (!user?.id) return flash('err', 'войди в аккаунт');
    if (!name.trim()) return flash('err', 'ник не может быть пустым');
    setBusy(true);
    try {
      const r = await apiFetch('/api/me/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });
      const d = (await r.json().catch(() => ({}))) as { user?: StoredUser; error?: string };
      if (!r.ok || !d.user) return flash('err', d.error ?? 'ошибка сохранения');
      setStoredUser({ ...(getStoredUser() ?? d.user), ...d.user });
      onUpdated();
      flash('ok', 'профиль обновлён');
    } finally {
      setBusy(false);
    }
  }

  async function changePassword() {
    if (!user?.id) return flash('err', 'войди в аккаунт');
    if (pwdNew.length < 6) return flash('err', 'мин. 6 символов');
    setBusy(true);
    try {
      const r = await apiFetch('/api/me/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPassword: pwdOld, newPassword: pwdNew }),
      });
      const d = (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!r.ok || !d.ok) return flash('err', d.error ?? 'ошибка');
      setPwdOld('');
      setPwdNew('');
      flash('ok', 'пароль изменён');
    } finally {
      setBusy(false);
    }
  }

  function pickFile() {
    fileRef.current?.click();
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 1.5 * 1024 * 1024) return flash('err', 'файл слишком большой (макс 1.5 МБ)');
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      // Resize via canvas to 256x256 to keep storage small.
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = 256;
        c.height = 256;
        const ctx = c.getContext('2d')!;
        const m = Math.min(img.width, img.height);
        ctx.drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, 256, 256);
        const data = c.toDataURL('image/jpeg', 0.86);
        try { localStorage.setItem(AVATAR_KEY, data); } catch { /* ignore */ }
        setAvatar(data);
        window.dispatchEvent(new CustomEvent('pm-user-change'));
        flash('ok', 'аватар сохранён');
      };
      img.src = url;
    };
    reader.readAsDataURL(f);
  }

  function clearAvatar() {
    localStorage.removeItem(AVATAR_KEY);
    setAvatar(null);
    window.dispatchEvent(new CustomEvent('pm-user-change'));
    flash('ok', 'аватар удалён');
  }

  function persistPrefs(next: Prefs) {
    setPrefs(next);
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
    document.documentElement.style.setProperty('--vsa-accent', next.accent);
    document.documentElement.dataset.contrast = next.highContrast ? 'high' : 'normal';
    document.documentElement.dataset.motion = next.reducedMotion ? 'reduced' : 'normal';
  }

  function clearProgress() {
    if (!confirm('Удалить локальный прогресс просмотра тем?')) return;
    localStorage.removeItem('pm_watched_tasks');
    flash('ok', 'прогресс очищен');
  }

  const initial = (user?.name ?? '?')[0]?.toUpperCase() ?? '?';

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 px-4 backdrop-blur-sm">
      <GlassPanel padding="none" className="relative flex h-[640px] max-h-[92vh] w-full max-w-3xl overflow-hidden">
        <button
          onClick={onClose}
          className="absolute right-3 top-3 z-10 text-text-muted hover:text-text-primary"
          aria-label="закрыть"
          type="button"
        >
          <X size={20} strokeWidth={1.5} />
        </button>

        {/* Sidebar */}
        <aside className="hidden w-56 shrink-0 flex-col gap-1 border-r border-white/10 bg-white/[0.02] p-4 md:flex">
          <div className="mb-4 flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center overflow-hidden rounded-full border border-white/10 bg-white/[0.06] font-mono text-aurora-2">
              {avatar
                ? <img src={avatar} alt="" className="h-full w-full object-cover" />
                : <span className="text-lg">{initial}</span>}
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{user?.name ?? 'Гость'}</div>
              <div className="truncate text-[11px] text-text-muted">{user?.email ?? '—'}</div>
              {user?.plan && (
                <span className="mt-0.5 inline-flex items-center gap-1 rounded-full border border-accent-gold/30 bg-accent-gold/10 px-1.5 py-0.5 text-[10px] text-accent-gold">
                  <Crown size={10} strokeWidth={2} /> {user?.role === 'admin' ? 'ADMIN' : user.plan.toUpperCase()}
                </span>
              )}
            </div>
          </div>
          <SidebarBtn icon={<UserIcon size={14} />} active={tab === 'profile'} onClick={() => setTab('profile')}>
            Профиль
          </SidebarBtn>
          <SidebarBtn icon={<KeyRound size={14} />} active={tab === 'security'} onClick={() => setTab('security')}>
            Безопасность
          </SidebarBtn>
          <SidebarBtn icon={<Palette size={14} />} active={tab === 'appearance'} onClick={() => setTab('appearance')}>
            Оформление
          </SidebarBtn>
          <SidebarBtn icon={<Sparkles size={14} />} active={tab === 'study'} onClick={() => setTab('study')}>
            Обучение
          </SidebarBtn>
          <SidebarBtn icon={<Trash2 size={14} />} active={tab === 'data'} onClick={() => setTab('data')}>
            Данные
          </SidebarBtn>
        </aside>

        {/* Mobile tab strip */}
        <div className="absolute inset-x-0 top-0 z-10 flex gap-1 overflow-x-auto border-b border-white/10 bg-bg-deep/80 px-3 py-2 md:hidden">
          {(['profile', 'security', 'appearance', 'study', 'data'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={
                'whitespace-nowrap rounded-full px-3 py-1 text-xs ' +
                (tab === t ? 'bg-aurora-2/20 text-text-primary' : 'text-text-muted')
              }
              type="button"
            >
              {t === 'profile' && 'Профиль'}
              {t === 'security' && 'Пароль'}
              {t === 'appearance' && 'Тема'}
              {t === 'study' && 'Обучение'}
              {t === 'data' && 'Данные'}
            </button>
          ))}
        </div>

        {/* Body */}
        <section className="flex-1 overflow-y-auto p-6 pt-14 md:pt-6">
          {tab === 'profile' && (
            <div className="flex flex-col gap-5">
              <h3 className="font-display text-xl font-semibold">Профиль</h3>
              <div className="flex items-center gap-4">
                <div className="grid h-20 w-20 place-items-center overflow-hidden rounded-full border border-white/10 bg-white/[0.06] text-2xl font-mono text-aurora-2">
                  {avatar ? <img src={avatar} alt="" className="h-full w-full object-cover" /> : initial}
                </div>
                <div className="flex flex-col gap-2">
                  <GlassButton size="sm" variant="primary" onClick={pickFile}>
                    <Camera size={14} strokeWidth={1.5} /> Загрузить аватар
                  </GlassButton>
                  {avatar && (
                    <GlassButton size="sm" variant="ghost" onClick={clearAvatar}>
                      <Trash2 size={14} strokeWidth={1.5} /> Убрать
                    </GlassButton>
                  )}
                  <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
                  <p className="text-xs text-text-muted">PNG/JPG до 1.5&nbsp;МБ. Хранится локально на устройстве.</p>
                </div>
              </div>
              <Field label="Ник">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-glass border border-white/10 bg-white/[0.03] px-3 py-2 text-sm focus:border-aurora-2/50 focus:outline-none"
                  placeholder="как тебя называть"
                />
              </Field>
              <Field label="Email">
                <input
                  value={user?.email ?? ''}
                  disabled
                  className="w-full cursor-not-allowed rounded-glass border border-white/5 bg-white/[0.02] px-3 py-2 text-sm text-text-muted"
                />
              </Field>
              <div>
                <GlassButton variant="gold" size="md" onClick={saveProfile} disabled={busy || !user?.id}>
                  <Save size={14} strokeWidth={1.5} /> Сохранить
                </GlassButton>
              </div>
            </div>
          )}

          {tab === 'security' && (
            <div className="flex flex-col gap-5">
              <h3 className="font-display text-xl font-semibold">Безопасность</h3>
              <Field label="Текущий пароль">
                <input
                  type="password"
                  value={pwdOld}
                  onChange={(e) => setPwdOld(e.target.value)}
                  className="w-full rounded-glass border border-white/10 bg-white/[0.03] px-3 py-2 text-sm focus:border-aurora-2/50 focus:outline-none"
                />
              </Field>
              <Field label="Новый пароль">
                <input
                  type="password"
                  value={pwdNew}
                  onChange={(e) => setPwdNew(e.target.value)}
                  className="w-full rounded-glass border border-white/10 bg-white/[0.03] px-3 py-2 text-sm focus:border-aurora-2/50 focus:outline-none"
                  placeholder="мин. 6 символов"
                />
              </Field>
              <div>
                <GlassButton variant="gold" size="md" onClick={changePassword} disabled={busy || !user?.id}>
                  <KeyRound size={14} strokeWidth={1.5} /> Сменить пароль
                </GlassButton>
              </div>
              <p className="text-xs text-text-muted">
                Пароли хранятся в виде SHA-256 хеша с солью. Никто, включая администратора, не видит их в открытом виде.
              </p>
            </div>
          )}

          {tab === 'appearance' && (
            <div className="flex flex-col gap-5">
              <h3 className="font-display text-xl font-semibold">Оформление</h3>
              <Toggle
                label="Высокая контрастность"
                hint="усиливает контраст текста и кнопок"
                checked={prefs.highContrast}
                onChange={(v) => persistPrefs({ ...prefs, highContrast: v })}
                icon={<Sun size={14} />}
              />
              <Toggle
                label="Уменьшить анимацию"
                hint="отключает плавные переходы — удобно при укачивании"
                checked={prefs.reducedMotion}
                onChange={(v) => persistPrefs({ ...prefs, reducedMotion: v })}
                icon={<Sparkles size={14} />}
              />
              <Toggle
                label="Звёздный фон у доски"
                hint="космическое оформление по умолчанию"
                checked={prefs.starryDefault}
                onChange={(v) => persistPrefs({ ...prefs, starryDefault: v })}
                icon={<Sparkles size={14} />}
              />
            </div>
          )}

          {tab === 'study' && (
            <div className="flex flex-col gap-5">
              <h3 className="font-display text-xl font-semibold">Обучение</h3>
              <Field label={`Скорость голоса учителя — ${prefs.ttsRate.toFixed(2)}×`}>
                <input
                  type="range"
                  min={0.7}
                  max={1.4}
                  step={0.05}
                  value={prefs.ttsRate}
                  onChange={(e) => persistPrefs({ ...prefs, ttsRate: parseFloat(e.target.value) })}
                  className="w-full accent-aurora-2"
                />
              </Field>
              <div className="rounded-glass border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Volume2 size={14} strokeWidth={1.5} className="text-aurora-2" /> Тестовая фраза
                </div>
                <p className="mt-1 text-xs text-text-muted">
                  «Гипотенуза в квадрате равна сумме квадратов катетов».
                </p>
                <GlassButton
                  size="sm"
                  variant="primary"
                  className="mt-3"
                  onClick={() => {
                    try {
                      const u = new SpeechSynthesisUtterance('Гипотенуза в квадрате равна сумме квадратов катетов.');
                      u.lang = 'ru-RU';
                      u.rate = prefs.ttsRate;
                      speechSynthesis.cancel();
                      speechSynthesis.speak(u);
                    } catch { /* ignore */ }
                  }}
                >
                  <Volume2 size={14} strokeWidth={1.5} /> Послушать
                </GlassButton>
              </div>
              <Field label="Streak">
                <div className="rounded-glass border border-white/10 bg-white/[0.03] px-3 py-2 text-sm">
                  {user?.streak ?? 0} 🔥 — продолжай заходить каждый день, чтобы наращивать серию.
                </div>
              </Field>
            </div>
          )}

          {tab === 'data' && (
            <div className="flex flex-col gap-5">
              <h3 className="font-display text-xl font-semibold">Данные и приватность</h3>
              <p className="text-sm text-text-muted">
                Локальные данные (аватар, настройки, прогресс просмотра) хранятся в браузере.
                Аккаунт и пароль — на сервере.
              </p>
              <div className="flex flex-wrap gap-2">
                <GlassButton size="sm" variant="ghost" onClick={clearProgress}>
                  <Trash2 size={14} strokeWidth={1.5} /> Сбросить прогресс
                </GlassButton>
                <GlassButton
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    const data = {
                      user,
                      prefs,
                      watched: localStorage.getItem('pm_watched_tasks'),
                    };
                    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    a.download = 'vsa-export.json';
                    a.click();
                  }}
                >
                  <Save size={14} strokeWidth={1.5} /> Экспорт JSON
                </GlassButton>
              </div>
            </div>
          )}

          {msg && (
            <div
              className={
                'mt-5 rounded-glass border px-3 py-2 text-sm ' +
                (msg.kind === 'ok'
                  ? 'border-aurora-1/40 bg-aurora-1/10 text-aurora-1'
                  : 'border-aurora-3/40 bg-aurora-3/10 text-aurora-3')
              }
            >
              {msg.text}
            </div>
          )}
        </section>
      </GlassPanel>
    </div>
  );
}

function SidebarBtn({
  icon,
  active,
  onClick,
  children,
}: {
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ' +
        (active
          ? 'bg-aurora-2/15 text-text-primary'
          : 'text-text-muted hover:bg-white/[0.04] hover:text-text-primary')
      }
    >
      <span className={active ? 'text-aurora-2' : ''}>{icon}</span>
      {children}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] uppercase tracking-widest text-text-muted">{label}</span>
      {children}
    </label>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
  icon,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={
        'flex items-center gap-3 rounded-glass border px-3 py-2.5 text-left transition-colors ' +
        (checked ? 'border-aurora-2/50 bg-aurora-2/10' : 'border-white/10 bg-white/[0.03] hover:border-white/20')
      }
    >
      {icon && <span className={checked ? 'text-aurora-2' : 'text-text-muted'}>{icon}</span>}
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{label}</div>
        {hint && <div className="text-[11px] text-text-muted">{hint}</div>}
      </div>
      <span
        className={
          'relative h-5 w-9 rounded-full transition-colors ' +
          (checked ? 'bg-aurora-2/70' : 'bg-white/10')
        }
      >
        <span
          className={
            'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ' +
            (checked ? 'left-[18px]' : 'left-0.5')
          }
        />
      </span>
    </button>
  );
}
