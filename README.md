# ProfMath.School

Интерактивная онлайн-школа профильной математики ЕГЭ с 3D ИИ-учителем у виртуальной доски.

> Стек: **Next.js 14 (App Router) + TypeScript**, Tailwind, Three.js (`@react-three/fiber`/`drei`/`xr`), Ready Player Me .glb, Mistral AI, Yandex SpeechKit (с Web Speech fallback), Prisma + SQLite.

---

## Быстрый старт

```bash
pnpm install
cp .env.example .env.local
pnpm prisma migrate dev --name init
pnpm prisma db seed
pnpm dev
```

Открой <http://localhost:3000>.

В сидере уже есть демо-пользователь `demo@profmath.school` и **3 урока**:

1. **Теорема Пифагора** — `/lesson/pythagoras`
2. **Производная произведения** — `/lesson/derivative-product`
3. **Объём пирамиды** (с 3D-фигурой и OrbitControls) — `/lesson/pyramid-volume`

## Переменные окружения

| Ключ | Что | Обязательно |
| --- | --- | --- |
| `MISTRAL_API_KEY_PRIMARY` | Основной ключ Mistral | да |
| `MISTRAL_API_KEY_BACKUP` | Резервный ключ (фолбэк PRIMARY → BACKUP) | желательно |
| `MISTRAL_MODEL_FAST` | Модель для chat/Q&A | по умолчанию `mistral-small-latest` |
| `MISTRAL_MODEL_HARD` | Модель для генерации уроков | по умолчанию `mistral-large-latest` |
| `YANDEX_SPEECHKIT_KEY` | Ключ SpeechKit. Если пусто — fallback на Web Speech API | нет |
| `YANDEX_SPEECHKIT_FOLDER` | Folder ID Yandex Cloud | нет |
| `DATABASE_URL` | строка БД (`file:./dev.db` для SQLite, `postgres://…` для Supabase) | да |
| `NEXT_PUBLIC_DEFAULT_AVATAR` | URL `.glb` Ready Player Me | желательно |

## Архитектура

```
app/
  page.tsx                   # лендинг + Hero 3D-демо
  app/page.tsx               # кабинет
  lesson/[slug]/page.tsx     # полноэкранный урок
  share/[uuid]/page.tsx      # восстановление доски
  api/
    me/route.ts              # GET профиль + список уроков
    lesson/start/route.ts    # POST {slug|lessonId} -> {script}
    lesson/generate/route.ts # POST {topic} -> сгенерённый урок
    lesson/share/route.ts    # POST {stateJson} -> {uuid}
    share/[uuid]/route.ts    # GET состояние доски + intro от Mistral
    chat/route.ts            # POST вопрос -> {answer, board_commands[]}
    tts/route.ts             # POST {text} -> audio/mpeg (Yandex)
    attempt/route.ts         # POST {lessonId, score}
components/
  Scene3D.tsx                # <Canvas> + сцена урока (light/starry)
  Avatar.tsx                 # RPM .glb + audio-energy lipsync + жесты
  Blackboard.tsx             # доска 4×2.5м + 3D-фигура + OrbitControls
  HUD.tsx                    # верхний/нижний HUD
  AskPanel.tsx               # «Прерви и спроси» (текст/микрофон)
  DrawOverlay.tsx            # «Дорисуй сам»
  ColdCall.tsx               # холодный звонок с таймером
  AuroraBackground.tsx       # noise + 3 aurora-blob
  GlassPanel.tsx / GlassButton.tsx
  ThemeToggle.tsx            # 🌗 переключатель темы
  HeroDemo.tsx               # маленькая 3D-сцена для лендинга
lib/
  llm.ts                     # Mistral wrapper c фолбэком ключа, ретраями, 20s timeout
  tts.ts                     # Yandex (server) + Web Speech (client) с авто-fallback
  scene-queue.ts             # последовательный плеер сцен
  board-renderer.ts          # 2D-рендер команд доски (CanvasTexture для Three)
  pdf-export.ts              # html2canvas + jsPDF
  audio-cache.ts             # IndexedDB кэш TTS
  store.ts                   # zustand: theme + lesson state
  prisma.ts / auth.ts / utils.ts / types.ts
prisma/
  schema.prisma              # User/Lesson/Progress/Attempt/ChatMessage/BoardSnapshot
  seed.ts                    # 3 готовых урока
```

## Реализованные WOW-фичи

- **Прерви и спроси** — пауза, индикатор «думает», ответ, диалог «Возвращаемся к лекции? [Да/Нет]».
- **Доска как 3D-объект** — `draw_3d_solid` рендерит реальный `Mesh + EdgesGeometry`, `OrbitControls` для вращения и зума.
- **Дорисуй сам** — `interactive: 'draw'` сцены показывают `<DrawOverlay/>`, координаты штрихов уезжают в Mistral за фидбеком.
- **Темп 0.25×–3×** + кнопка `↻` «повтори другими словами» (новый промт + новый TTS, та же доска).
- **Любая тема по запросу** — на `/app` строка «Объясни мне X» → `/api/lesson/generate` → новый урок с уникальным `slug`.
- **Холодный звонок** — каждые 8–10 минут случайно: пауза + задача + 60-секундный таймер.
- **PDF-конспект** — снимок доски + текст всех сцен через `jsPDF`.
- **Класс под звёздами** — кнопка-`Moon` переключает skybox с `<Stars/>` и фиолетовым светом.
- **Поделиться доской** — `/share/[uuid]`, состояние сериализуется в БД, при открытии доска восстанавливается, аватар произносит intro, сгенерённый Mistral по контексту.
- **WebXR** — кнопка VR проверяет `navigator.xr`. Сцена использует `@react-three/fiber`, совместимый с `@react-three/xr` (XRButton можно подключить по необходимости).

## Производительность

- **LOD аватара**: при `devicePixelRatio < 2` или `hardwareConcurrency < 4` подгружается RPM с `?textureAtlas=512`.
- **2D-fallback**: если WebGL недоступен — `Scene3D` показывает текстовое сообщение, аудио и доска работают независимо.
- **TTS-кэш**: `lib/audio-cache.ts` хранит аудио в IndexedDB по `sha256(voice|text)`.
- **Сцены играются последовательно** через `SceneRunner`; следующий TTS начинает грузиться, как только текущий закончил воспроизведение (естественный батчинг).

## Скрипты

| Команда | Что делает |
| --- | --- |
| `pnpm dev` | Запуск dev-сервера |
| `pnpm build` | `prisma generate` + `next build` |
| `pnpm start` | Прод-старт |
| `pnpm lint` | ESLint |
| `pnpm format` | Prettier |
| `pnpm prisma:seed` | Перезаливка демо-уроков |

## Замечания по TalkingHead.js

Спецификация просит использовать [TalkingHead.js](https://github.com/met4citizen/TalkingHead) напрямую. Библиотека ESM-only и плохо бандлится в Next через webpack — поэтому реализован совместимый по поведению путь:

- 3D-аватар грузится через `@react-three/drei`'s `useGLTF` прямо с CDN Ready Player Me;
- **lip-sync по audio-energy** реализован вручную через Web Audio API `AnalyserNode` и `morphTargetInfluences` (`mouthOpen`, `jawOpen`, `viseme_*`) — тот же приём, что использует TalkingHead;
- жесты переключаются через простой стейт-машину `wave / idle / explain / listen / point`.

Если нужен *полностью* нативный TalkingHead — его можно подключить отдельным `<div>`-контейнером без R3F, но он будет рисовать **свою** Three-сцену поверх и хуже интегрироваться с доской.
