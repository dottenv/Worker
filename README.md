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

  - [About](#about)
  - [Features](#features)
  - [Tech Stack](#tech-stack)
  - [Architecture](#architecture)
  - [Quick Start](#quick-start)
  - [Manual Setup](#manual-setup)
  - [Configuration](#configuration)
  - [API Overview](#api-overview)
  - [Project Structure](#project-structure)
  - [Updating](#updating)
  - [License](#license)

</details>

---

## About

Worker is a full-stack web application designed for service centers and warehouses that need to coordinate employees across multiple locations. It handles the full lifecycle of shift management — from defining shift templates and building schedules, to clocking in and out, swapping shifts, tracking finances, and generating reports.

The application is built as a Progressive Web App (PWA) with offline support, real-time updates via WebSocket, and push notifications. It is fully containerized with Docker and ready for production deployment behind a CloudPub HTTPS tunnel.

---

## Features

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

## Tech Stack

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

## Architecture

```
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
```

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

## Quick Start

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

## Manual Setup

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
source .venv/bin/activate   # or .venv\Scripts\activate on Windows
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

## Configuration

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

```
client_max_body_size 20M;
```

---

## API Overview

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

## Project Structure

```
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
```

---

## Updating

To update an existing installation:

```bash
cd Worker
./update.sh
```

This will stash any local changes, pull the latest code from GitHub, and rebuild the frontend and backend containers.

---

## License

MIT
