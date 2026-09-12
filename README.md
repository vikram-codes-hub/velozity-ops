# 🚀 Velozity Ops — Real-Time Client Project Operations Hub

[![React](https://img.shields.io/badge/React-19.3.0-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7.3-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Express](https://img.shields.io/badge/Express-5.2.1-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-6.4.0-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Socket.io](https://img.shields.io/badge/Socket.io-4.8.3-010101?logo=socketdotio&logoColor=white)](https://socket.io/)
[![Vite](https://img.shields.io/badge/Vite-8.3.0-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)

**Velozity Ops** is an enterprise-grade, real-time client project operations and developer workload management platform. Built with **React 19**, **Express 5**, **Prisma ORM**, **PostgreSQL**, **Socket.IO**, and **Multi-LLM AI Integration** (Gemini, Groq, xAI Grok), it delivers live activity feeds, role-scoped dashboards, automated overdue task detection, and intelligent telemetry analysis.

---

## 🌐 Live Links & Deployment Previews

> [!NOTE]
> *Replace placeholder URLs below with your active production deployment endpoints.*

- 🔗 **Live Web Application**: [https://velozity-ops.vercel.app](https://velozity-ops.vercel.app)
- ⚡ **Backend REST & WebSocket Server**: [https://api.velozity-ops.com](https://api.velozity-ops.com)
- 📖 **Postman API Collection / Documentation**: [https://api.velozity-ops.com/docs](https://api.velozity-ops.com/docs)
- 📊 **Database Telemetry Console (Supabase/Postgres)**: [https://supabase.com/dashboard/project/velozity-ops](https://supabase.com/dashboard/project/velozity-ops)

---

## ✨ Key Features & Highlights

### 1. 🛡️ Role-Based Access Control (RBAC)
- **Administrator Hub**: Global system oversight, organization project analytics, user credential provisioning, and immutable audit logging.
- **Project Manager (PM) Dashboard**: Project management, team member assignments, priority distribution tracking, and deadline tracking.
- **Developer Workspace**: Personal task queue, urgency-based task sorting, single-click status updates, and individual activity feeds.

### 2. ⚡ Real-Time WebSocket Architecture
- Built on **Socket.IO** for instant client-server bi-directional synchronization.
- Real-time unread notification count badge in top navigation bar (`.notification-bell__badge`).
- Instant activity feed updates across concurrent sessions when projects or tasks are created, assigned, or updated.

### 3. 🤖 Intelligent Multi-LLM AI Engine
- **Automated Key Detection & Fallback Cascade**: Evaluates Google Gemini (`gemini-1.5-flash`, `gemini-2.0-flash`), Groq (`llama-3.3-70b-versatile`), and xAI Grok (`grok-beta`).
- **Resilient Offline Telemetry Fallback**: If external LLM API endpoints are unreachable, backend routes generate live structured PostgreSQL metrics automatically.
- Features: AI Project Executive Summaries, AI Task Description Writing, and AI Operations Chat Assistant.

### 4. ⏰ Background Overdue Task Detection Cron Engine
- Powered by `node-cron` running background checks every 5 minutes.
- Identifies tasks past deadline, updates status to `OVERDUE`, emits Socket.IO real-time broadcasts, creates audit log entries, and pushes notification bell alerts to assigned developers and PMs.

### 5. 🔑 Admin Team Management & Password Reset System
- Interactive developer inspection modal (`UserDetailModal.tsx`).
- Admins can review developer workloads and reset user passwords securely (bcrypt hashing with `tokenVersion` session revocation).

### 6. 🎨 Ultra-Responsive Glassmorphism Design System
- 5 Theme Presets: **Obsidian Tech** (Dark Default), **Cyber Neon**, **Midnight Emerald**, **Sunset Rose**, and **Pearl Light**.
- Fully responsive across Desktop (`>1200px`), Tablet (`768px-1024px` with mobile drawer navigation), and Mobile (`<480px`).

---

## 🛠️ Technology Stack

| Layer | Technologies Used |
| :--- | :--- |
| **Frontend UI** | React 19, TypeScript, Vite 8, React Router v7, TanStack React Query v5, Axios |
| **Styling & Icons** | Custom Glassmorphic CSS System, Modern HSL Tokens, Crisp SVG Vector Icons |
| **Backend Server** | Node.js, Express 5, TypeScript, Socket.IO Server, Cookie Parser, CORS, Dotenv |
| **Database & ORM** | PostgreSQL (Supabase / Local), Prisma ORM 6, Bcrypt Password Hashing |
| **Authentication** | Dual-Token Auth: Short-lived JWT Access Tokens + HttpOnly Refresh Cookies |
| **Background Cron** | Node-Cron Automated Job Scheduler |
| **AI SDK Integration**| `@google/generative-ai`, `openai` (Groq & xAI Grok client) |

---

## 🔐 Default Demo Credentials

When running seed scripts (`npm run seed`), the following test credentials are created automatically:

| Role | Email Address | Default Password | Initial Access |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@velozity.com` | `Password123!` | System Overview, Audit Logs, User Provisioning |
| **Project Manager** | `pm1@velozity.com` | `Password123!` | Managed Projects, Team Assignment, Task Control |
| **Developer** | `dev1@velozity.com` | `Password123!` | My Assigned Tasks, Personal Activity Feed |
| **Developer** | `dev2@velozity.com` | `Password123!` | My Assigned Tasks, Personal Activity Feed |

---

## 🚀 Quick Start & Installation Guide

### Prerequisites
- **Node.js**: `v20.x` or higher
- **npm**: `v10.x` or higher
- **PostgreSQL Database**: Local PostgreSQL instance or Supabase database URL

---

### Step 1: Clone Repository
```bash
git clone https://github.com/your-username/velozity-ops.git
cd "velozity-ops"
```

---

### Step 2: Configure Backend Environment
Navigate to the `backend` directory and create `.env`:
```bash
cd backend
```
Create `.env` file with the following variables:
```env
PORT=4000
NODE_ENV=development
DATABASE_URL="postgresql://postgres:password@localhost:5432/velozity_ops?schema=public"
JWT_ACCESS_SECRET="your-super-secret-access-token-key-32chars"
JWT_REFRESH_SECRET="your-super-secret-refresh-token-key-32chars"
CLIENT_URL="http://localhost:5173"

# Optional AI Key Cascade (Gemini, Groq, or Grok)
GEMINI_API_KEY="AIzaSyYourGeminiKeyHere"
GROQ_API_KEY="gsk_YourGroqKeyHere"
GROK_API_KEY="xai-YourGrokKeyHere"
```

---

### Step 3: Install Backend Dependencies & Run Migrations
```bash
npm install
npx prisma generate
npx prisma db push
npm run seed
```

Start the Backend Server:
```bash
npm run dev
```
*(Backend runs at `http://localhost:4000`)*

---

### Step 4: Configure Frontend Environment & Launch
Open a new terminal window, navigate to `frontend`:
```bash
cd ../frontend
```
Create `.env` file:
```env
VITE_API_URL="http://localhost:4000"
```

Install Dependencies & Start Vite Dev Server:
```bash
npm install
npm run dev
```
*(Frontend runs at `http://localhost:5173`)*

---

## 📡 REST API & Socket.IO Specification

### REST API Endpoints

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Public | Authenticate user & issue HttpOnly refresh cookie |
| `POST` | `/api/auth/logout` | Authenticated | Revoke refresh token session & clear cookie |
| `GET` | `/api/auth/me` | Authenticated | Fetch current logged-in user profile |
| `GET` | `/api/projects` | Authenticated | List projects (scoped by role) |
| `POST` | `/api/projects` | Admin / PM | Create new project workspace |
| `GET` | `/api/tasks` | Authenticated | Query task items (filtered by status, priority, project) |
| `POST` | `/api/tasks` | Admin / PM | Create & assign task item |
| `PATCH` | `/api/tasks/:id` | Authenticated | Update task status or assignee |
| `GET` | `/api/users` | Admin / PM | List platform users |
| `POST` | `/api/users` | Admin | Provision new user account |
| `POST` | `/api/users/:id/reset-password` | Admin | Reset user password & revoke active sessions |
| `GET` | `/api/audit-logs` | Admin | Query system audit trail records |
| `POST` | `/api/ai/chat` | Authenticated | AI Operations Assistant query endpoint |

### WebSocket Real-Time Events

| Event Name | Direction | Payload | Trigger Condition |
| :--- | :--- | :--- | :--- |
| `notification` | Server ➔ Client | `{ id, title, message, createdAt }` | Project/Task assignment or overdue flag |
| `unread_count` | Server ➔ Client | `{ count }` | Unread notification badge update |
| `activity_event` | Server ➔ Client | `{ type, message, metadata }` | Real-time system activity stream |
| `task_status_changed` | Server ➔ Client | `{ taskId, newStatus }` | Task workflow status update |

---

## 📂 Repository File Tree

```
Velozity Ops/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma       # Database models & relationships
│   │   └── seed.ts             # Initial demo accounts & project seed data
│   ├── src/
│   │   ├── lib/
│   │   │   ├── ai.ts           # Multi-LLM cascade engine (Gemini/Groq/Grok)
│   │   │   ├── prisma.ts       # Database client instance
│   │   │   ├── socket.ts       # Socket.IO event emitters & notifications
│   │   │   └── overdueCron.ts  # Background task overdue scheduler
│   │   ├── middleware/         # Auth JWT verification & RBAC guards
│   │   ├── routes/             # REST route handlers
│   │   └── server.ts           # Express HTTP + Socket.IO server setup
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── components/         # Modals, Navbar, ActivityFeed, Charts, AIChat
│   │   ├── context/            # AuthContext, ThemeContext, SocketContext
│   │   ├── hooks/              # Custom React hooks (useTasks, useProjects, etc.)
│   │   ├── pages/              # AdminDashboard, PMDashboard, DeveloperDashboard, etc.
│   │   ├── index.css           # Glassmorphism design tokens & responsive CSS
│   │   ├── App.tsx             # Route definitions & guards
│   │   └── main.tsx            # Entry point
│   ├── package.json
│   └── vite.config.ts
└── README.md
```

---

## 📄 License

This project is licensed under the **ISC License**. Developed for high-velocity enterprise software teams.
