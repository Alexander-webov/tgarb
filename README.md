# TGArb JS — Arbitrage Platform

Полный рефактор на **Next.js 14 + Prisma + Agenda + gram.js + grammY**.

---

## Стек

| Слой         | Технология                          |
|--------------|-------------------------------------|
| Frontend     | Next.js 14 App Router, Tailwind CSS |
| API          | Next.js API Routes                  |
| База данных  | PostgreSQL + Prisma ORM             |
| Очереди      | Agenda (MongoDB)                    |
| TG MTProto   | gram.js (парсинг, рассылка)         |
| TG Bot       | grammY (воронки)                    |
| WebSocket    | ws (real-time обновления)           |
| Инфраструктура | Docker Compose                    |

---

## Структура

```
tgarb-js/
├── src/
│   ├── app/                    — Next.js страницы и API routes
│   │   ├── (dashboard)/page.jsx — Главная
│   │   ├── accounts/           — Аккаунты
│   │   ├── campaigns/          — Рассылки
│   │   ├── channels/           — Каналы
│   │   ├── discover/           — Поиск каналов
│   │   ├── offers/             — Офферы
│   │   ├── analytics/          — Аналитика
│   │   ├── roi/                — ROI Калькулятор
│   │   ├── warmup/             — Прогрев аккаунтов
│   │   ├── funnels/            — Воронки
│   │   ├── tracker/            — UTM-трекер
│   │   ├── settings/           — Настройки
│   │   └── api/                — API Routes
│   ├── components/             — React компоненты
│   └── lib/                    — Библиотеки
│       ├── prisma.js           — Prisma client
│       ├── agenda.js           — Agenda client
│       ├── ws.js               — WebSocket manager
│       ├── tracker.js          — UTM трекинг
│       ├── env.js              — Переменные окружения
│       ├── cpa/                — CPA сети (Admitad, LeadGid, Alfaleads)
│       └── telegram/
│           ├── client.js       — gram.js: AccountPool, Sender, Parser
│           └── warmup.js       — Умный прогрев + детектор бана
├── workers/
│   └── agenda.js               — Фоновые задачи (рассылки, прогрев, парсинг)
├── bot/
│   └── index.js                — grammY бот с воронками
├── prisma/
│   └── schema.prisma           — Схема БД
├── server.js                   — Custom Next.js сервер с WebSocket
├── docker-compose.yml
├── Dockerfile
├── Dockerfile.worker
├── Dockerfile.bot
└── .env.example
```

---

## Быстрый старт

### 1. Настрой переменные

```bash
cp .env.example .env
nano .env   # Заполни TG_API_ID, TG_API_HASH, BOT_TOKEN
```

### 2. Запусти через Docker

```bash
docker-compose up -d
```

Первый запуск скачает образы (~500MB, 3-5 минут).

### 3. Открой панель

```
http://localhost:3000
```

---

## Разработка без Docker

```bash
# Запусти PostgreSQL и MongoDB локально, потом:
npm install
npx prisma db push
npm run dev        # Next.js (порт 3000)
npm run worker     # Agenda воркер (отдельный терминал)
npm run bot        # Telegram бот (отдельный терминал)
```

---

## API Routes

| Метод | Путь                          | Описание                    |
|-------|-------------------------------|-----------------------------|
| GET   | /api/accounts                 | Список аккаунтов            |
| POST  | /api/accounts                 | Добавить аккаунт            |
| POST  | /api/accounts/[id]/session    | Загрузить .session файл     |
| POST  | /api/accounts/[id]/connect    | Подключить клиент           |
| GET   | /api/channels                 | Список каналов              |
| POST  | /api/channels                 | Добавить канал              |
| POST  | /api/channels/[id]/parse-members | Парсить участников       |
| GET   | /api/channels/discover/search | Поиск каналов в Telegram    |
| GET   | /api/campaigns                | Список рассылок             |
| POST  | /api/campaigns                | Создать рассылку            |
| POST  | /api/campaigns/[id]/start     | Запустить рассылку          |
| POST  | /api/campaigns/[id]/pause     | Поставить на паузу          |
| GET   | /api/offers                   | Список офферов              |
| POST  | /api/offers                   | Добавить оффер              |
| GET   | /api/cpa/networks             | Статус CPA-сетей            |
| POST  | /api/cpa/sync                 | Синхронизировать офферы     |
| GET   | /api/cpa/stats                | Статистика по сетям         |
| GET   | /api/tracker/links            | UTM-ссылки                  |
| POST  | /api/tracker/links            | Создать UTM-ссылку          |
| GET   | /r/[slug]                     | Редирект + трекинг клика    |
| GET   | /api/postback                 | S2S постбэк от CPA          |
| GET   | /api/analytics/dashboard      | Главная статистика          |
| POST  | /api/analytics/roi            | Расчёт ROI                  |
| GET   | /api/warmup/stats             | Статистика прогрева         |
| POST  | /api/warmup/[id]/start        | Запустить шаг прогрева      |
| POST  | /api/warmup/[id]/niche        | Установить нишу             |
| POST  | /api/warmup/run-cycle         | Запустить цикл прогрева     |
| GET   | /api/proxies                  | Список прокси               |
| POST  | /api/proxies                  | Добавить прокси             |
| GET   | /api/funnels                  | Список воронок              |
| POST  | /api/funnels                  | Создать воронку             |
| WS    | ws://host/api/ws              | Real-time события           |

---

## Agenda задачи

| Задача              | Триггер              | Описание                     |
|---------------------|----------------------|------------------------------|
| run_campaign        | POST /campaigns/start | Запуск рассылки              |
| parse_members       | POST /channels/parse  | Парсинг участников           |
| parse_posts         | Manual               | Парсинг постов канала        |
| warmup_step         | POST /warmup/start   | Один шаг прогрева            |
| warmup_cycle        | Каждые 2 часа        | Цикл прогрева всех аккаунтов |
| reset_daily_limits  | Полночь              | Сброс счётчиков              |
| check_proxies       | Каждые 30 мин        | Проверка прокси              |

---

## WebSocket события

```javascript
// Подключение
const ws = new WebSocket('ws://localhost:3000/api/ws')
ws.onmessage = (e) => {
  const { event, data } = JSON.parse(e.data)
  // event: campaign_progress | warmup_progress | conversion
  //        account_status | new_post | system_alert
}
```

---

## Отличия от Python версии

| Компонент      | Python (v4)        | JS (v5)              |
|----------------|--------------------|----------------------|
| Backend        | FastAPI            | Next.js API Routes   |
| ORM            | SQLAlchemy async   | Prisma               |
| Очереди        | Celery + Redis     | Agenda + MongoDB     |
| TG клиент      | Telethon           | gram.js              |
| Bot            | aiogram 3          | grammY               |
| Frontend       | Vite + React SPA   | Next.js App Router   |
| Деплой         | 6 контейнеров      | 5 контейнеров        |
