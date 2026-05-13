import Link from 'next/link';
import {
  ArrowLeft,
  GraduationCap,
  Wand2,
  Mic2,
  CheckCircle2,
  Sparkles,
  Trophy,
  BookOpen,
  Bot,
  ListChecks,
} from 'lucide-react';
import { GlassPanel } from '@/components/GlassPanel';
import { GlassButton } from '@/components/GlassButton';

export const metadata = {
  title: 'Как это работает — Viora Smart Academy',
  description:
    'Как устроена Viora Smart Academy (VSA): 3D-учитель, теория по 19 заданиям профиля ЕГЭ и бесконечная практика от ИИ.',
};

export default function HowItWorks() {
  return (
    <main className="mx-auto max-w-4xl px-5 pb-24 pt-6 md:px-8 md:pt-10">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-text-primary"
      >
        <ArrowLeft size={16} strokeWidth={1.5} /> На главную
      </Link>

      <header className="mt-8">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-text-muted">
          <Sparkles size={14} strokeWidth={1.5} className="text-aurora-1" />
          Как устроена Viora Smart Academy
        </span>
        <h1 className="mt-4 font-display text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
          Готовим к ЕГЭ так, как раньше можно было только{' '}
          <span className="bg-gradient-to-r from-aurora-1 via-aurora-2 to-aurora-3 bg-clip-text text-transparent">
            с репетитором
          </span>
          .
        </h1>
        <p className="mt-4 text-lg text-text-muted">
          Viora Smart Academy (VSA) — онлайн-школа профильной математики ЕГЭ. Внутри: 19
          заданий профиля, виртуальный учитель у доски и ИИ, который генерирует
          для тебя задачи и проверяет ответы.
        </p>
      </header>

      {/* 3 шага */}
      <section className="mt-12 grid gap-5 md:grid-cols-3">
        <Step
          n={1}
          icon={<BookOpen size={20} strokeWidth={1.5} />}
          title="Выбираешь номер"
          text="В кабинете — 19 заданий профиля. У каждого указан вес в первичных и тестовых баллах."
        />
        <Step
          n={2}
          icon={<GraduationCap size={20} strokeWidth={1.5} />}
          title="Смотришь теорию"
          text="Анимированный учитель за 3–5 минут проговаривает базу: формулы, идею, типичные ошибки."
        />
        <Step
          n={3}
          icon={<ListChecks size={20} strokeWidth={1.5} />}
          title="Решаешь практику"
          text="Viora AI генерирует свежую задачу твоего номера. Вводишь ответ — система проверяет."
        />
      </section>

      {/* Подробно */}
      <section className="mt-16 space-y-6">
        <Section
          icon={<GraduationCap size={20} strokeWidth={1.5} />}
          title="Виртуальный учитель"
        >
          В правой части кабинета открывается мини-окно с анимированным
          учителем. Он озвучивает теорию голосом (Yandex SpeechKit или Web
          Speech API в качестве запасного варианта) и параллельно подсвечивает
          формулы. Когда ты дослушал — нажимаешь «Просмотрено», и появляется
          кнопка «Практика».
        </Section>
        <Section
          icon={<Wand2 size={20} strokeWidth={1.5} />}
          title="Генерация задач"
        >
          За практику отвечает Viora AI. Для каждого из 19 номеров мы
          собрали методический контекст (формулы, типовые сюжеты, диапазон
          сложности), и LLM выдаёт новую задачу — с условием, ответом, 2–3
          подсказками и кратким решением. Если LLM временно недоступна — есть
          фолбэк на ключе.
        </Section>
        <Section
          icon={<Bot size={20} strokeWidth={1.5} />}
          title="Проверка ответов"
        >
          Ответ ученика сравнивается с эталоном после нормализации (пробелы,
          запятая/точка). Если не совпало по строке — отправляем оба варианта
          в LLM и просим оценить математическую эквивалентность. То есть{' '}
          <code className="rounded bg-white/[0.06] px-1">0.5</code> и{' '}
          <code className="rounded bg-white/[0.06] px-1">1/2</code> будут
          засчитаны как одно и то же.
        </Section>
        <Section
          icon={<Mic2 size={20} strokeWidth={1.5} />}
          title="Прерви и спроси"
        >
          В полноэкранных уроках есть кнопка «Спросить»: можно нажать на паузу,
          задать вопрос текстом или голосом — учитель ответит и предложит
          вернуться к лекции.
        </Section>
        <Section
          icon={<Trophy size={20} strokeWidth={1.5} />}
          title="Прогресс"
        >
          Просмотренные темы и решённые задачи сохраняются. По мере продвижения
          ты видишь, какие из 19 номеров уже закрыты, а где стоит подкачаться.
        </Section>
      </section>

      {/* CTA */}
      <section className="mt-16">
        <GlassPanel padding="lg" className="text-center">
          <div className="font-display text-2xl font-semibold md:text-3xl">
            Готов попробовать?
          </div>
          <p className="mt-2 text-text-muted">
            Регистрация занимает 10 секунд. Демо-уроки доступны без оплаты.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link href="/app">
              <GlassButton variant="gold" size="lg">
                <CheckCircle2 size={18} strokeWidth={1.5} /> Начать бесплатно
              </GlassButton>
            </Link>
            <Link href="/lesson/pythagoras">
              <GlassButton variant="primary" size="lg">
                Посмотреть демо-урок
              </GlassButton>
            </Link>
          </div>
        </GlassPanel>
      </section>
    </main>
  );
}

function Step({
  n,
  icon,
  title,
  text,
}: {
  n: number;
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <GlassPanel padding="lg" hoverable>
      <div className="flex items-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/[0.06] font-mono text-aurora-1">
          {n}
        </div>
        <div className="text-aurora-2">{icon}</div>
      </div>
      <div className="mt-4 font-display text-lg font-semibold">{title}</div>
      <p className="mt-1 text-sm text-text-muted">{text}</p>
    </GlassPanel>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <GlassPanel padding="lg">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[0.06] text-aurora-2">
          {icon}
        </div>
        <div className="font-display text-xl font-semibold">{title}</div>
      </div>
      <div className="mt-3 text-text-muted">{children}</div>
    </GlassPanel>
  );
}
