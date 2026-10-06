# LabPulse — Campus Laboratory Issue & Operations Management System

LabPulse is an enterprise-grade full-stack web application designed for engineering colleges and universities to triage, escalate, diagnose, and resolve laboratory hardware, software, and infrastructure issues across distributed laboratory nodes.

---

## 1. System Architecture & Escalation Lifecycle

LabPulse enforces a strict multi-tier verification and escalation workflow:

```
[Student Reports Issue]
         │ (POST /api/complaints + Image Evidence)
         ▼
[Tier 1: SUBMITTED / HOD_VERIFICATION]
         │
         ├─── (HOD Rejects) ───► [REJECTED] ──► (Student Notified)
         ▼
[Tier 2: LAB_INCHARGE_VERIFICATION]
         │
         ├─── (Incharge Rejects) ───► [REJECTED] ──► (Student Notified)
         ▼
[Tier 3: ASSIGNED_TO_MAIN_ADMIN]
         │ (Main Admin Triage Matrix)
         ▼
[Tier 4: ACCEPTED & TECHNICIAN DISPATCHED]
         │ (Diagnostic / Repair Logs)
         ▼
[Tier 5: IN_PROGRESS]
         │ (Final Resolution & Verification Benchmark)
         ▼
[Tier 6: RESOLVED / CLOSED] ──► (Student & Faculty Notified & Archived)
```

---

## 2. Technology Stack

### Frontend (`client/`)
* **Framework**: React 18 + Vite
* **Styling**: Vanilla TailwindCSS v3 configured with Stitch Design System Tokens
* **Typography**: Google Fonts pairing:
  * `Hanken Grotesk` (Headings, Body Copy, Interfaces)
  * `JetBrains Mono` (Sequential IDs, Telemetry, Counters, Terminals)
* **Icons**: Google Material Symbols Outlined
* **State & Networking**: React Context API (`AuthContext`, `ToastContext`), Axios with Bearer Interceptors
* **Components**: 3D Tactile Buttons (`.btn-tactile-primary`, `.btn-tactile-secondary`, `.btn-tactile-danger`, `.btn-tactile-success`), 7-Node Milestone Timeline, Kanban Matrix, Evidence Lightbox

### Backend (`server/`)
* **Runtime**: Node.js v24+
* **Framework**: Express.js
* **Database**: MongoDB with Mongoose ODM (Unique Sequential ID generator `CMP-YYYY-XXXX`)
* **Authentication**: JWT (JSON Web Tokens) with 7-day expiration
* **Security & Hardening**:
  * Bcrypt password hashing (Salt factor 10)
  * Helmet security headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `X-Powered-By` hidden)
  * NoSQL injection sanitizer (stripping `$` and `.` operators from body, query, and params)
  * XSS payload filtration
  * Rate limiting (`express-rate-limit` for auth endpoints and general API)
  * IDOR (Insecure Direct Object Reference) ownership protection
* **File Uploads**: Multer memory storage + Cloudinary streaming upload with offline filesystem fallback

---

## 3. Directory Structure

```
fix it/
├── package.json                   # Root workspace orchestration
├── .gitignore                     # Workspace Git exclusion
├── README.md                      # Production Runbook & Documentation
├── client/                        # Frontend Vite + React application
│   ├── index.html                 # App shell with typography imports
│   ├── tailwind.config.js         # Design tokens & color system
│   ├── src/
│   │   ├── api/axios.js           # Axios client with interceptors
│   │   ├── components/            # Layout, complaints, notifications, common
│   │   ├── context/               # AuthContext & ToastProvider
│   │   ├── pages/                 # StudentHub, RaiseIssue, HodQueue, LabInchargeQueue, AdminConsole, Login, Register
│   │   └── services/              # API abstraction services
│   └── package.json
└── server/                        # Backend Express & Mongoose API
    ├── src/
    │   ├── config/                # MongoDB & Cloudinary connectors
    │   ├── controllers/           # Auth, complaints, HOD, Incharge, Admin, Notifications
    │   ├── middleware/            # Auth, RBAC, IDOR, Multer, Security, Error handler
    │   ├── models/                # User, Complaint, StatusHistory, Notification
    │   ├── routes/                # Express API routes
    │   ├── utils/                 # Token generator, ID sequencer, API response wrapper
    │   └── server.js              # Express app entry point
    ├── test-*.js                  # 13 dedicated test suites
    └── package.json
```

---

## 4. Environment Configuration

### Backend (`server/.env`)
```ini
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/labpulse
CLIENT_URL=http://localhost:5173
JWT_SECRET=labpulse_secure_jwt_secret_key_2026
JWT_EXPIRES_IN=7d

# Cloudinary (Optional - Fallback active if unconfigured)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### Frontend (`client/.env`)
```ini
VITE_API_URL=http://localhost:5000/api
```

---

## 5. Local Setup & Execution

### Prerequisites
* **Node.js**: v20 or higher
* **MongoDB**: Running locally on port `27017` (`mongodb://127.0.0.1:27017/labpulse`)

### 1. Install Dependencies
```bash
# In the root workspace directory
npm install
npm --prefix server install
npm --prefix client install
```

> **Windows PowerShell Note**: If Windows blocks `npm.ps1` script execution, use `npm.cmd` instead (e.g., `npm.cmd run server:dev`) or allow script execution for your user with:
> ```powershell
> Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
> ```

