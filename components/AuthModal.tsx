'use client';

import { useState } from 'react';
import { GlassPanel } from './GlassPanel';
import { GlassButton } from './GlassButton';
import { X, Mail, User, Lock, AtSign, Eye, EyeOff } from 'lucide-react';
import { setStoredUser, type StoredUser } from '@/lib/api';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: (user: StoredUser) => void;
}

type Mode = 'login' | 'signup';

export function AuthModal({ open, onClose, onSuccess }: Props) {
  const [mode, setMode] = useState<Mode>('signup');
  const [login, setLogin] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!open) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const payload =
        mode === 'login'
          ? { login: login.trim(), password }
          : { email: email.trim().toLowerCase(), name: name.trim(), password };
      const res = await fetch(`/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { user?: StoredUser; error?: string };
      if (!res.ok || !data.user) {
        setErr(data.error ?? 'Не удалось войти');
        return;
      }
      setStoredUser(data.user);
      onSuccess(data.user);
      onClose();
    } catch {
      setErr('Сеть недоступна');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 px-4 backdrop-blur-sm">
      <GlassPanel padding="lg" className="relative w-full max-w-md">
        <button
          onClick={onClose}
          className="absolute right-3 top-3 text-text-muted hover:text-text-primary"
          aria-label="закрыть"
          type="button"
        >
          <X size={20} strokeWidth={1.5} />
        </button>
        <div className="font-display text-2xl font-semibold">
          {mode === 'login' ? 'С возвращением' : 'Создать аккаунт'}
        </div>
        <p className="mt-1 text-sm text-text-muted">
          {mode === 'login'
            ? 'Войди по нику или email и продолжай с того же места.'
            : 'Регистрация занимает 10 секунд.'}
        </p>

        <form onSubmit={submit} className="mt-5 flex flex-col gap-3">
          {mode === 'login' ? (
            <Field
              icon={<AtSign size={16} strokeWidth={1.5} />}
              placeholder="ник или email"
              value={login}
              onChange={setLogin}
              required
              autoFocus
            />
          ) : (
            <>
              <Field
                icon={<User size={16} strokeWidth={1.5} />}
                placeholder="ник"
                value={name}
                onChange={setName}
                required
                autoFocus
              />
              <Field
                icon={<Mail size={16} strokeWidth={1.5} />}
                type="email"
                placeholder="email@example.com"
                value={email}
                onChange={setEmail}
                required
              />
            </>
          )}
          <PasswordField
            placeholder={mode === 'login' ? 'пароль' : 'пароль (мин. 6 символов)'}
            value={password}
            onChange={setPassword}
            required
            minLength={mode === 'signup' ? 6 : undefined}
          />

          {err && <div className="text-sm text-aurora-3">{err}</div>}

          <GlassButton
            type="submit"
            variant="gold"
            size="md"
            disabled={busy}
            className="mt-2 w-full justify-center"
          >
            {busy ? '…' : mode === 'login' ? 'Войти' : 'Зарегистрироваться'}
          </GlassButton>
        </form>

        <div className="mt-4 text-center text-sm text-text-muted">
          {mode === 'login' ? 'Нет аккаунта?' : 'Уже есть аккаунт?'}{' '}
          <button
            type="button"
            onClick={() => {
              setMode((m) => (m === 'login' ? 'signup' : 'login'));
              setErr(null);
            }}
            className="text-aurora-2 hover:text-aurora-1"
          >
            {mode === 'login' ? 'Создать' : 'Войти'}
          </button>
        </div>
      </GlassPanel>
    </div>
  );
}

function Field({
  icon,
  value,
  onChange,
  ...rest
}: {
  icon: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  return (
    <label className="flex items-center gap-2 rounded-glass border border-white/10 bg-white/[0.03] px-3 py-2.5 focus-within:border-aurora-2/50">
      <span className="text-text-muted">{icon}</span>
      <input
        {...rest}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
      />
    </label>
  );
}

function PasswordField({
  value,
  onChange,
  ...rest
}: {
  value: string;
  onChange: (v: string) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'>) {
  const [show, setShow] = useState(false);
  return (
    <label className="flex items-center gap-2 rounded-glass border border-white/10 bg-white/[0.03] px-3 py-2.5 focus-within:border-aurora-2/50">
      <span className="text-text-muted">
        <Lock size={16} strokeWidth={1.5} />
      </span>
      <input
        {...rest}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? 'скрыть пароль' : 'показать пароль'}
        className="text-text-muted hover:text-text-primary"
      >
        {show ? <EyeOff size={16} strokeWidth={1.5} /> : <Eye size={16} strokeWidth={1.5} />}
      </button>
    </label>
  );
}
