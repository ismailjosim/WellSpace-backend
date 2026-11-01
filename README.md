<p align="center">
  <img src="./public/wellspace-logo.png" alt="WellSpace Logo" width="180" />
</p>

<h1 align="center">WellSpace Backend 🩺</h1>

<p align="center">
  <strong>Enterprise clinical REST API and micro-services backend powering the WellSpace digital healthcare platform.</strong>
</p>

<p align="center">
  Engineered with Node.js, Express 5, TypeScript, Prisma 7 ORM, and PostgreSQL. Features automated super-admin bootstrapping, RBAC, Stripe payments, Cloudinary storage, 2FA, and automated clinical cron lifecycles.
</p>

---

## 🌟 Key Features

- **Multi-Role RBAC Security:** Strict privilege segmentation across `SUPER_ADMIN`, `ADMIN`, `DOCTOR`, and `PATIENT` roles via JWT authentication and permission guards.
- **Automated Database Seeding:** Instant seed initialization on startup for the default `SUPER_ADMIN` account using environment variables.
- **Modular Multi-File Prisma Schema:** Scalable relational architecture segmented into discrete schema domain models (`user`, `appointment`, `consultation`, `patientData`, `schedule`, `prescription`, `audit`, `settings`).
- **Clinical Lifecycle Management:**
  - Automated slot generation, schedule allocation, and conflict detection.
  - Appointment booking with integrated Stripe checkout, payment webhooks, and automatic receipt generation.
  - Background cron tasks for appointment state transitions and schedule cleanups.
- **Live Consultation Engine:** Real-time consultation sessions, doctor review ratings, and digital prescription issuance.
- **Two-Factor Authentication & Audit Logging:** TOTP / Speakeasy QR-code MFA support, password reset workflows with nodemailer email delivery, and persistent activity audit logs.
- **Cloudinary Storage:** Secure clinical document, avatar, and diagnostic report uploads via Multer and Cloudinary CDN.

---

## 🛠️ Tech Stack

- **Runtime & Language:** Node.js `>= 20.x`, TypeScript 5.9
- **Server Framework:** Express 5.1
- **Database & ORM:** PostgreSQL, Prisma ORM 7.7 (`@prisma/adapter-pg` driver)
- **Authentication:** JSON Web Tokens (`jsonwebtoken`), `bcryptjs`, Cookie-Parser, Speakeasy (TOTP 2FA)
- **Payment Gateway:** Stripe API (`stripe`)
- **Cloud Storage:** Cloudinary (`multer-storage-cloudinary`)
- **Scheduler:** `node-cron`
- **Mailing:** `nodemailer` with EJS HTML templates
- **AI Integration:** OpenAI / OpenRouter SDK
- **Data Validation:** Zod

---

## 📁 Directory Architecture

```text
Backend/
├── prisma/
│   ├── schema/                  # Multi-file Prisma schemas
│   │   ├── appointment.prisma   # Appointments & transactions
│   │   ├── audit.prisma         # Activity & system audit logs
│   │   ├── chat.prisma          # Chat messaging entities
│   │   ├── consultation.prisma  # Video consultation sessions
│   │   ├── enum.prisma          # Shared enums (UserRole, AppointmentStatus, etc.)
│   │   ├── notification.prisma  # Real-time notifications
│   │   ├── patientData.prisma   # Health records, vitals, medical history
│   │   ├── reminder.prisma      # Clinical reminders
│   │   ├── schedule.prisma      # Doctor availability & time slots
│   │   ├── schema.prisma        # Main datasource & generator configuration
│   │   ├── settings.prisma      # Platform parameters
│   │   ├── specialty.prisma     # Medical specialties
│   │   └── user.prisma          # Users, Admins, Doctors, Patients
│   └── migrations/              # PostgreSQL migration history
├── src/
│   ├── server.ts                # Server bootstrap, DB connection & cron jobs
│   └── app/
│       ├── app.ts               # Express app instance, middleware & global error handling
│       ├── config/              # Centralized environment configs
│       ├── helpers/             # Pagination, sorting & query builders
│       ├── interfaces/          # Global TypeScript interfaces
│       ├── jobs/                # Background automated cron tasks
│       ├── middlewares/         # Auth, RBAC guards, file uploaders & validators
│       ├── modules/             # Business modules (Controller, Service, Route, Validation)
│       │   ├── Admin/
│       │   ├── appointment/
│       │   ├── Auth/
│       │   ├── chat/
│       │   ├── consultation/
│       │   ├── doctor/
│       │   ├── doctorSchedule/
│       │   ├── meta/
│       │   ├── notification/
│       │   ├── patient/
│       │   ├── payment/
│       │   ├── prescription/
│       │   ├── review/
│       │   ├── schedule/
│       │   ├── settings/
│       │   ├── Specialties/
│       │   └── User/
│       ├── routes/              # Centralized API index router
│       ├── shared/              # Prisma client singleton & pick helper
│       └── utils/               # Emailers, seeders & template engines
```

