import { PrismaClient } from '@prisma/client';
import type { LessonScript } from '../lib/types';
import { createHash } from 'crypto';

const prisma = new PrismaClient();

const PWD_SALT = process.env.NEXTAUTH_SECRET ?? 'vsa-salt';
function hashPwd(plain: string): string {
  return createHash('sha256').update(`${PWD_SALT}::${plain}`).digest('hex');
}

const pythagoras: LessonScript = {
  title: 'Теорема Пифагора',
  duration_sec: 540,
  scenes: [
    {
      type: 'intro',
      tts: 'Привет! Сегодня разберём теорему Пифагора — фундамент всей планиметрии в ЕГЭ.',
      avatar_action: 'wave',
      duration: 5,
    },
    {
      type: 'board_draw',
      tts: 'Начнём с прямоугольного треугольника. Катеты a и b, гипотенуза c.',
      board_command: { action: 'draw_triangle', kind: 'right', labels: ['a', 'b', 'c'] },
      duration: 9,
    },
    {
      type: 'formula',
      tts: 'Главная формула: квадрат гипотенузы равен сумме квадратов катетов.',
      board_command: { action: 'write_formula', latex: 'c^{2} = a^{2} + b^{2}' },
      duration: 7,
    },
    {
      type: 'explain',
      tts: 'Геометрический смысл: площадь квадрата на гипотенузе равна сумме площадей квадратов на катетах.',
      board_command: { action: 'highlight', region: { x: 0.55, y: 0.4, w: 0.3, h: 0.3 } },
      duration: 8,
    },
    {
      type: 'example',
      tts: 'Пример. Если катеты равны три и четыре, то гипотенуза равна корень из двадцати пяти, то есть пять.',
      board_command: { action: 'write_formula', latex: 'c = \\sqrt{3^{2}+4^{2}} = \\sqrt{25} = 5' },
      duration: 10,
    },
    {
      type: 'practice',
      tts: 'А теперь твоя очередь. Катеты восемь и пятнадцать. Чему равна гипотенуза? Подумай и спроси, если нужна подсказка.',
      board_command: { action: 'write_text', text: 'a = 8,  b = 15,  c = ?' },
      duration: 10,
      interactive: 'draw',
    },
    {
      type: 'outro',
      tts: 'Отлично. Теорема Пифагора применяется в задачах с прямоугольными треугольниками и в координатном методе. До встречи на следующем уроке!',
      avatar_action: 'idle',
      duration: 7,
    },
  ],
};

const derivativeProduct: LessonScript = {
  title: 'Производная произведения',
  duration_sec: 480,
  scenes: [
    {
      type: 'intro',
      tts: 'Сегодня — правило произведения. Очень частая тема в задаче 12 ЕГЭ.',
      avatar_action: 'wave',
      duration: 5,
    },
    {
      type: 'formula',
      tts: 'Если функция представлена в виде произведения, её производная вычисляется по формуле Лейбница.',
      board_command: { action: 'write_formula', latex: "(uv)' = u'v + uv'" },
      duration: 7,
    },
    {
      type: 'example',
      tts: 'Возьмём функцию f от икс равно икс на синус икс.',
      board_command: { action: 'write_formula', latex: 'f(x) = x \\cdot \\sin x' },
      duration: 6,
    },
    {
      type: 'explain',
      tts: 'Производная икс равна единице, производная синуса — косинус. Подставляем.',
      board_command: { action: 'write_formula', latex: "f'(x) = 1\\cdot\\sin x + x\\cdot\\cos x" },
      duration: 8,
    },
    {
      type: 'graph',
      tts: 'Посмотрим на график. Видно, что в нулях производной функция имеет экстремум.',
      board_command: {
        action: 'draw_function_graph',
        expr: 'x*sin(x)',
        xRange: [-6.28, 6.28],
      },
      duration: 9,
    },
    {
      type: 'practice',
      tts: 'Найди производную функции икс в квадрате на экспоненту. Подсказку получишь по запросу.',
      board_command: { action: 'write_formula', latex: "g(x) = x^{2} e^{x},\\quad g'(x) = ?" },
      duration: 10,
    },
    {
      type: 'outro',
      tts: 'Запомни: u штрих v плюс u v штрих. Тренируй на десяти задачах в день — и формула станет рефлексом.',
      avatar_action: 'idle',
      duration: 6,
    },
  ],
};

