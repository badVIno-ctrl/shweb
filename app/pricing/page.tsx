'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, Crown, Sparkles, Lock, ShieldCheck } from 'lucide-react';
import { GlassPanel } from '@/components/GlassPanel';
import { GlassButton } from '@/components/GlassButton';

const PRO_FEATURES = [
  'Доступ ко всем 19 заданиям профиля',
  'Виртуальный 3D-учитель у доски',
  'Бесконечная практика и проверка ответов ИИ',
  'Конспект урока в PDF',
  'Холодные звонки и режим «дорисуй сам»',
  'Сохранение прогресса между устройствами',
];

const FREE_FEATURES = [
  'Демо-урок «Теорема Пифагора»',
  'Просмотр программы курса',
  'Описание всех 19 заданий',
];

export default function Pricing() {
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  function buy() {
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      setHint(
        'Оплата картой пока недоступна — мы запускаем приём платежей. Если хочешь Pro прямо сейчас — напиши нам в Telegram.',
      );
    }, 600);
  }

  return (
    <main className="mx-auto max-w-5xl px-5 pb-24 pt-6 md:px-8 md:pt-10">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-text-primary"
      >
        <ArrowLeft size={16} strokeWidth={1.5} /> На главную
      </Link>

      <header className="mt-8 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-text-muted">
          <Sparkles size={14} strokeWidth={1.5} className="text-aurora-1" />
          Подписка
        </span>
        <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight md:text-5xl">
          Выбери свой{' '}
          <span className="bg-gradient-to-r from-aurora-1 via-aurora-2 to-aurora-3 bg-clip-text text-transparent">
            план
          </span>
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-text-muted">
          Никаких скрытых платежей. Pro отписывается в один клик. Возврат
          средств в течение 14 дней — без вопросов.
        </p>
      </header>

      <section className="mt-12 grid gap-5 md:grid-cols-2">
        {/* Free */}
        <GlassPanel padding="lg" className="flex flex-col">
          <div className="flex items-center gap-2 text-text-muted">
            <Lock size={16} strokeWidth={1.5} /> FREE
          </div>
          <div className="mt-2 font-display text-3xl font-semibold">
            0 ₽
            <span className="ml-2 text-base font-normal text-text-muted">
              навсегда
            </span>
          </div>
          <p className="mt-2 text-sm text-text-muted">
            Чтобы попробовать. Без карты.
          </p>
          <ul className="mt-5 flex flex-col gap-2 text-sm">
            {FREE_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2">
                <Check
                  size={16}
                  strokeWidth={2}
                  className="mt-0.5 shrink-0 text-aurora-1"
                />
                <span>{f}</span>
              </li>
            ))}
          </ul>
          <div className="mt-6">
            <Link href="/lesson/pythagoras">
              <GlassButton variant="primary" size="md" className="w-full justify-center">
                Открыть демо-урок
              </GlassButton>
            </Link>
          </div>
        </GlassPanel>

        {/* Pro */}
        <GlassPanel
          padding="lg"
          className="relative flex flex-col border-accent-gold/30 bg-accent-gold/[0.04]"
        >
          <div className="absolute -top-3 right-4 rounded-full border border-accent-gold/40 bg-bg-deep px-3 py-1 text-[11px] font-medium uppercase tracking-widest text-accent-gold">
            популярный
          </div>
          <div className="flex items-center gap-2 text-accent-gold">
            <Crown size={16} strokeWidth={1.5} /> PRO
          </div>
          <div className="mt-2 font-display text-3xl font-semibold">
            500 ₽
            <span className="ml-2 text-base font-normal text-text-muted">
              в месяц
            </span>
          </div>
          <p className="mt-2 text-sm text-text-muted">
            Полный доступ к программе профиля ЕГЭ.
          </p>
          <ul className="mt-5 flex flex-col gap-2 text-sm">
            {PRO_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2">
                <Check
                  size={16}
                  strokeWidth={2}
                  className="mt-0.5 shrink-0 text-accent-gold"
                />
                <span>{f}</span>
              </li>
            ))}
          </ul>
          <div className="mt-6">
            <GlassButton
              variant="gold"
              size="md"
              onClick={buy}
              disabled={busy}
              className="w-full justify-center"
            >
              <Crown size={16} strokeWidth={1.5} /> Купить Pro
            </GlassButton>
            {hint && (
              <p className="mt-3 rounded-glass border border-aurora-2/30 bg-aurora-2/10 p-3 text-xs text-text-primary">
                {hint}
              </p>
            )}
          </div>
        </GlassPanel>
      </section>

      <section className="mt-10">
        <GlassPanel padding="md" className="flex flex-wrap items-center gap-3 text-sm text-text-muted">
          <ShieldCheck size={18} strokeWidth={1.5} className="text-aurora-1" />
          <span>
            14 дней на возврат · отписка в один клик · оплата картой РФ или
            СБП после запуска приёма платежей.
          </span>
        </GlassPanel>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold">Часто спрашивают</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Faq
            q="Что входит в бесплатную версию?"
            a="Демо-урок «Теорема Пифагора» в полноэкранном формате с 3D-учителем — чтобы понять, нравится ли тебе подача. Программа курса и описание 19 заданий доступны без регистрации."
          />
          <Faq
            q="Сколько стоит Pro?"
            a="500 ₽ в месяц. Без скрытых доплат. Доступ ко всем 19 заданиям профиля ЕГЭ, теории и бесконечной практике."
          />
          <Faq
            q="Можно ли вернуть деньги?"
            a="Да, в течение 14 дней — мы вернём всю сумму без вопросов."
          />
          <Faq
            q="Откуда у меня может быть Pro прямо сейчас?"
            a="Если ты администратор сервиса — у тебя автоматически активирован Pro. Покупка для остальных пользователей подключится с первым же релизом платежей."
          />
        </div>
      </section>
    </main>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <GlassPanel padding="md">
      <div className="font-display font-semibold">{q}</div>
      <p className="mt-1 text-sm text-text-muted">{a}</p>
    </GlassPanel>
  );
}
