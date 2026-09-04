# Team 344 Hackathon Quickstart & Cheat Sheet

This guide outlines setup, PostgreSQL migration workflows, and common code snippets to maximize team velocity during the 24-hour hackathon.

---

## ⚡ 1. Initial Setup (Fresh Clone)

### Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit DATABASE_URL in .env with your PostgreSQL credentials
npx prisma migrate deploy   # Applies existing committed migrations to database
npm run dev
```

### Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

---

## 🗄️ 2. PostgreSQL + Prisma Database Workflow

### Applying Committed Migrations (Fresh Clone / Teammate Pull)
To apply already-committed migrations on a fresh clone or after pulling changes:
```bash
npx prisma migrate deploy
```

### Creating New Migrations (During Development)
When adding or updating database models during the hackathon:

1. **Modify `backend/prisma/schema.prisma`** to add your new models:
   ```prisma
   model Task {
     id        String   @id @default(uuid())
     title     String
     completed Boolean  @default(false)
     userId    String
     user      User     @relation(fields: [userId], references: [id])
     createdAt DateTime @default(now())
   }
   ```
2. **Generate and Apply Migration**:
   ```bash
   npx prisma migrate dev --name add_tasks
   ```
3. **Optional Rapid Prototyping** (if testing local changes before committing migrations):
   ```bash
   npx prisma db push
   ```

---

## 📡 3. API Endpoints Reference

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Public | System & DB connection status |
| `POST` | `/api/auth/register` | Public | Register new user, returns JWT token |
| `POST` | `/api/auth/login` | Public | Authenticate user, returns JWT token |
| `GET` | `/api/auth/me` | Authenticated | Retrieve current user profile |

---

## 💡 4. Team Code Snippets

### Adding a Protected Route in Backend
```javascript
import { authenticate, authorize } from '../middlewares/authMiddleware.js';

// Requires logged in user
router.get('/my-data', authenticate, myDataHandler);

// Requires ADMIN role
router.get('/admin-only', authenticate, authorize('ADMIN'), adminHandler);
```

### Making an Authenticated API Call in Frontend
```javascript
import api from '../services/api';

const fetchData = async () => {
  try {
    const response = await api.get('/my-data');
    console.log(response.data);
  } catch (err) {
    console.error(err.response?.data?.message || 'API request failed');
  }
};
```