---

## 🔌 API Endpoints Overview

All routes are served under `/api/v1`:

| Route Prefix | Primary Purpose | Auth Level |
|---|---|---|
| `/auth` | Login, 2FA, token refresh, password resets | Public / Authenticated |
| `/user` | Account registration, profile management, status toggles | Varied / RBAC |
| `/doctor` | Clinician discovery, profile customization, filtering | Public / Doctor / Admin |
| `/patient` | Patient medical profiles & record management | Patient / Admin |
| `/specialties` | Medical specialty CRUD & categorization | Public / Admin |
| `/schedule` | Base schedule time slot management | Admin / Doctor |
| `/doctor-schedule` | Doctor slot associations & availability toggles | Doctor / Admin |
| `/appointment` | Slot booking, rescheduling, and cancellations | Patient / Doctor / Admin |
| `/payment` | Stripe checkout session initiation & webhooks | Patient / Public Webhook |
| `/consultation-session`| Telehealth session tracking and status | Doctor / Patient |
| `/prescription`| Digital prescription issuance and retrieval | Doctor / Patient |
| `/review` | Patient feedback and doctor ratings | Patient / Public |
| `/notifications`| Real-time alerts and user notifications | Authenticated |
| `/chat` | Secure in-app patient-doctor messaging | Authenticated |
| `/metadata` | Analytic dashboards & meta statistics | Role-dependent |
| `/settings` | System-wide operational settings | Admin / Super Admin |

---

## ⚙️ Environment Configuration

Create a `.env` file in the `Backend/` directory:

```env
PORT=5000
NODE_ENV=development

# PostgreSQL Connection
DATABASE_URL="postgresql://<user>:<password>@<host>:5432/<dbname>?schema=public"

# Frontend Application URL (CORS allowed origin)
FRONTEND_URL="http://localhost:3000"

# JWT Secrets
JWT_SECRET="your_jwt_access_secret"
EXPIRES_IN="1d"
REFRESH_TOKEN_SECRET="your_jwt_refresh_secret"
REFRESH_TOKEN_EXPIRES_IN="30d"
RESET_PASS_TOKEN="your_jwt_reset_pass_secret"
RESET_PASS_TOKEN_EXPIRES_IN="15m"

# Default Super Admin Seed Credentials
SUPER_ADMIN_EMAIL="superadmin@wellspace.com"
SUPER_ADMIN_PASSWORD="YourSecurePassword123!"

# Cloudinary Storage
CLOUDINARY_CLOUD_NAME="your_cloud_name"
CLOUDINARY_API_KEY="your_api_key"
CLOUDINARY_API_SECRET="your_api_secret"

# Stripe Payment Gateway
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# SMTP Email Configuration
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=465
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your_app_password"

# AI / OpenRouter
OPEN_ROUTER_API_KEY="sk-or-v1-..."
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js:** `>= 20.x`
- **PostgreSQL:** `>= 15.x`
- **pnpm:** `pnpm` package manager

### 2. Installation
```bash
cd Backend
pnpm install
```

### 3. Database Migration & Prisma Setup
```bash
# Push schema migrations to PostgreSQL
pnpm prisma:migrate

# Generate Prisma Client
pnpm prisma:generate
```

### 4. Running the Server
```bash
# Development mode with hot-reloading
pnpm dev

# Alternative using ts-node-dev
pnpm dev:node
```
The API server will listen at [http://localhost:5000](http://localhost:5000). On startup, the database connection is verified and the super admin seeder runs automatically.

### 5. Production Build
```bash
# Compile TypeScript to CommonJS dist
pnpm build

# Run production server
pnpm start
```

---

## ☁️ Deployment to Render

1. Create a **Web Service** pointing to your `WellSpace-backend` repository.
2. Select **Node** environment.
3. Set **Build Command:**
   ```bash
   pnpm install --frozen-lockfile; pnpm run build
   ```
4. Set **Start Command:**
   ```bash
   pnpm run start
   ```
5. Supply all environment variables from `.env` in the Render Dashboard (pointing `DATABASE_URL` to your live PostgreSQL database).

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

