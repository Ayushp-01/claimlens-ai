# ClaimLens AI — Architecture & Project Documentation

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        ClaimLens AI                             │
│              Healthcare Claim Intelligence Platform             │
├──────────────────────────┬──────────────────────────────────────┤
│     Patient Portal        │        Investigator Portal           │
│  Next.js App Router       │       Next.js App Router             │
│  /patient/*               │       /investigator/*               │
├──────────────────────────┴──────────────────────────────────────┤
│                     Next.js Frontend                            │
│         Tailwind CSS + shadcn/ui + Recharts                     │
│     React Hook Form + Zod   │   Axios HTTP Client               │
├─────────────────────────────────────────────────────────────────┤
│                 FastAPI Backend (Python)                         │
│    JWT Auth  │  Role-Based Access  │  Business Logic            │
│  ┌─────────┐ ┌──────────────┐ ┌─────────────────────────────┐  │
│  │  Risk   │ │  Duplicate   │ │   Claim / Notification /    │  │
│  │ Engine  │ │  Detector    │ │   Audit Services            │  │
│  └─────────┘ └──────────────┘ └─────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│              SQLAlchemy ORM  │  Alembic Migrations              │
├──────────────────────────┬──────────────────────────────────────┤
│   SQLite (Local Demo)    │     PostgreSQL/Supabase (Prod)       │
└──────────────────────────┴──────────────────────────────────────┘
```

## Project Structure

```
claimlens-ai/
├── apps/
│   ├── api/                    # Python FastAPI backend
│   │   ├── app/
│   │   │   ├── config.py       # Pydantic settings
│   │   │   ├── database.py     # SQLAlchemy engine + session
│   │   │   ├── models.py       # ORM models (15 tables)
│   │   │   ├── schemas.py      # Pydantic request/response schemas
│   │   │   ├── auth.py         # JWT utilities
│   │   │   ├── dependencies.py # FastAPI dependencies (auth guards)
│   │   │   ├── routers/        # API route handlers
│   │   │   │   ├── auth.py     # /api/auth/*
│   │   │   │   ├── patient.py  # /api/patient/*
│   │   │   │   ├── investigator.py # /api/investigator/*
│   │   │   │   ├── analytics.py    # /api/analytics/*
│   │   │   │   ├── documents.py    # /api/documents/*
│   │   │   │   ├── notifications.py
│   │   │   │   └── audit.py
│   │   │   └── services/
│   │   │       ├── risk_engine.py       # 10-rule deterministic engine
│   │   │       ├── duplicate_detector.py
│   │   │       ├── claim_service.py
│   │   │       ├── notification_service.py
│   │   │       └── audit_service.py
│   │   ├── seeds/
│   │   │   └── synthetic_data.py  # 100+ claims, 25 patients
│   │   ├── tests/
│   │   │   ├── test_auth.py
│   │   │   ├── test_claims.py
│   │   │   └── test_risk_engine.py
│   │   ├── alembic/           # DB migrations
│   │   ├── main.py            # FastAPI app entry
│   │   └── requirements.txt
│   │
│   └── web/                   # Next.js 14 frontend
│       ├── src/
│       │   ├── app/
│       │   │   ├── page.tsx           # Landing page
│       │   │   ├── login/page.tsx
│       │   │   ├── register/page.tsx
│       │   │   ├── patient/           # Patient portal
│       │   │   │   ├── layout.tsx
│       │   │   │   ├── dashboard/
│       │   │   │   ├── claims/
│       │   │   │   ├── documents/
│       │   │   │   ├── notifications/
│       │   │   │   └── profile/
│       │   │   └── investigator/      # Investigator portal
│       │   │       ├── layout.tsx
│       │   │       ├── dashboard/
│       │   │       ├── claims/
│       │   │       ├── duplicates/
│       │   │       ├── analytics/
│       │   │       ├── cases/
│       │   │       └── audit-logs/
│       │   ├── components/
│       │   │   ├── ui/         # shadcn-style components
│       │   │   ├── shared/     # Reusable business components
│       │   │   └── charts/     # Recharts wrappers
│       │   ├── lib/
│       │   │   ├── api.ts      # Axios API client
│       │   │   └── utils.ts
│       │   ├── contexts/
│       │   │   └── AuthContext.tsx
│       │   ├── types/
│       │   │   └── index.ts
│       │   └── middleware.ts   # Route protection
│       └── package.json
│
├── database/
│   ├── migrations/   # Alembic versions
│   └── seeds/        # SQL seed scripts
├── docs/
│   ├── ARCHITECTURE.md
│   ├── API.md
│   └── SECURITY.md
├── scripts/
│   └── start.ps1     # Windows startup script
├── .env.example
├── .gitignore
└── README.md
```

## Database Schema

### Core Tables

| Table | Purpose |
|-------|---------|
| users | Authentication and role management |
| patient_profiles | Patient demographic and policy info |
| insurance_policies | Policy coverage details |
| providers | Healthcare provider registry |
| claims | Main claim records |
| claim_line_items | Itemized billing lines |
| claim_documents | Document metadata |
| risk_assessments | Risk engine outputs per screening run |
| risk_findings | Individual rule violations |
| duplicate_matches | Exact/near-duplicate pairs |
| investigation_notes | Private investigator notes |
| document_requests | Documentation requests to patients |
| claim_status_history | Full status audit trail |
| notifications | User notifications |
| audit_logs | System-wide audit events |

## Risk Engine Rules

| # | Rule | Score | Priority |
|---|------|-------|----------|
| 1 | Exact duplicate invoice | +40 | Critical |
| 2 | Near-duplicate claim | +30 | High |
| 3 | Total vs itemized mismatch | +25 | High |
| 4 | Repeated billing codes | +15 | Medium |
| 5 | Coding inconsistencies | +20 | High |
| 6 | Unusually high amount | +20 | High |
| 7 | Invalid dates | +15 | Medium |
| 8 | Unusual claim frequency | +10 | Low-Medium |
| 9 | Missing required docs | +15 | Medium |
| 10 | Provider anomaly | +20 | High |

**Score bands:** 0-24 Low · 25-49 Medium · 50-74 High · 75-100 Critical

> Risk scores are **operational screening thresholds, not fraud probabilities**.
> High scores require human review. Claims are NEVER auto-rejected.

## Authentication & Authorization

- JWT tokens (HS256), 8-hour expiry
- Three roles: `patient`, `investigator`, `admin`
- Patients: isolated to own records only
- Investigators: access all claims + internal data
- Admins: full access + user management
- Server-side role enforcement on every endpoint
- Private investigation notes NEVER visible to patients

## Claim Status Lifecycle

```
submitted → validation → risk_screening → under_review ─┐
                                                          ├→ documentation_requested → under_review
                                              ┌──────────┤
                                              ↓          ↓
                                           approved   rejected
                                        partially_approved
                                              ↓
                                      payment_processing
                                              ↓
                                           settled
```

## Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Patient 1 | patient1@demo.claimlens.ai | Demo@Patient1 |
| Patient 2 | patient2@demo.claimlens.ai | Demo@Patient2 |
| Investigator | investigator@demo.claimlens.ai | Demo@Invest1 |
| Admin | admin@demo.claimlens.ai | Demo@Admin1 |

## API Endpoints Summary

### Auth
- `POST /api/auth/login` — Login, returns JWT
- `POST /api/auth/register` — Patient self-registration
- `GET /api/auth/me` — Current user

### Patient Portal
- `GET /api/patient/dashboard` — Stats and recent claims
- `GET/POST /api/patient/claims` — List and submit claims
- `GET /api/patient/claims/{id}` — Claim detail + timeline
- `POST /api/patient/documents/{claim_id}/upload` — Upload documents
- `GET/PUT /api/patient/profile` — Profile management
- `GET /api/patient/notifications` — Notifications

### Investigator Portal
- `GET /api/investigator/dashboard` — KPI cards
- `GET /api/investigator/claims` — Investigation queue
- `GET /api/investigator/claims/{id}` — Full claim detail
- `POST /api/investigator/claims/{id}/decision` — Make decision
- `POST /api/investigator/claims/{id}/notes` — Add note
- `POST /api/investigator/claims/{id}/rescreen` — Re-run risk engine
- `GET /api/investigator/duplicates` — Duplicate matches
- `POST /api/investigator/findings/{id}/false-positive` — Mark false positive
- `GET /api/investigator/audit-logs` — Audit trail

### Analytics
- `GET /api/analytics/investigator-dashboard` — Chart data
- `GET /api/analytics/claims-over-time` — Time series
- `GET /api/analytics/claims-by-status` — Status breakdown
- `GET /api/analytics/amounts-summary` — Financial metrics
- `GET /api/analytics/export/csv` — CSV export

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 App Router, TypeScript, Tailwind CSS |
| UI Components | shadcn/ui (Radix UI primitives), Lucide icons |
| Charts | Recharts |
| Forms | React Hook Form + Zod |
| HTTP Client | Axios |
| Backend | Python 3.14, FastAPI, Uvicorn |
| ORM | SQLAlchemy 2.0 |
| Migrations | Alembic |
| Auth | python-jose (JWT), passlib (bcrypt) |
| Database | SQLite (demo) / PostgreSQL/Supabase (production) |
| Testing | Pytest, pytest-asyncio |

## Windows Startup Commands

```powershell
# Navigate to project root
cd C:\Users\ayush\.gemini\antigravity\scratch\claimlens-ai

# One-time setup
cd apps\api
pip install -r requirements.txt
cd ..\web
npm install
cd ..\..

# Start API (Terminal 1)
cd apps\api
uvicorn main:app --reload --port 8000

# Start Web (Terminal 2)
cd apps\web
npm run dev

# Application URLs:
# Frontend: http://localhost:3000
# API: http://localhost:8000
# API Docs: http://localhost:8000/docs

# Run tests
cd apps\api
python -m pytest tests/ -v

# Seed/reset database
cd apps\api
python -m seeds.synthetic_data
```

## Security Notes

This is a **demonstration application**. Before production deployment:

1. **Change SECRET_KEY** — Use `secrets.token_hex(32)` to generate
2. **Use PostgreSQL** — SQLite is not suitable for multi-user production
3. **Enable HTTPS** — All traffic must be encrypted in transit
4. **Configure Supabase RLS** — Row-level security policies
5. **Implement rate limiting** — Protect auth endpoints
6. **Add audit encryption** — Encrypt sensitive audit log fields
7. **HIPAA compliance** — Medical data requires BAA with hosting providers
8. **Penetration testing** — Full security audit before launch
9. **Password policy** — Enforce minimum complexity requirements
10. **Session management** — Implement refresh token rotation

## Limitations (Demo Version)

- **No email notifications** — Prepare SMTP integration hooks
- **No OCR** — Document content not extracted (metadata only)
- **No trained ML models** — Risk engine uses deterministic rules only
- **SQLite** — Not suitable for concurrent production use
- **File storage** — Local filesystem only (no cloud storage)
- **No 2FA** — Multi-factor authentication not implemented
- **No billing code database** — Uses configured list, not licensed reference

## Hackathon Demo Script (3 minutes)

### Minute 1: Patient Experience
1. Open http://localhost:3000 — show landing page
2. Click "Patient Sign In" → log in as patient1@demo.claimlens.ai
3. Show dashboard: claims summary, amounts, recent claims
4. Submit new claim (multi-step form) → show confirmation

### Minute 2: Investigator Investigation
1. Open new tab → http://localhost:3000/login → investigator account
2. Show investigator dashboard: KPIs, charts, high-priority queue
3. Click on a HIGH risk claim → show risk findings with explanations
4. Show duplicate comparison side-by-side
5. Add investigation note → make a decision (approve/reject)

### Minute 3: Analytics & Audit
1. Show analytics page with charts responding to filters
2. Show audit log: every action recorded with actor + timestamp
3. Switch back to patient tab → show updated status + notification
4. Demonstrate: patient cannot see investigator notes or another patient's claims
