# Team 344 Full-Stack Hackathon Starter Kit

A production-ready, domain-neutral Full-Stack starter kit built for speed, clarity, and rapid extension during 24-hour hackathons.

---

## 🚀 Tech Stack Overview

- **Frontend**: React 18, Vite, Tailwind CSS, React Router v6, Axios, Lucide Icons
- **Backend**: Node.js, Express (ES Modules `"type": "module"`)
- **Database & ORM**: PostgreSQL, Prisma ORM
- **Authentication**: JWT (`jsonwebtoken`), Password Hashing (`bcryptjs`)
- **Validation**: Zod
- **Architecture**: Decoupled Client-Server (`frontend/` + `backend/`)

---

## 📂 Project Structure

```text
Team344-Hackathon-Starter/
├── backend/
│   ├── prisma/
│   │   ├── migrations/         # Database migration history
│   │   └── schema.prisma       # Minimal User model (Role: USER | ADMIN)
│   ├── src/
│   │   ├── config/             # Environment & Prisma client singleton
│   │   ├── controllers/        # Auth & Health handlers
│   │   ├── middlewares/        # JWT auth guard, lightweight RBAC & Zod validator
│   │   ├── routes/             # API routes
│   │   ├── utils/              # JWT & bcryptjs password helpers
│   │   └── server.js           # Express app init & error middleware
│   ├── .env.example
│   ├── test-e2e.js             # Automated end-to-end integration test runner
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/         # Reusable UI components & Navbar
│   │   ├── context/            # AuthContext (global state & token handling)
│   │   ├── pages/              # Home, Login, Register, Dashboard, NotFound
│   │   ├── services/           # Axios client with JWT interceptor
│   │   ├── App.jsx             # Routes setup
│   │   ├── main.jsx            # Entry point
│   │   └── index.css           # Tailwind styles
│   ├── .env.example
│   ├── index.html
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── package.json
├── docs/                       # Quickstart cheat sheet & Git workflow
├── .gitignore
└── README.md
```

---

## ⚡ Quick Start Guide

### Prerequisites
- Node.js (v18+)
- PostgreSQL server running locally or remotely

### 1. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Update DATABASE_URL in .env with your PostgreSQL credentials
npx prisma migrate deploy   # Apply existing committed migrations
npm run dev
```
*Backend runs on `http://localhost:5000`*

#### Schema Migration Workflow
- **Fresh Clone / Pull**: Run `npx prisma migrate deploy` to apply committed migrations.
- **New Feature Models**: Edit `prisma/schema.prisma` and run `npx prisma migrate dev --name <migration_name>` to create new migrations.

---

### 2. Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```
*Frontend runs on `http://localhost:3000`*

---

## 🧪 Testing the Starter Kit

Run automated end-to-end verification tests:
```bash
cd backend
node test-e2e.js
```

---

## 📖 Documentation & Guides

- [Quickstart & Code Cheat Sheet](docs/QUICKSTART.md)
- [3-Person Hackathon Git Workflow](docs/GIT_WORKFLOW.md)
