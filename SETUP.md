# JIARUI TECH — M1 Setup Guide

## Prerequisites

- **Docker Desktop** (recommended) — for one-command startup
- OR: Node.js 22+, Python 3.12+, PostgreSQL 16, Redis 7

---

## Option A: Docker (Recommended)

```bash
# 1. Clone / open the project
cd "JIARUI TECH PROJECT"

# 2. Start all services (PostgreSQL + Redis + Backend + Frontend)
docker-compose up --build

# 3. In a new terminal, seed the database (first time only)
docker exec jiarui_backend python seed.py

# 4. Open the site
#    Frontend:  http://localhost:3000
#    API Docs:  http://localhost:8000/api/docs
```

**Default admin credentials (after seed):**
- Email: `admin@jiarui.tech`
- Password: `Admin@123456`

---

## Option B: Local Development (no Docker)

### Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Set up environment
cp .env.example .env
# Edit .env — update DATABASE_URL and REDIS_URL to point to your local services

# Run the API server
uvicorn app.main:app --reload --port 8000

# In a second terminal, seed the database
python seed.py
```

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# The .env.local file is already configured for local development
# Start dev server
npm run dev
```

---

## Project Structure

```
JIARUI TECH PROJECT/
├── docker-compose.yml          # All-in-one Docker setup
├── backend/                    # FastAPI
│   ├── app/
│   │   ├── main.py             # Entry point, CORS, router registration
│   │   ├── database.py         # Async SQLAlchemy engine
│   │   ├── core/
│   │   │   ├── config.py       # Settings (pydantic-settings)
│   │   │   ├── security.py     # JWT, bcrypt
│   │   │   └── deps.py         # FastAPI dependencies (auth guards)
│   │   ├── models/             # SQLAlchemy ORM models
│   │   ├── schemas/            # Pydantic request/response schemas
│   │   ├── routers/
│   │   │   ├── auth.py         # Register, login, logout, /me
│   │   │   ├── articles.py     # Public article listing & detail
│   │   │   ├── categories.py   # Category list
│   │   │   └── admin.py        # Protected: CRUD + image upload
│   │   └── utils/uid.py        # JT-YYYYMM-XXXXXX generator
│   └── seed.py                 # DB seed (categories + admin user)
│
└── frontend/                   # Next.js 14 App Router
    ├── app/
    │   ├── [locale]/           # zh / en bilingual routing
    │   │   ├── page.tsx        # Homepage
    │   │   ├── news/
    │   │   │   ├── [category]/ # Category news feed
    │   │   │   └── article/[uid]/  # Article detail
    │   │   └── auth/           # Login + Register
    │   └── admin/              # CMS (no locale prefix)
    │       ├── page.tsx        # Dashboard
    │       ├── articles/       # Article list + editor
    │       └── categories/     # Category management
    ├── components/
    │   ├── navbar/Navbar.tsx   # Sticky navbar with search + auth
    │   ├── news/               # ArticleCard, CategoryMenu, etc.
    │   ├── home/HeroBanner.tsx # Hero with cyber grid effect
    │   ├── admin/              # CMS components
    │   └── ui/                 # Button, Input
    ├── lib/
    │   ├── api.ts              # Axios client + typed API methods
    │   ├── auth-store.ts       # Zustand auth state
    │   └── utils.ts            # cn(), formatDate(), i18n helpers
    ├── messages/
    │   ├── zh.json             # Chinese translations
    │   └── en.json             # English translations
    └── i18n/                   # next-intl configuration
```

---

## API Quick Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/auth/register | — | Register new user |
| POST | /api/auth/login | — | Login, sets httpOnly cookies |
| POST | /api/auth/logout | — | Clear auth cookies |
| GET | /api/auth/me | User | Current user info |
| GET | /api/categories | — | List all categories |
| GET | /api/articles | — | Paginated article list |
| GET | /api/articles/{uid} | — | Article detail (increments view count) |
| GET | /api/articles/{uid}/comments | — | Article comments |
| POST | /api/articles/{uid}/comments | User | Post a comment |
| GET | /api/admin/articles | Admin | All articles (any status) |
| POST | /api/admin/articles | Admin | Create article |
| PUT | /api/admin/articles/{id} | Admin | Update article |
| DELETE | /api/admin/articles/{id} | Admin | Delete article |
| POST | /api/admin/upload-image | Admin | Upload cover image |
| POST | /api/categories | Admin | Create category |
| DELETE | /api/categories/{id} | Admin | Delete category |

Full interactive docs: **http://localhost:8000/api/docs**

---

## Key Design Decisions

- **Auth**: JWT stored in httpOnly cookies (XSS-safe). Bearer header also supported for API clients.
- **Article UID**: `JT-YYYYMM-XXXXXX` — auto-generated on creation, shown in navbar search for precise lookup.
- **Bilingual routing**: `/zh/news/ai` vs `/en/news/ai` — `next-intl` handles locale detection and routing automatically.
- **Progressive immersion UI**: Navbar `transparent` prop + Framer Motion scroll listener transitions hero section from dark cyber to white minimal as user scrolls.
- **Image uploads**: Stored in `backend/uploads/images/`, served as static files via FastAPI. Swap the `UPLOAD_DIR` to an S3/R2 path in production.

---

## Next Steps (M2)

When you're ready to continue:
1. AI Developer Community (UGC platform, posts, likes, follows)
2. Trending/Leaderboard ranking algorithms
3. Personal profile pages
