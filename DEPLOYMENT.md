# Развёртывание Viora Smart Academy (VSA)

Этот документ — **подробная инструкция, как поднять боевую базу данных
и выкатить сайт на бесплатный хостинг с доступом из РФ без VPN.**

---

## 1. База данных (рекомендация: **Supabase**)

Из таблицы, которую ты прислал, бесплатные Postgres-варианты с РФ-доступом
без VPN — **Supabase** или **Neon**. Я выбрал **Supabase**, потому что:

- 500 МБ Postgres + авто-бэкапы;
- pgBouncer-пул в комплекте — то, что нужно serverless'у Vercel;
- API-панель с SQL-редактором и Storage (можно потом перенести аватары туда).

### Что мне нужно от тебя

1. Зайди на https://supabase.com → **Sign up** (можно через GitHub).
2. **New project** → имя `viora-smart-academy`, регион выбери поближе
   (Frankfurt / West EU).
3. Запиши **Database password** — его нельзя посмотреть второй раз.
4. После создания (~2 минуты) открой:

   - `Project Settings → Database → Connection string → URI` (вкладка
     **Transaction pooler** или **pooled** — порт 6543).
     Скопируй строку вида:
     ```
     postgresql://postgres.<ref>:<pwd>@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
     ```
     Это **DATABASE_URL** для рантайма.

   - На той же странице — **Direct connection** (порт 5432). Это
     **DIRECT_URL**, нужен Prisma для миграций.

5. Пришли мне обе строки **в чате**. Я подставлю их в Vercel и поменяю
   provider в схеме на `postgresql`. После этого выполню:

   ```bash
   DATABASE_URL=... DIRECT_URL=... npx prisma migrate deploy
   npm run prisma:seed
   ```

Если у тебя есть свой Supabase API key — отдельно он не нужен; для Prisma
достаточно DATABASE_URL/DIRECT_URL.

### Альтернатива: Neon

То же самое, но https://neon.tech. Один URL без отдельного DIRECT_URL
(достаточно `?sslmode=require`). Лимит — 500 МБ, тоже без VPN из РФ.

---

## 2. Хостинг — **Vercel**

Я выбрал **Vercel**, потому что проект на Next.js 14 (App Router) и
именно Vercel поддерживает его serverless-функции «из коробки» — не
нужно ничего переписывать. По твоей таблице Vercel доступен в РФ без
VPN, free-план — 100 ГБ трафика.

> Cloudflare Pages подошёл бы только под чисто статический фронт, а у
> нас живой backend (Mistral AI, авторизация, Prisma) — пришлось бы
> дополнительно переезжать на Workers + D1. Vercel это убирает.

### Шаги

1. https://vercel.com → **Sign up** через GitHub.
2. Залей репозиторий с этим кодом на GitHub.
3. **Add New → Project → Import** твой репозиторий.
4. В настройках добавь environment variables (значения из `.env.example`
   плюс реальный DATABASE_URL/DIRECT_URL из Supabase):

   | Key | Value |
   | --- | --- |
   | `DATABASE_URL` | (из Supabase, pooled, 6543) |
   | `DIRECT_URL` | (из Supabase, direct, 5432) |
   | `MISTRAL_API_KEY_PRIMARY` | твой ключ |
   | `MISTRAL_API_KEY_BACKUP` | твой ключ |
   | `MISTRAL_MODEL_FAST` | `mistral-small-latest` |
   | `MISTRAL_MODEL_HARD` | `mistral-large-latest` |
   | `NEXTAUTH_SECRET` | сгенерируй `openssl rand -hex 32` |
   | `NEXT_PUBLIC_DEFAULT_AVATAR` | (как в .env.example) |

5. **Deploy**. Через ~2 минуты получишь домен `viora-smart-academy.vercel.app`.
6. Подключи свой домен (если есть) в **Settings → Domains**.

После каждого `git push` Vercel сам пересобирает проект.

---

## 3. Что я уже сделал в коде

- Brand: переименовал `ProfMath.School` → `Viora Smart Academy (VSA)`.
- Лого: новый компонент `components/VsaLogo.tsx`.
- Настройки в кабинете: `components/SettingsModal.tsx` + API `/api/me/update`
  (смена ника и пароля; аватар хранится локально + в Supabase Storage —
  можно подключить позже).
- Деплой-конфиг: `vercel.json` (force Node runtime для Prisma).
- Документация Supabase/Vercel: этот файл.

После того как пришлёшь `DATABASE_URL` + `DIRECT_URL` — я переключу
схему на `postgresql`, прогоню миграции и сидер, и можно будет
деплоиться одним кликом.
