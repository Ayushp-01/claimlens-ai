# ClaimLens AI

> **AI-Assisted Healthcare Insurance Claim Intelligence & Investigation Platform**

ClaimLens AI is an enterprise-grade decision-support platform engineered to detect healthcare billing anomalies, cross-hospital duplicate invoices, unbundled surgical charges, and tariff discrepancies with explainable, audit-ready clinical reasoning.

---

## 🌟 Architecture & Key Features

ClaimLens AI operates with two synchronized portals communicating with a common FastAPI backend:

### 1. Patient Portal (`/patient/*`)
- **Interactive Multi-Step Submission Wizard**: 4-step claim submission flow validating policy eligibility, hospital dates, itemized billing lines, and supporting documents.
- **Visual Claim Lifecycle Tracker**: Timeline tracking (`submitted` → `validation` → `risk_screening` → `under_review` → `approved` / `rejected` → `payment_processing` → `settled`).
- **Interactive Document Requests**: Immediate alerts and one-click uploads when investigators require additional medical records or discharge summaries.
- **Strict Privacy**: Patient views never expose internal risk scores, fraud flags, or private investigator notes.

### 2. Investigator Workspace (`/investigator/*`)
- **Forensic Claims Queue**: Multi-criteria filters by risk priority (`Critical`, `High`, `Medium`, `Low`), assigned reviewer, provider, and wait time.
- **Explainable 0–100 Risk Engine**: 10 deterministic, auditable rules assessing exact invoice matches, near-duplicates, unbundled line items, fee outliers, and provider watchlists.
- **Side-by-Side Duplicate Comparison**: Side-by-side field inspection highlighting matching fields (green) and differing fields (yellow).
- **Adjudication Workbench**: One-click actions with audit-logged reasons for Full Approval, Partial Approval (with specific approved liability), Document Requests, Rejections, and False-Positive overrides.
- **Executive Analytics**: Interactive Recharts dashboards visualizing claim volumes, provider exposure, financial totals (Claimed vs. Approved vs. Settled in ₹ INR), and review turnaround times.
- **Tamper-Evident Audit Ledger**: Chronological log of all consequential actions with actor identities and timestamped state diffs.

---

## 🚀 Live Demo & Startup Instructions

Both services are pre-built and ready to run on Windows PowerShell.

### Quick Start (Windows PowerShell)

```powershell
# 1. Start the FastAPI Backend
cd apps\api
uvicorn main:app --reload --port 8000

# 2. In a second terminal, start the Next.js Frontend
cd apps\web
npm run start -- -p 3000
```

### Application URLs
- **Web Portal**: [http://localhost:3000](http://localhost:3000)
- **FastAPI Interactive Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **API Health Check**: [http://localhost:8000/api/health](http://localhost:8000/api/health)

---

## 🔐 Synthetic Demo Accounts

The database comes pre-seeded with 110 realistic Indian healthcare claims, 25 patient profiles, and 10 hospitals:

| Role | Email | Password | Pre-loaded Capabilities |
| :--- | :--- | :--- | :--- |
| **Patient 1** | `patient1@demo.claimlens.ai` | `Demo@Patient1` | Aarav Sharma (Star Health Policy, 7 pre-filed claims) |
| **Patient 2** | `patient2@demo.claimlens.ai` | `Demo@Patient2` | Priya Patel (HDFC ERGO Policy, active claims) |
| **Investigator** | `investigator@demo.claimlens.ai` | `Demo@Invest1` | Vikram Rathore (Full forensic queue, decision panel, notes) |
| **Admin** | `admin@demo.claimlens.ai` | `Demo@Admin1` | Anita Desai (Full access + audit logs) |

*You can also use the **1-Click Demo Launch** buttons on the landing page.*

---

## 🧪 Automated Testing

### 1. Backend Pytest Suite
Run the 22 comprehensive unit and integration tests covering authentication, patient data isolation, claim transitions, and all 10 risk rules:

```powershell
cd apps\api
python -m pytest tests/ -v
```

*Result: 22 passed, 0 failed.*

### 2. End-to-End Acceptance Test
Execute the full 12-step end-to-end acceptance script:

```powershell
cd apps\api
python verify_acceptance.py
```

*Result: All 12 criteria verified and passing.*

### 3. Frontend Typecheck
```powershell
cd apps\web
npx tsc --noEmit
```

*Result: 0 errors across 18 Next.js App Router routes.*

---

## 🛡️ Risk Engine Deterministic Rules

The risk engine computes an operational screening score (0–100) mapped to four priority bands:
- `0–24`: **Low Priority** (Fast-track candidate)
- `25–49`: **Medium Priority** (Documentation verification required)
- `50–74`: **High Priority** (Senior investigator review recommended)
- `75–100`: **Critical Priority** (Cross-hospital duplicate or major billing anomaly)

| Rule ID | Rule Name | Score | Trigger Condition |
| :--- | :--- | :--- | :--- |
| **R001** | Exact Duplicate Invoice | `+40` | Same invoice number, provider, and patient submitted previously. |
| **R002** | Near-Duplicate Claim | `+30` | Same patient & provider with treatment dates within 7 days and amounts within 10%. |
| **R003** | Itemized Total Mismatch | `+25` | Difference between `total_claimed_amount` and sum of line items > ₹0.01. |
| **R004** | Repeated Line Items | `+15` | Same billing code appears more than 2 times in a single claim. |
| **R005** | Medical Coding Inconsistency | `+20` | Mutually exclusive CPT pairs billed together (e.g. `SURG-101` & `SURG-102`). |
| **R006** | Unusually High Billing Amount | `+20` | Claim amount > 2.5 standard deviations above specialty peer average (min 5 claims). |
| **R007** | Invalid Treatment Dates | `+15` | Discharge date precedes admission date, future dates, or outside policy window. |
| **R008** | Unusual Claim Frequency | `+10` | More than 3 claims submitted by the same patient within a 30-day window. |
| **R009** | Missing Required Documents | `+15/ea` | Hospital stays missing discharge summaries or claims > ₹50,000 missing invoices. |
| **R010** | Provider Billing Anomaly | `+20` | Provider listed on compliance or billing anomaly watchlists. |

---

## ⚖️ Ethical Governance & Limitations

1. **Decision Support, Not Automated Denial**: Risk scores and anomaly flags are operational screening tools. The system **never** automatically rejects a claim based on a score.
2. **False-Positive Overrides**: Investigators can document false-positive rationales to clear flags on legitimate complex medical cases.
3. **Local Demo Setup**: Uses local SQLite database and local filesystem storage for demonstration without external cloud dependencies. In production, configure Supabase PostgreSQL and private S3/Supabase Storage.
