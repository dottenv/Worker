<div align="center">
  <a href="#en">EN</a>
  &nbsp;&middot;&nbsp;
  <a href="#ru">RU</a>
</div>

---

<div id="en">

<div align="center">
  <h1>Worker</h1>
  <p><strong>Service center management system</strong></p>
  <p>
    Employee scheduling, shift swaps, time tracking, and finance management
    for organizations with multiple locations.
  </p>
</div>

<details>
  <summary>Table of Contents</summary>

  - [About](#about-en)
  - [Features](#features-en)
  - [Tech Stack](#tech-stack-en)
  - [Architecture](#architecture-en)
  - [Quick Start](#quick-start-en)
  - [Manual Setup](#manual-setup-en)
  - [Configuration](#configuration-en)
  - [API Overview](#api-overview-en)
  - [Project Structure](#project-structure-en)
  - [Updating](#updating-en)
  - [License](#license)

</details>

---

<h2 id="about-en">About</h2>

Worker is a full-stack web application designed for service centers and warehouses that need to coordinate employees across multiple locations. It handles the full lifecycle of shift management — from defining shift templates and building schedules, to clocking in and out, swapping shifts, tracking finances, and generating reports.

The application is built as a Progressive Web App (PWA) with offline support, real-time updates via WebSocket, and push notifications. It is fully containerized with Docker and ready for production deployment behind a CloudPub HTTPS tunnel.

---

<h2 id="features-en">Features</h2>

<h3>Authentication and user management</h3>

<ul>
  <li>JWT-based registration and login</li>
  <li>Role-based access control: owner, admin, employee</li>
  <li>First registered user automatically becomes superuser and gets a default service center</li>
  <li>Profile editing, user color assignment, per-type notification preferences</li>
  <li>Online presence detection via WebSocket</li>
</ul>

<h3>Service centers (warehouses)</h3>

<ul>
  <li>Create and manage multiple service centers</li>
  <li>Add employees by email or select from user list</li>
  <li>Assign roles (owner, admin, employee), set hourly rates and tracking mode</li>
  <li>Cross-center management for owners</li>
  <li>Cascade delete removes all associated data</li>
</ul>

<h3>Shift templates</h3>

<ul>
  <li>Define shift templates with name, start and end time, color coding</li>
  <li>Mark shifts as paid or unpaid</li>
  <li>Templates are scoped to a service center</li>
</ul>

<h3>Schedule management</h3>

<ul>
  <li>Admin creates schedule entries per employee</li>
  <li>Full-day and hourly entry types</li>
  <li>Week-to-week schedule copying</li>
  <li>Bulk delete and quick fill</li>
  <li>Employee view shows personal schedule in a calendar table</li>
  <li>Auto-payment generation for past scheduled shifts</li>
</ul>

<h3>Shift swaps and exchanges</h3>

<ul>
  <li><strong>Swap</strong> — exchange schedules with another employee</li>
  <li><strong>Give</strong> — give a shift to another employee</li>
  <li><strong>Substitution</strong> — ask someone to cover a shift</li>
  <li><strong>Force</strong> — admin-enforced reassignment</li>
  <li>Accept, reject, and cancel flows with real-time notifications</li>
  <li>Cross-center swaps when centers share the same owner</li>
</ul>

<h3>Time tracking</h3>

<ul>
  <li>Clock in and out with auto-approval for scheduled shifts</li>
  <li>Pending approval for unscheduled clock-ins</li>
  <li>Break minutes and notes per entry</li>
  <li>Active shift indicator on dashboard</li>
  <li>Custom fields per shift (text, number, money) with carry-over</li>
  <li>Photo and document upload (up to 10 files per shift)</li>
</ul>

<h3>Finance and accounting</h3>

<ul>
  <li>Toggle finance module on or off per owner</li>
  <li>Operation types: salary, advance, payment, deduction, adjustment</li>
  <li>Auto-generated salary from hours worked or schedule entries</li>
  <li>Balance calculation and finance forecast</li>
  <li>Admin CRUD for all employee finance operations</li>
</ul>

<h3>Notifications and real-time updates</h3>

<ul>
  <li>In-app notification center with bell icon</li>
  <li>Real-time delivery via Socket.IO</li>
  <li>Web Push notifications (VAPID)</li>
  <li>Per-type opt-in and opt-out</li>
  <li>Notification sound</li>
</ul>

<h3>Progressive Web App</h3>

<ul>
  <li>Installable to home screen</li>
  <li>Service worker with precaching</li>
  <li>Push notification support in service worker</li>
  <li>Full-screen standalone mode</li>
</ul>

<h3>Additional</h3>

<ul>
  <li>Light, dark, and system theme modes</li>
  <li>Mobile-first responsive design</li>
  <li>Customizable bottom navigation</li>
  <li>Photo lightbox with swipe navigation</li>
  <li>Haptic feedback on supported devices</li>
</ul>

---

<h2 id="tech-stack-en">Tech Stack</h2>

<table>
  <thead>
    <tr>
      <th>Layer</th>
      <th>Technology</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Backend</td>
      <td>Python 3.12, Flask 3.1, Flask-SQLAlchemy 3.1</td>
    </tr>
    <tr>
      <td>Database</td>
      <td>SQLite (production: <code>/data/app.db</code>)</td>
    </tr>
    <tr>
      <td>Authentication</td>
      <td>JWT (Flask-JWT-Extended)</td>
    </tr>
    <tr>
      <td>Real-time</td>
      <td>Flask-SocketIO 5.5, gevent</td>
    </tr>
    <tr>
      <td>Push notifications</td>
      <td>Web Push API (VAPID), pywebpush</td>
    </tr>
    <tr>
      <td>Frontend</td>
      <td>React 19, TypeScript 6, Vite 8</td>
    </tr>
    <tr>
      <td>Styling</td>
      <td>Tailwind CSS 3.4 with dark mode</td>
    </tr>
    <tr>
      <td>PWA</td>
      <td>Vite PWA plugin, Workbox</td>
    </tr>
    <tr>
      <td>Reverse proxy</td>
      <td>Nginx</td>
    </tr>
    <tr>
      <td>Containerization</td>
      <td>Docker, Docker Compose</td>
    </tr>
    <tr>
      <td>Tunneling</td>
      <td>CloudPub (cloudpub.ru)</td>
    </tr>
  </tbody>
</table>

---

<h2 id="architecture-en">Architecture</h2>

<pre>
                         CloudPub tunnel
                              |
                         (public HTTPS)
                              |
                         [frontend:80]
                         Nginx reverse proxy
                        /                  \
                   /api/*              /socket.io/*
                  (HTTP)               (WebSocket)
                        \                  /
                         [backend:5000]
                         Gunicorn + gevent
                              |
                         SQLite database
                         (/data/app.db)
</pre>

Three Docker containers on a shared bridge network:

<table>
  <thead>
    <tr>
      <th>Service</th>
      <th>Image</th>
      <th>Role</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>cloudpub</code></td>
      <td><code>cloudpub/cloudpub:latest</code></td>
      <td>Creates a public HTTPS URL that tunnels to the frontend</td>
    </tr>
    <tr>
      <td><code>frontend</code></td>
      <td>Built from <code>frontend/Dockerfile</code></td>
      <td>Nginx serves the compiled SPA and proxies API and WebSocket requests to the backend</td>
    </tr>
    <tr>
      <td><code>backend</code></td>
      <td>Built from <code>backend/Dockerfile</code></td>
      <td>Flask application with Gunicorn + GeventWebSocketWorker</td>
    </tr>
  </tbody>
</table>

In production, Nginx handles:
- Serving static frontend files with long-term caching
- Proxying <code>/api/</code> requests to the backend
- Proxying <code>/socket.io/</code> WebSocket connections to the backend
- SPA fallback routing

---

<h2 id="quick-start-en">Quick Start</h2>

One-line setup on a fresh VPS with Docker installed:

```bash
bash <(curl -s https://raw.githubusercontent.com/dottenv/Worker/main/setup.sh)
```

This will:
<ol>
  <li>Clone the repository</li>
  <li>Check for Docker and OpenSSL</li>
  <li>Generate secret keys</li>
  <li>Prompt for a CloudPub token (register at <a href="https://cloudpub.ru/dashboard">cloudpub.ru</a>)</li>
  <li>Write the <code>.env</code> configuration file</li>
  <li>Build and start all containers</li>
</ol>

After startup, get the public URL:

```bash
docker compose logs cloudpub
```

The first user to register at that URL will automatically become a superuser and receive a default service center.

---

<h2 id="manual-setup-en">Manual Setup</h2>

<h3>Prerequisites</h3>

<ul>
  <li>Docker and Docker Compose</li>
  <li>OpenSSL</li>
  <li>CloudPub token (<a href="https://cloudpub.ru/dashboard">register here</a>)</li>
</ul>

<h3>Installation</h3>

```bash
git clone https://github.com/dottenv/Worker.git
cd Worker
chmod +x setup.sh
./setup.sh
```

<h3>Starting the application</h3>

```bash
docker compose --env-file .env up --build -d
```

<h3>Checking the public URL</h3>

```bash
docker compose logs cloudpub
```

Look for a line like <code>published: http://frontend:80 -> https://xxx.cloudpub.ru</code>

<h3>Development (without Docker)</h3>

<p><strong>Backend:</strong></p>

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

<p><strong>Frontend:</strong></p>

```bash
cd frontend
npm install
npm run dev
```

The Vite dev server runs on port 5173 and proxies API requests to the backend on port 5000.

---

<h2 id="configuration-en">Configuration</h2>

All configuration is done through environment variables in the <code>.env</code> file.

<table>
  <thead>
    <tr>
      <th>Variable</th>
      <th>Required</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>SECRET_KEY</code></td>
      <td>Yes</td>
      <td>Flask secret key for session signing</td>
    </tr>
    <tr>
      <td><code>JWT_SECRET_KEY</code></td>
      <td>Yes</td>
      <td>JWT signing key</td>
    </tr>
    <tr>
      <td><code>DATABASE_URL</code></td>
      <td>Yes</td>
      <td>Database connection string (default: <code>sqlite:////data/app.db</code>)</td>
    </tr>
    <tr>
      <td><code>CLOUDPUB_TOKEN</code></td>
      <td>Yes</td>
      <td>CloudPub tunnel service token</td>
    </tr>
    <tr>
      <td><code>VAPID_PRIVATE_KEY</code></td>
      <td>No</td>
      <td>Web Push private key</td>
    </tr>
    <tr>
      <td><code>VAPID_PUBLIC_KEY</code></td>
      <td>No</td>
      <td>Web Push public key</td>
    </tr>
  </tbody>
</table>

<h3>JWT token expiry</h3>

<p>Default: 7 days. Change in <code>backend/config.py</code>:</p>

```python
JWT_ACCESS_TOKEN_EXPIRES = 60 * 60 * 24 * 7
```

<h3>File upload limits</h3>

<p>Max file size: 20 MB. Configured in <code>backend/config.py</code> and <code>frontend/nginx.conf</code>.</p>
<p>Allowed file types: png, jpg, jpeg, gif, webp, bmp, pdf, doc, docx, xls, xlsx, txt, csv.</p>

<h3>Nginx client max body size</h3>

<p>Set to 20 MB in <code>frontend/nginx.conf</code>:</p>

<pre>
client_max_body_size 20M;
</pre>

---

<h2 id="api-overview-en">API Overview</h2>

The API is organized into the following groups:

<table>
  <thead>
    <tr>
      <th>Prefix</th>
      <th>Module</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>/api/auth</code></td>
      <td>Authentication</td>
      <td>Register, login, profile, user list, navigation config</td>
    </tr>
    <tr>
      <td><code>/api/service-centers</code></td>
      <td>Service centers</td>
      <td>CRUD centers, member management, custom fields</td>
    </tr>
    <tr>
      <td><code>/api/schedule</code></td>
      <td>Schedule</td>
      <td>Admin schedule management, personal view, copy, history</td>
    </tr>
    <tr>
      <td><code>/api/shifts</code></td>
      <td>Shift templates</td>
      <td>CRUD shift definitions per center</td>
    </tr>
    <tr>
      <td><code>/api/swaps</code></td>
      <td>Shift swaps</td>
      <td>Create, accept, reject, cancel swap requests</td>
    </tr>
    <tr>
      <td><code>/api/time-entries</code></td>
      <td>Time tracking</td>
      <td>Clock in/out, pending review, approval</td>
    </tr>
    <tr>
      <td><code>/api/finance</code></td>
      <td>Finance</td>
      <td>Operations, balance, forecast</td>
    </tr>
    <tr>
      <td><code>/api/notifications</code></td>
      <td>Notifications</td>
      <td>List, mark read, delete</td>
    </tr>
    <tr>
      <td><code>/api/push</code></td>
      <td>Push notifications</td>
      <td>Subscribe, unsubscribe, preferences</td>
    </tr>
    <tr>
      <td><code>/api/vapid</code></td>
      <td>VAPID</td>
      <td>Public key endpoint</td>
    </tr>
    <tr>
      <td><code>/api/shift-documents</code></td>
      <td>Documents</td>
      <td>Upload, download, delete shift documents</td>
    </tr>
  </tbody>
</table>

<h3>Authentication flow</h3>

<ol>
  <li><code>POST /api/auth/register</code> — create an account (first user becomes superuser)</li>
  <li><code>POST /api/auth/login</code> — receive a JWT token</li>
  <li>Include <code>Authorization: Bearer &lt;token&gt;</code> in all subsequent requests</li>
</ol>

---

<h2 id="project-structure-en">Project Structure</h2>

<pre>
Worker/
├── backend/                    # Python Flask application
│   ├── app.py                  # Flask factory and blueprint registration
│   ├── config.py               # Configuration and secrets
│   ├── extensions.py           # SQLAlchemy, JWT, SocketIO instances
│   ├── helpers.py              # Shared utilities
│   ├── notification_helper.py  # Debounced notification delivery
│   ├── push_helper.py          # Web Push sending
│   ├── socket_events.py        # Socket.IO event handlers
│   ├── requirements.txt        # Python dependencies
│   ├── Dockerfile              # Production image
│   ├── models/                 # SQLAlchemy models
│   │   ├── user.py
│   │   ├── service_center.py
│   │   ├── service_center_member.py
│   │   ├── shift.py
│   │   ├── schedule_entry.py
│   │   ├── swap_request.py
│   │   ├── time_entry.py
│   │   ├── finance_operation.py
│   │   ├── notification.py
│   │   ├── push_subscription.py
│   │   ├── custom_field.py
│   │   ├── custom_field_value.py
│   │   └── shift_document.py
│   └── routes/                 # Flask blueprints
│       ├── auth.py
│       ├── service_centers.py
│       ├── members.py
│       ├── shifts.py
│       ├── schedule.py
│       ├── swaps.py
│       ├── time_entries.py
│       ├── finance.py
│       ├── notifications.py
│       ├── push.py
│       ├── custom_fields.py
│       ├── shift_documents.py
│       └── vapid.py
├── frontend/                   # React TypeScript application
│   ├── src/
│   │   ├── App.tsx             # Router and providers
│   │   ├── main.tsx            # Entry point
│   │   ├── api/                # API client and cache
│   │   ├── contexts/           # React contexts (auth, theme, socket, push, etc.)
│   │   ├── components/         # Shared components (layout, lightbox, etc.)
│   │   ├── pages/              # Page components (24 pages)
│   │   ├── config/             # Navigation configuration
│   │   └── utils/              # Utilities (haptic, sound)
│   ├── public/                 # Static assets, service worker, manifest
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── nginx.conf              # Production Nginx configuration
│   └── Dockerfile              # Multi-stage build image
├── docker-compose.yml          # Service orchestration
├── setup.sh                    # Automated setup script
├── update.sh                   # Update script
├── clean.sh                    # Full cleanup without data loss
└── .env.example                # Environment variable template
</pre>

---

<h2 id="updating-en">Updating</h2>

To update an existing installation:

```bash
cd Worker
./update.sh
```

This will stash any local changes, pull the latest code from GitHub, and rebuild the frontend and backend containers.

---

</div>

<div id="ru">

<div align="center">
  <h1>Worker</h1>
  <p><strong>Система управления сервисными центрами и складами</strong></p>
  <p>
    Составление графиков сотрудников, обмен сменами, учёт рабочего времени
    и управление финансами для организаций с несколькими точками.
  </p>
</div>

<details>
  <summary>Содержание</summary>

  - [О приложении](#about-ru)
  - [Возможности](#features-ru)
  - [Технологии](#tech-stack-ru)
  - [Архитектура](#architecture-ru)
  - [Быстрый старт](#quick-start-ru)
  - [Ручная установка](#manual-setup-ru)
  - [Конфигурация](#configuration-ru)
  - [Обзор API](#api-overview-ru)
  - [Структура проекта](#project-structure-ru)
  - [Обновление](#updating-ru)
  - [Лицензия](#license-ru)

</details>

---

<h2 id="about-ru">О приложении</h2>

Worker — это полнофункциональное веб-приложение для управления сервисными центрами и складами, которым необходимо координировать работу сотрудников на нескольких точках. Оно покрывает полный цикл управления сменами: от создания шаблонов смен и построения графиков до отметок начала и окончания работы, обмена сменами, учёта финансов и формирования отчётов.

Приложение реализовано как Progressive Web App (PWA) с офлайн-поддержкой, обновлениями в реальном времени через WebSocket и push-уведомлениями. Полностью контейнеризировано с помощью Docker и готово к продакшн-развёртыванию за HTTPS-туннелем CloudPub.

---

<h2 id="features-ru">Возможности</h2>

<h3>Аутентификация и управление пользователями</h3>

<ul>
  <li>Регистрация и вход на основе JWT</li>
  <li>Ролевая модель: владелец, администратор, сотрудник</li>
  <li>Первый зарегистрировавшийся пользователь автоматически становится суперадминистратором и получает склад по умолчанию</li>
  <li>Редактирование профиля, назначение цвета пользователю, настройка уведомлений по типам</li>
  <li>Определение онлайн-статуса через WebSocket</li>
</ul>

<h3>Сервис-центры (склады)</h3>

<ul>
  <li>Создание и управление несколькими сервис-центрами</li>
  <li>Добавление сотрудников по email или выбором из списка пользователей</li>
  <li>Назначение ролей (владелец, администратор, сотрудник), почасовой ставки и режима учёта времени</li>
  <li>Межскладское управление для владельцев</li>
  <li>Каскадное удаление с очисткой всех связанных данных</li>
</ul>

<h3>Шаблоны смен</h3>

<ul>
  <li>Создание шаблонов с названием, временем начала и конца, цветом</li>
  <li>Пометка смен как оплачиваемых или неоплачиваемых</li>
  <li>Шаблоны привязаны к конкретному сервис-центру</li>
</ul>

<h3>Управление графиком</h3>

<ul>
  <li>Администратор создаёт записи в графике для каждого сотрудника</li>
  <li>Типы: полный день или по часам</li>
  <li>Копирование графика с недели на неделю</li>
  <li>Массовое удаление и быстрое заполнение</li>
  <li>Сотрудник видит свой график в виде календарной таблицы</li>
  <li>Автоматическое начисление оплаты за прошедшие смены</li>
</ul>

<h3>Обмен сменами</h3>

<ul>
  <li><strong>Обмен</strong> — обменяться сменами с другим сотрудником</li>
  <li><strong>Отдать</strong> — передать смену другому сотруднику</li>
  <li><strong>Подмена</strong> — попросить кого-то выйти вместо себя</li>
  <li><strong>Принудительно</strong> — переназначение смены администратором</li>
  <li>Принятие, отклонение и отмена обмена с уведомлениями в реальном времени</li>
  <li>Обмен между складами, если они принадлежат одному владельцу</li>
</ul>

<h3>Учёт рабочего времени</h3>

<ul>
  <li>Отметка начала и окончания работы с авто-подтверждением для запланированных смен</li>
  <li>Ожидание подтверждения для внеплановых отметок</li>
  <li>Учёт перерывов и примечаний</li>
  <li>Индикатор активной смены на панели управления</li>
  <li>Пользовательские поля для смены (текст, число, деньги) с переносом значений</li>
  <li>Загрузка фото и документов (до 10 файлов на смену)</li>
</ul>

<h3>Финансы и бухгалтерия</h3>

<ul>
  <li>Включение и отключение финансового модуля для каждого владельца</li>
  <li>Типы операций: зарплата, аванс, выплата, удержание, корректировка</li>
  <li>Автоматическое начисление зарплаты из отработанных часов или записей графика</li>
  <li>Расчёт баланса и финансовый прогноз</li>
  <li>CRUD для всех финансовых операций сотрудников</li>
</ul>

<h3>Уведомления и обновления в реальном времени</h3>

<ul>
  <li>Внутренний центр уведомлений с иконкой колокольчика</li>
  <li>Доставка в реальном времени через Socket.IO</li>
  <li>Push-уведомления через Web Push (VAPID)</li>
  <li>Настройка подписки на каждый тип уведомлений</li>
  <li>Звуковое сопровождение уведомлений</li>
</ul>

<h3>Progressive Web App</h3>

<ul>
  <li>Установка на домашний экран устройства</li>
  <li>Сервис-воркер с предварительным кэшированием</li>
  <li>Поддержка push-уведомлений в сервис-воркере</li>
  <li>Полноэкранный режим standalone</li>
</ul>

<h3>Дополнительно</h3>

<ul>
  <li>Светлая, тёмная и системная темы оформления</li>
  <li>Mobile-first адаптивный дизайн</li>
  <li>Настраиваемая нижняя навигация</li>
  <li>Лайтбокс для фото с навигацией свайпом</li>
  <li>Тактильная обратная связь на поддерживаемых устройствах</li>
</ul>

---

<h2 id="tech-stack-ru">Технологии</h2>

<table>
  <thead>
    <tr>
      <th>Компонент</th>
      <th>Технология</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Бэкенд</td>
      <td>Python 3.12, Flask 3.1, Flask-SQLAlchemy 3.1</td>
    </tr>
    <tr>
      <td>База данных</td>
      <td>SQLite (в продакшне: <code>/data/app.db</code>)</td>
    </tr>
    <tr>
      <td>Аутентификация</td>
      <td>JWT (Flask-JWT-Extended)</td>
    </tr>
    <tr>
      <td>Real-time</td>
      <td>Flask-SocketIO 5.5, gevent</td>
    </tr>
    <tr>
      <td>Push-уведомления</td>
      <td>Web Push API (VAPID), pywebpush</td>
    </tr>
    <tr>
      <td>Фронтенд</td>
      <td>React 19, TypeScript 6, Vite 8</td>
    </tr>
    <tr>
      <td>Стили</td>
      <td>Tailwind CSS 3.4 с тёмной темой</td>
    </tr>
    <tr>
      <td>PWA</td>
      <td>Vite PWA plugin, Workbox</td>
    </tr>
    <tr>
      <td>Обратный прокси</td>
      <td>Nginx</td>
    </tr>
    <tr>
      <td>Контейнеризация</td>
      <td>Docker, Docker Compose</td>
    </tr>
    <tr>
      <td>Туннелирование</td>
      <td>CloudPub (cloudpub.ru)</td>
    </tr>
  </tbody>
</table>

---

<h2 id="architecture-ru">Архитектура</h2>

<pre>
                         CloudPub tunnel
                              |
                         (public HTTPS)
                              |
                         [frontend:80]
                         Nginx reverse proxy
                        /                  \
                   /api/*              /socket.io/*
                  (HTTP)               (WebSocket)
                        \                  /
                         [backend:5000]
                         Gunicorn + gevent
                              |
                         SQLite database
                         (/data/app.db)
</pre>

Три Docker-контейнера в общей bridge-сети:

<table>
  <thead>
    <tr>
      <th>Сервис</th>
      <th>Образ</th>
      <th>Роль</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>cloudpub</code></td>
      <td><code>cloudpub/cloudpub:latest</code></td>
      <td>Создаёт публичный HTTPS-адрес, туннелирующий трафик к фронтенду</td>
    </tr>
    <tr>
      <td><code>frontend</code></td>
      <td>Собирается из <code>frontend/Dockerfile</code></td>
      <td>Nginx раздаёт статику SPA и проксирует API и WebSocket на бэкенд</td>
    </tr>
    <tr>
      <td><code>backend</code></td>
      <td>Собирается из <code>backend/Dockerfile</code></td>
      <td>Flask-приложение под Gunicorn + GeventWebSocketWorker</td>
    </tr>
  </tbody>
</table>

В продакшне Nginx отвечает за:
- Раздачу статических файлов фронтенда с долгосрочным кэшированием
- Проксирование запросов <code>/api/</code> на бэкенд
- Проксирование WebSocket-соединений <code>/socket.io/</code> на бэкенд
- SPA fallback-маршрутизацию

---

<h2 id="quick-start-ru">Быстрый старт</h2>

Установка одной командой на свежий VPS с Docker:

```bash
bash <(curl -s https://raw.githubusercontent.com/dottenv/Worker/main/setup.sh)
```

Скрипт выполнит:
<ol>
  <li>Клонирование репозитория</li>
  <li>Проверку наличия Docker и OpenSSL</li>
  <li>Генерацию секретных ключей</li>
  <li>Запрос CloudPub-токена (зарегистрироваться на <a href="https://cloudpub.ru/dashboard">cloudpub.ru</a>)</li>
  <li>Запись файла <code>.env</code> с конфигурацией</li>
  <li>Сборку и запуск всех контейнеров</li>
</ol>

После запуска получить публичный URL:

```bash
docker compose logs cloudpub
```

Первый зарегистрировавшийся пользователь по этому адресу автоматически станет суперадминистратором и получит склад по умолчанию.

---

<h2 id="manual-setup-ru">Ручная установка</h2>

<h3>Требования</h3>

<ul>
  <li>Docker и Docker Compose</li>
  <li>OpenSSL</li>
  <li>CloudPub-токен (<a href="https://cloudpub.ru/dashboard">зарегистрироваться</a>)</li>
</ul>

<h3>Установка</h3>

```bash
git clone https://github.com/dottenv/Worker.git
cd Worker
chmod +x setup.sh
./setup.sh
```

<h3>Запуск приложения</h3>

```bash
docker compose --env-file .env up --build -d
```

<h3>Проверка публичного URL</h3>

```bash
docker compose logs cloudpub
```

Ищите строку вида <code>published: http://frontend:80 -> https://xxx.cloudpub.ru</code>

<h3>Разработка (без Docker)</h3>

<p><strong>Бэкенд:</strong></p>

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

<p><strong>Фронтенд:</strong></p>

```bash
cd frontend
npm install
npm run dev
```

Vite-сервер разработки работает на порту 5173 и проксирует API-запросы на бэкенд на порту 5000.

---

<h2 id="configuration-ru">Конфигурация</h2>

Все настройки задаются через переменные окружения в файле <code>.env</code>.

<table>
  <thead>
    <tr>
      <th>Переменная</th>
      <th>Обязательно</th>
      <th>Описание</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>SECRET_KEY</code></td>
      <td>Да</td>
      <td>Секретный ключ Flask для подписи сессий</td>
    </tr>
    <tr>
      <td><code>JWT_SECRET_KEY</code></td>
      <td>Да</td>
      <td>Ключ для подписи JWT-токенов</td>
    </tr>
    <tr>
      <td><code>DATABASE_URL</code></td>
      <td>Да</td>
      <td>Строка подключения к БД (по умолчанию: <code>sqlite:////data/app.db</code>)</td>
    </tr>
    <tr>
      <td><code>CLOUDPUB_TOKEN</code></td>
      <td>Да</td>
      <td>Токен туннельного сервиса CloudPub</td>
    </tr>
    <tr>
      <td><code>VAPID_PRIVATE_KEY</code></td>
      <td>Нет</td>
      <td>Приватный ключ Web Push</td>
    </tr>
    <tr>
      <td><code>VAPID_PUBLIC_KEY</code></td>
      <td>Нет</td>
      <td>Публичный ключ Web Push</td>
    </tr>
  </tbody>
</table>

<h3>Срок действия JWT</h3>

<p>По умолчанию: 7 дней. Изменить в <code>backend/config.py</code>:</p>

```python
JWT_ACCESS_TOKEN_EXPIRES = 60 * 60 * 24 * 7
```

<h3>Лимиты загрузки файлов</h3>

<p>Максимальный размер файла: 20 МБ. Настраивается в <code>backend/config.py</code> и <code>frontend/nginx.conf</code>.</p>
<p>Разрешённые типы: png, jpg, jpeg, gif, webp, bmp, pdf, doc, docx, xls, xlsx, txt, csv.</p>

<h3>Nginx client max body size</h3>

<p>Установлен 20 МБ в <code>frontend/nginx.conf</code>:</p>

<pre>
client_max_body_size 20M;
</pre>

---

<h2 id="api-overview-ru">Обзор API</h2>

API организовано в следующие группы:

<table>
  <thead>
    <tr>
      <th>Префикс</th>
      <th>Модуль</th>
      <th>Описание</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>/api/auth</code></td>
      <td>Аутентификация</td>
      <td>Регистрация, вход, профиль, список пользователей, настройка навигации</td>
    </tr>
    <tr>
      <td><code>/api/service-centers</code></td>
      <td>Сервис-центры</td>
      <td>CRUD центров, управление участниками, пользовательские поля</td>
    </tr>
    <tr>
      <td><code>/api/schedule</code></td>
      <td>График</td>
      <td>Управление графиком для админа, личный просмотр, копирование, история</td>
    </tr>
    <tr>
      <td><code>/api/shifts</code></td>
      <td>Шаблоны смен</td>
      <td>CRUD шаблонов смен для каждого центра</td>
    </tr>
    <tr>
      <td><code>/api/swaps</code></td>
      <td>Обмен сменами</td>
      <td>Создание, принятие, отклонение, отмена запросов обмена</td>
    </tr>
    <tr>
      <td><code>/api/time-entries</code></td>
      <td>Учёт времени</td>
      <td>Начало/окончание работы, ожидающие подтверждения, утверждение</td>
    </tr>
    <tr>
      <td><code>/api/finance</code></td>
      <td>Финансы</td>
      <td>Операции, баланс, прогноз</td>
    </tr>
    <tr>
      <td><code>/api/notifications</code></td>
      <td>Уведомления</td>
      <td>Список, отметка прочитанным, удаление</td>
    </tr>
    <tr>
      <td><code>/api/push</code></td>
      <td>Push-уведомления</td>
      <td>Подписка, отписка, настройки</td>
    </tr>
    <tr>
      <td><code>/api/vapid</code></td>
      <td>VAPID</td>
      <td>Получение публичного ключа</td>
    </tr>
    <tr>
      <td><code>/api/shift-documents</code></td>
      <td>Документы</td>
      <td>Загрузка, скачивание, удаление документов смены</td>
    </tr>
  </tbody>
</table>

<h3>Процесс аутентификации</h3>

<ol>
  <li><code>POST /api/auth/register</code> — создать аккаунт (первый пользователь становится суперадмином)</li>
  <li><code>POST /api/auth/login</code> — получить JWT-токен</li>
  <li>Передавать <code>Authorization: Bearer &lt;token&gt;</code> во всех последующих запросах</li>
</ol>

---

<h2 id="project-structure-ru">Структура проекта</h2>

<pre>
Worker/
├── backend/                    # Python Flask-приложение
│   ├── app.py                  # Фабрика Flask и регистрация blueprint'ов
│   ├── config.py               # Конфигурация и секреты
│   ├── extensions.py           # Экземпляры SQLAlchemy, JWT, SocketIO
│   ├── helpers.py              # Общие утилиты
│   ├── notification_helper.py  # Доставка уведомлений с дедупликацией
│   ├── push_helper.py          # Отправка Web Push
│   ├── socket_events.py        # Обработчики Socket.IO
│   ├── requirements.txt        # Python-зависимости
│   ├── Dockerfile              # Образ для продакшна
│   ├── models/                 # SQLAlchemy-модели
│   │   ├── user.py
│   │   ├── service_center.py
│   │   ├── service_center_member.py
│   │   ├── shift.py
│   │   ├── schedule_entry.py
│   │   ├── swap_request.py
│   │   ├── time_entry.py
│   │   ├── finance_operation.py
│   │   ├── notification.py
│   │   ├── push_subscription.py
│   │   ├── custom_field.py
│   │   ├── custom_field_value.py
│   │   └── shift_document.py
│   └── routes/                 # Flask blueprint'ы
│       ├── auth.py
│       ├── service_centers.py
│       ├── members.py
│       ├── shifts.py
│       ├── schedule.py
│       ├── swaps.py
│       ├── time_entries.py
│       ├── finance.py
│       ├── notifications.py
│       ├── push.py
│       ├── custom_fields.py
│       ├── shift_documents.py
│       └── vapid.py
├── frontend/                   # React TypeScript-приложение
│   ├── src/
│   │   ├── App.tsx             # Роутер и провайдеры
│   │   ├── main.tsx            # Точка входа
│   │   ├── api/                # API-клиент и кэш
│   │   ├── contexts/           # React-контексты (auth, theme, socket, push и др.)
│   │   ├── components/         # Общие компоненты (layout, lightbox и др.)
│   │   ├── pages/              # Компоненты страниц (24 страницы)
│   │   ├── config/             # Конфигурация навигации
│   │   └── utils/              # Утилиты (haptic, sound)
│   ├── public/                 # Статические файлы, service worker, manifest
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── nginx.conf              # Nginx-конфигурация для продакшна
│   └── Dockerfile              # Многоступенчатая сборка
├── docker-compose.yml          # Оркестрация сервисов
├── setup.sh                    # Скрипт автоматической установки
├── update.sh                   # Скрипт обновления
├── clean.sh                    # Полная очистка без потери данных
└── .env.example                # Шаблон переменных окружения
</pre>

---

<h2 id="updating-ru">Обновление</h2>

Для обновления существующей установки:

```bash
cd Worker
./update.sh
```

Скрипт сохранит локальные изменения, подтянет последний код из GitHub и пересоберёт контейнеры фронтенда и бэкенда.

---

</div>

---

<h2 id="license">License</h2>

<p align="center">MIT</p>
