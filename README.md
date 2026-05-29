# Status Check

Вебзастосунок для відстеження дедлайнів і зобов'язань команди. Побудований на базі календаря: замість "виконай задачу" — "проконтролюй виконання задачі іншою людиною".

## Можливості

- **Календар зобов'язань** — dayGrid / тиждень / список, drag & drop для зміни дедлайну
- **RBAC** — ролі admin та member з різними правами на редагування
- **Статуси** — `to_check`, `done`, `expired`, `not_actual`, `ideas_backlog`
- **Проєкти** — групування зобов'язань за кольоровими проєктами
- **Сповіщення** — in-app bell (Supabase Realtime + polling fallback) + email через Resend
- **Автоматичне закриття** — pg_cron кожні 5 хв переводить прострочені зобов'язання в `expired`
- **i18n** — Українська (default) та English
- **Теми** — Dark (default) та Light

## Технологічний стек

| Категорія | Технологія |
|-----------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript (strict) |
| API | tRPC v11 + TanStack Query |
| ORM | Drizzle ORM |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (email + password) |
| Realtime | Supabase Realtime |
| Scheduling | Supabase pg_cron |
| Email | Resend + React Email |
| Calendar | FullCalendar v6 |
| UI | Tailwind CSS v4 |
| i18n | next-intl |
| State | Zustand |
| Theme | next-themes |
| Deploy | Vercel + Supabase |

## Запуск через Docker (рекомендовано)

Не потребує жодних налаштувань — усі значення за замовчуванням вже вбудовані.

```bash
git clone <repo-url>
cd status-check
docker compose up --build
```

Додаток доступний на [http://localhost:3000](http://localhost:3000)

> Перший запуск займе ~3–5 хв (завантаження образів + білд Next.js).
> Подальші запуски (`docker compose up`) стартують за секунди.

### Seed-дані (опціонально)

Зареєструйся на `/register`, потім в окремому терміналі:

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres pnpm db:seed
```

### Зупинка

```bash
docker compose down          # зупинити, зберегти дані
docker compose down -v       # зупинити + видалити дані БД
```

---

## Локальний запуск (без Docker)

### 1. Встановити залежності

```bash
pnpm install
```

### 2. Налаштувати змінні середовища

```bash
cp .env.example .env.local
```

Заповнити `.env.local`:

```env
# Supabase (локально — після `supabase start`)
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key з виводу supabase start>
SUPABASE_SERVICE_ROLE_KEY=<service_role key>
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres

# Email (опціонально)
RESEND_API_KEY=<ваш Resend API key>
RESEND_FROM_EMAIL=onboarding@resend.dev

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Запустити локальний Supabase

```bash
# Потрібен Docker Desktop
supabase start
```

> **Примітка (Docker Desktop 4.75.0 + WSL2):** якщо `supabase start` падає з exit 135 (GoTrue SIGBUS) — запустіть:
> ```powershell
> .\supabase\start.ps1
> ```

### 4. Застосувати міграції

```bash
supabase migration up
```

### 5. Запустити сервер розробки

```bash
pnpm dev
```

Додаток доступний на [http://localhost:3000](http://localhost:3000)

### 6. Seed-дані (опціонально)

Зареєструватись хоча б одним користувачем на `/register`, потім:

```bash
pnpm db:seed
```

Це створить:
- Першого зареєстрованого користувача зробить **admin**
- 3 проєкти (Продуктові оновлення, Технічний борг, Маркетинг)
- 8 зобов'язань з різними статусами та дедлайнами

## Деплой на Vercel + Supabase

### Supabase (production)

1. Створити проєкт на [supabase.com](https://supabase.com)
2. Застосувати міграцію: **SQL Editor** → вставити вміст `supabase/migrations/20260101000000_initial_schema.sql`
3. Скопіювати **Project URL**, **anon key**, **service_role key** з Settings → API

### Vercel

1. Підключити GitHub репозиторій на [vercel.com](https://vercel.com)
2. У налаштуваннях проєкту додати Environment Variables:

```
NEXT_PUBLIC_SUPABASE_URL      = <Supabase Project URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY = <anon key>
SUPABASE_SERVICE_ROLE_KEY     = <service_role key>
DATABASE_URL                  = <Supabase connection string>
RESEND_API_KEY                = <Resend API key>
RESEND_FROM_EMAIL             = <verified sender email>
NEXT_PUBLIC_APP_URL           = <Vercel deployment URL>
```

3. Деплой відбувається автоматично при кожному push у `main`

### pg_cron для deadline emails (production)

У Supabase SQL Editor виконати:

```sql
-- Встановити URL застосунку
ALTER DATABASE postgres SET app.edge_function_url = 'https://your-app.vercel.app/api';
ALTER DATABASE postgres SET app.service_key = '<SUPABASE_SERVICE_ROLE_KEY>';

-- Активувати cron job для deadline emails
SELECT cron.schedule(
  'deadline-notifications',
  '0 * * * *',
  $$ SELECT net.http_post(
    url := current_setting('app.edge_function_url') || '/send-deadline-emails',
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.service_key')),
    body := '{}'::jsonb
  ); $$
);
```

## Структура проєкту

```
src/
├── app/[locale]/
│   ├── (auth)/          — login, register
│   ├── (dashboard)/     — calendar, commitments, settings
│   └── api/             — tRPC handler, send-deadline-emails
├── components/
│   ├── calendar/        — CalendarView, CalendarFilters
│   ├── commitment/      — CommitmentModal, CommitmentForm, StatusBadge
│   ├── layout/          — Sidebar, Header, ThemeToggle, LanguageSwitcher
│   ├── notifications/   — NotificationBell
│   └── ui/              — Toaster
├── emails/              — React Email templates
├── hooks/               — useRealtimeNotifications
├── lib/                 — supabase clients, email helper
├── messages/            — uk.json, en.json
├── server/
│   ├── api/routers/     — commitment, project, user, notification
│   └── db/              — Drizzle schema, seed
└── store/               — filters, toast, ui (Zustand)
```

## Команди

```bash
pnpm dev          # Сервер розробки
pnpm build        # Production build
pnpm db:push      # Синхронізувати схему (dev)
pnpm db:generate  # Згенерувати міграцію
pnpm db:migrate   # Застосувати міграції
pnpm db:seed      # Seed-дані для демо
pnpm db:studio    # Drizzle Studio (UI для БД)
```