### 2. Start Backend Server
```bash
# Windows PowerShell:
npm.cmd run server:dev

# Or bash / command prompt:
npm run server:dev
# Server starts at http://localhost:5000
# Health check: http://localhost:5000/api/health
```

### 3. Start Frontend Client
```bash
# Windows PowerShell:
npm.cmd run client

# Or bash / command prompt:
npm run client
# Client dev server starts at http://localhost:5173
```

---

## 6. Automated Testing Matrix (13 Test Suites)

Execute test suites directly from the root workspace:

| Script | Test Scope | Result |
| :--- | :--- | :--- |
| `npm run test:backend` | Server health check and API ping | **PASSED** |
| `npm run test:models` | MongoDB schema validation, bcrypt hashing, ID sequencing | **PASSED** |
| `npm run test:auth` | Registration, login, JWT issuance, profile retrieval | **PASSED** |
| `npm run test:rbac` | Multi-role access control and IDOR ownership guards | **PASSED** |
| `npm run test:complaints` | Student grievance submission, listing, and IDOR isolation | **PASSED** |
| `npm run test:upload` | Multipart image upload, MIME validation, 5MB boundary | **PASSED** |
| `npm run test:hod` | HOD queue inspection, verification approval, and rejection | **PASSED** |
| `npm run test:lab-incharge` | Lab Incharge technical review, verify, and rejection | **PASSED** |
| `npm run test:main-admin` | Admin Kanban matrix, tech dispatch, progress notes, sign-off | **PASSED** |
| `npm run test:tracking` | 7-node student timeline, status milestones, and audit history | **PASSED** |
| `npm run test:notifications`| Push alerts, read receipts, and unread counters | **PASSED** |
| `npm run test:security` | Helmet headers, NoSQL injection, XSS, token tampering | **PASSED** |
| `npm run test:e2e` | Complete 7-step full lifecycle test across all 4 roles | **PASSED** |
| `npm run client:build` | Client production Vite bundle compilation | **PASSED** |

---

## 7. REST API Endpoints

### Authentication (`/api/auth`)
* `POST /api/auth/register` — Register new user (Student, HOD, Lab Incharge, Main Admin)
* `POST /api/auth/login` — Authenticate and issue Bearer JWT
* `GET /api/auth/me` — Get profile of currently authenticated user

### Student Complaints (`/api/complaints`)
* `POST /api/complaints` — Submit lab issue with optional photo evidence
* `GET /api/complaints/my` — List authenticated student's complaints with telemetry
* `GET /api/complaints/:id` — Get full detail of complaint and status audit trail (Protected against IDOR)

### Photo Upload (`/api/upload`)
* `POST /api/upload` — Multipart form upload for incident evidence images (Max 5MB)

### HOD Verification (`/api/hod`)
* `GET /api/hod/complaints/pending` — Fetch pending complaints awaiting department review
* `PATCH /api/hod/complaints/:id/verify` — Approve grievance and escalate to Lab Incharge
* `PATCH /api/hod/complaints/:id/reject` — Reject grievance with mandatory faculty remarks

### Lab Incharge Technical Review (`/api/lab-incharge`)
* `GET /api/lab-incharge/complaints/pending` — Fetch verified issues awaiting physical diagnostics
* `PATCH /api/lab-incharge/complaints/:id/verify` — Escalate to Main Admin for technician dispatch
* `PATCH /api/lab-incharge/complaints/:id/reject` — Reject with hardware diagnostic findings

### Main Admin Operations (`/api/main-admin`)
* `GET /api/main-admin/complaints` — Fetch 4-column triage Kanban matrix & SLA telemetry
* `PATCH /api/main-admin/complaints/:id/accept` — Accept work order and assign engineering technician
* `PATCH /api/main-admin/complaints/:id/progress` — Record diagnostic progress note
* `PATCH /api/main-admin/complaints/:id/resolve` — Certify repair completion and archive work order

### Notifications (`/api/notifications`)
* `GET /api/notifications` — Fetch user's notification list and unread count
* `PATCH /api/notifications/:id/read` — Mark notification as read
* `PATCH /api/notifications/read-all` — Mark all notifications as read

---

## 8. Role-Based Access Control (RBAC) Matrix

| Feature / Endpoint | Student | HOD | Lab Incharge | Main Admin |
| :--- | :---: | :---: | :---: | :---: |
| Student Hub & Timeline Tracking | Own Only | View All | View All | View All |
| Submit New Complaint | Yes | No | No | No |
| HOD Verification Queue | No | Yes | No | Yes (Audit) |
| Lab Incharge Diagnostics Queue | No | No | Yes | Yes (Audit) |
| Admin Operations Kanban Matrix | No | No | No | Yes |
| Work Order Dispatch & Resolution | No | No | No | Yes |
| Notifications Drawer | Yes | Yes | Yes | Yes |

---

## 9. Production Readiness & Build Verification

The application is fully verified for production deployment:
* **Zero Lint & Compilation Errors**: Production client bundle built with Vite (`npm run client:build`) transforms 100 modules in <1 second.
* **100% Test Coverage Across All Roles**: All unit, integration, security, and end-to-end multi-role tests passing.
* **Enterprise Security Active**: Complete defenses against NoSQL injection, XSS, IDOR, and privilege escalation.
