'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  PlayCircle,
  ArrowRight,
  GraduationCap,
  BookOpen,
  Wand2,
  Trophy,
  CheckCircle2,
  LogIn,
} from 'lucide-react';
import { GlassPanel } from '@/components/GlassPanel';
import { GlassButton } from '@/components/GlassButton';
import { AnimatedTeacher } from '@/components/AnimatedTeacher';
import { AuthModal } from '@/components/AuthModal';
import { VsaLogo } from '@/components/VsaLogo';
import { SplashIntro } from '@/components/SplashIntro';
import { EGE_TASKS } from '@/lib/ege-tasks';

export default function Landing() {
  const router = useRouter();
  const [authOpen, setAuthOpen] = useState(false);

  return (
    <main className="relative mx-auto max-w-7xl px-5 pb-24 pt-6 md:px-8 md:pt-10">
      <SplashIntro />
      {/* Top bar */}
      <header className="flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2">
          <VsaLogo size={36} />
          <div className="flex flex-col leading-none">
            <span className="font-display text-lg font-semibold tracking-tight">
              Viora <span className="text-aurora-2">Smart Academy</span>
            </span>
            <span className="mt-0.5 text-[10px] uppercase tracking-[0.25em] text-text-muted">VSA</span>
          </div>
        </Link>
        <nav className="ml-auto hidden items-center gap-1 md:flex">
          <Link href="/how-it-works">
            <GlassButton variant="ghost" size="sm">
              Как это работает
            </GlassButton>
          </Link>
          <Link href="/pricing">
            <GlassButton variant="ghost" size="sm">
              Тарифы
            </GlassButton>
          </Link>
          <Link href="/lesson/pythagoras">
            <GlassButton variant="ghost" size="sm">
              <PlayCircle size={16} strokeWidth={1.5} /> Демо-урок
            </GlassButton>
          </Link>
          <GlassButton variant="ghost" size="sm" onClick={() => setAuthOpen(true)}>
            <LogIn size={16} strokeWidth={1.5} /> Войти
          </GlassButton>
        </nav>
        <button
          onClick={() => setAuthOpen(true)}
          className="ml-auto rounded-glass border border-white/10 bg-white/[0.05] px-3 py-1.5 text-sm md:hidden"
        >
          Войти
        </button>
      </header>

      {/* Hero */}
      <section className="mt-10 grid items-center gap-8 md:mt-16 md:grid-cols-[1.1fr_1fr]">
        <div className="order-2 md:order-1">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-text-muted">
            <Sparkles size={14} strokeWidth={1.5} className="text-aurora-1" />
            Профильная математика ЕГЭ — с 3D-учителем
          </span>
          <h1 className="mt-4 font-display text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
            Решай ЕГЭ так, <br className="hidden md:inline" />
            будто рядом{' '}
            <span className="bg-gradient-to-r from-aurora-1 via-aurora-2 to-aurora-3 bg-clip-text text-transparent">
              живой репетитор
            </span>
            .
          </h1>
          <p className="mt-5 max-w-xl text-base text-text-muted md:text-lg">
            19 заданий профиля. Виртуальный учитель объясняет теорию у доски,
            затем ИИ генерирует тебе бесконечную практику и проверяет ответы.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <GlassButton
              variant="gold"
              size="lg"
              onClick={() => router.push('/app')}
            >
              Начать бесплатно <ArrowRight size={18} strokeWidth={1.5} />
            </GlassButton>
            <Link href="/lesson/pythagoras">
              <GlassButton variant="primary" size="lg">
                <PlayCircle size={18} strokeWidth={1.5} /> Демо-урок
              </GlassButton>
            </Link>
            <Link href="/how-it-works" className="md:hidden">
              <GlassButton variant="ghost" size="lg">
                Как это работает
              </GlassButton>
            </Link>
          </div>

          <div className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-sm text-text-muted">
            <span className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-aurora-1" /> Все 19
              заданий профиля
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-aurora-1" /> Теория за 3–5
              минут
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-aurora-1" /> Бесконечная
              практика от Viora AI
            </span>
          </div>
        </div>

        <GlassPanel
          padding="none"
          className="order-1 h-[280px] overflow-hidden md:order-2 md:h-[460px]"
        >
          <AnimatedTeacher />
        </GlassPanel>
      </section>

      {/* Features */}
      <section className="mt-20 grid gap-5 md:grid-cols-3">
        <Feature
          icon={<GraduationCap size={20} strokeWidth={1.5} />}
          title="Учитель у доски"
          text="Анимированный преподаватель проговаривает теорию голосом и пишет на виртуальной доске."
        />
        <Feature
          icon={<Wand2 size={20} strokeWidth={1.5} />}
          title="ИИ-генерация задач"
          text="Viora AI создаёт новую задачу любого из 19 номеров. Ответ проверяется автоматически."
        />
        <Feature
          icon={<Trophy size={20} strokeWidth={1.5} />}
          title="Прогресс по 19 заданиям"
          text="Стрики, отметки «просмотрено», очки за каждую решённую практику. Готовься системно."
        />
      </section>

      {/* Tasks preview */}
      <section className="mt-20">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-xs uppercase tracking-widest text-text-muted">
              Программа
            </div>
            <h2 className="mt-1 font-display text-3xl font-semibold tracking-tight md:text-4xl">
              19 заданий профильной математики
            </h2>
          </div>
          <Link
            href="/app"
            className="hidden text-sm text-aurora-2 hover:text-aurora-1 md:block"
          >
            Перейти в кабинет →
          </Link>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {EGE_TASKS.map((t) => (
            <GlassPanel
              key={t.id}
              hoverable
              padding="md"
              className="flex items-start gap-3"
            >
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.06] font-mono text-aurora-1">
                {t.id}
              </div>
              <div className="min-w-0">
                <div className="font-display font-semibold">{t.title}</div>
                <div className="mt-0.5 line-clamp-2 text-sm text-text-muted">
                  {t.description}
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-text-muted">
                  <span className="rounded-full border border-accent-gold/30 bg-accent-gold/[0.10] px-2 py-0.5 text-accent-gold">
                    {t.primary} перв.
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5">
                    {t.approxTest} тест.
                  </span>
                </div>
              </div>
            </GlassPanel>
          ))}
        </div>

        <div className="mt-8 flex justify-center">
          <GlassButton
            variant="gold"
            size="lg"
            onClick={() => router.push('/app')}
          >
            <BookOpen size={18} strokeWidth={1.5} /> Открыть программу курса
          </GlassButton>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-24 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-xs text-text-muted">
        <span>© {new Date().getFullYear()} Viora Smart Academy · VSA</span>
        <span className="hidden sm:inline opacity-40">|</span>
        <Link href="/how-it-works" className="hover:text-text-primary">
          О сервисе
        </Link>
        <span className="opacity-40">·</span>
        <Link href="/pricing" className="hover:text-text-primary">
          Тарифы
        </Link>
        <span className="opacity-40">·</span>
        <Link href="/lesson/pythagoras" className="hover:text-text-primary">
          Демо-урок
        </Link>
        <span
          className="ml-1 inline-flex items-center rounded-full border border-white/10 bg-white/[0.05] px-2 py-0.5 font-mono text-[10px] tracking-wider text-text-muted/90 backdrop-blur-sm"
          title="Версия сборки"
        >
          v.00.01.0
        </span>
      </footer>

      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        onSuccess={() => router.push('/app')}
      />
    </main>
  );
}

function Feature({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <GlassPanel hoverable padding="lg" className="h-full">
      <div className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[0.06] text-aurora-2">
        {icon}
      </div>
      <div className="mt-4 font-display text-lg font-semibold">{title}</div>
      <p className="mt-1 text-sm text-text-muted">{text}</p>
    </GlassPanel>
  );
}