const pyramidVolume: LessonScript = {
  title: 'Объём пирамиды',
  duration_sec: 600,
  scenes: [
    {
      type: 'intro',
      tts: 'Стереометрия. Сегодня — объём пирамиды. Это задача 13 второй части.',
      avatar_action: 'wave',
      duration: 5,
    },
    {
      type: 'formula',
      tts: 'Объём пирамиды равен одной трети произведения площади основания на высоту.',
      board_command: { action: 'write_formula', latex: 'V = \\tfrac{1}{3} S_{\\text{осн}} \\cdot h' },
      duration: 7,
    },
    {
      type: 'board_draw',
      tts: 'Рассмотрим правильную четырёхугольную пирамиду. Можешь покрутить её мышью.',
      board_command: { action: 'draw_3d_solid', shape: 'pyramid', sides: 4, height: 1.6 },
      duration: 12,
    },
    {
      type: 'example',
      tts: 'Пусть сторона основания четыре, высота шесть. Площадь основания — шестнадцать.',
      board_command: { action: 'write_formula', latex: 'S_{\\text{осн}} = 4^{2} = 16' },
      duration: 7,
    },
    {
      type: 'explain',
      tts: 'Подставляем: одна третья на шестнадцать на шесть равно тридцать два.',
      board_command: { action: 'write_formula', latex: 'V = \\tfrac{1}{3}\\cdot 16 \\cdot 6 = 32' },
      duration: 8,
    },
    {
      type: 'practice',
      tts: 'Твоя задача. Треугольная пирамида со стороной шесть и высотой пять. Чему равен объём?',
      board_command: { action: 'draw_3d_solid', shape: 'pyramid', sides: 3, height: 1.4 },
      duration: 10,
    },
    {
      type: 'outro',
      tts: 'Главное — не путай высоту пирамиды с апофемой. Удачи на ЕГЭ!',
      avatar_action: 'idle',
      duration: 6,
    },
  ],
};

async function main() {
  // Free demo user (used as anonymous fallback)
  const user = await prisma.user.upsert({
    where: { email: 'demo@viora.academy' },
    update: { plan: 'free', role: 'user' },
    create: {
      email: 'demo@viora.academy',
      name: 'Гость',
      plan: 'free',
      role: 'user',
      streak: 0,
    },
  });

  // Admin account: login by username 'badvino', password '2604'
  const admin = await prisma.user.upsert({
    where: { email: 'badvino@viora.academy' },
    update: {
      name: 'badvino',
      plan: 'pro',
      role: 'admin',
      passwordHash: hashPwd('26041986'),
    },
    create: {
      email: 'badvino@viora.academy',
      name: 'badvino',
      plan: 'pro',
      role: 'admin',
      streak: 0,
      passwordHash: hashPwd('26041986'),
    },
  });
  console.log('Admin', admin.name, '— role:', admin.role, 'plan:', admin.plan);

  // Demo PRO test user — for the user to log in and check Pro UX.
  const pro = await prisma.user.upsert({
    where: { email: 'tester@viora.academy' },
    update: {
      name: 'tester',
      plan: 'pro',
      role: 'user',
      passwordHash: hashPwd('vsa12345'),
    },
    create: {
      email: 'tester@viora.academy',
      name: 'tester',
      plan: 'pro',
      role: 'user',
      streak: 3,
      passwordHash: hashPwd('vsa12345'),
    },
  });
  console.log('PRO test user', pro.name, 'email:', pro.email, '/ pass: vsa12345');

  const lessons: Array<{ slug: string; topic: string; isPro: boolean; script: LessonScript }> = [
    { slug: 'pythagoras', topic: 'Планиметрия', isPro: false, script: pythagoras },
    { slug: 'derivative-product', topic: 'Алгебра', isPro: false, script: derivativeProduct },
    { slug: 'pyramid-volume', topic: 'Стереометрия', isPro: true, script: pyramidVolume },
  ];

  for (const l of lessons) {
    await prisma.lesson.upsert({
      where: { slug: l.slug },
      update: {
        title: l.script.title,
        topic: l.topic,
        durationSec: l.script.duration_sec,
        script: JSON.stringify(l.script),
        isPro: l.isPro,
      },
      create: {
        slug: l.slug,
        title: l.script.title,
        topic: l.topic,
        durationSec: l.script.duration_sec,
        isPro: l.isPro,
        script: JSON.stringify(l.script),
      },
    });
  }

  console.log('Seeded user', user.email, 'and', lessons.length, 'lessons.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
