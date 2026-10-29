# RizAgent AI — Autonomous Job Hunter & Auto-Outreach Engine

RizAgent AI is a private, production-ready, full-stack autonomous pipeline designed for software engineers (targeting **Full-Stack MERN** & **React Native**). It actively monitors permitted job channels, analyzes raw job postings with pluggable AI and heuristic classification, matches opportunities against verified candidate profiles, prepares personalized pitches, safely autofills browser application forms using a persistent Playwright worker, and tracks recruitment conversations.

---

## 🌟 Key Features

1. **Exact Visual Identity**: Recreated from the existing design with dark navy glass panels (`glass-panel`), emerald green (`#10b981`) accents, cyan highlights, and Lucide icons.
2. **Authentic Data Only**: Zero simulated success or fabricated recruiter responses in production mode. Demo Mode and Real Production Mode are strictly isolated with a visible UI toggle.
3. **Pluggable AI & Offline Heuristics**: Supports OpenAI, Google Gemini, and Anthropic APIs, with an offline regex/dictionary heuristic engine that requires zero API keys to work out of the box.
4. **URL Safety & Anti-SSRF Enforcer**: Strictly permits `http:` and `https:`, rejects private IP ranges (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `127.0.0.0/8`), blocks AWS/Cloud metadata endpoints (`169.254.169.254`), and re-validates redirect destinations.
5. **Browser Application Automation Worker**: Runs via persistent Playwright worker with semantic locators, accessibility hooks, form detection, CV attachment, preview screenshots, and pauses for CAPTCHA/OTP challenges.
6. **Triple-Mode Automation Guardrails**:
   - **Mode A (Review Only)**: Discovers and scores jobs, drafts pitches; never applies automatically.
   - **Mode B (Approval Required - Default)**: Prepares the form and pitch message; requires explicit candidate approval before final submission.
   - **Mode C (Restricted Auto-Apply)**: Automatically applies only to jobs scoring $\ge$ threshold, adhering to daily rate limits and verified qualifications.
7. **Curriculum Vitae (CV) Profile Store**: Upload verified PDF and DOCX resumes, categorized across MERN, React Frontend, React Native Mobile, or Junior/Internship profiles.
8. **Real Channel Integrations**:
   - **WhatsApp**: Click-to-chat prefilled message generation (`https://wa.me/...`) and Cloud API support with verified credentials.
   - **Telegram**: Bot API polling and alert webhooks.
   - **Email / SMTP**: Nodemailer integration with real CV attachments and delivery verification.
   - **RSS Feeds & Manual Input**: Fast manual paste parser.
9. **Full 15-Stage Application Lifecycle Tracker**: Discovered, Analysing, Matched, Review Required, Approved, Preparing Application, Awaiting Human Verification, Ready to Submit, Submitted, Submission Unconfirmed, Failed, Rejected, Interview, Offer, Closed.

---

## 🏗️ Architecture

```
job/
├── frontend/                     # React + Vite + TypeScript + Tailwind CSS
│   ├── src/
│   │   ├── components/           # Navbar, ChannelTicker, Modal, ManualJobModal, ToastContainer, DemoBanner
│   │   ├── context/              # AuthContext, ModeContext (Demo vs Real toggle)
│   │   ├── layouts/              # MainLayout with sticky header & ticker
│   │   ├── pages/                # Dashboard, Opportunities, Applications, Replies, Profile, Integrations, Settings, Login
│   │   ├── services/             # Axios API client with bearer token interceptor
│   │   └── types/                # Strict TypeScript domain interfaces
│   └── package.json
├── backend/                      # Node.js + Express + TypeScript + Mongoose + Playwright
│   ├── src/
│   │   ├── config/               # Database connection (MongoDB with in-memory fallback), env configuration
│   │   ├── controllers/          # Auth, Dashboard, Profile, Job, Application, Integration, Reply, Settings
│   │   ├── middleware/           # JWT Auth, Multer upload, Rate limiter, Error handling, Validation
│   │   ├── models/               # UserProfile, JobOpportunity, Application, Integration, ActivityLog, etc.
│   │   ├── routes/               # Express REST routers
│   │   ├── services/
│   │   │   ├── ai/               # AI Service with OpenAI, Gemini & Heuristic engine
│   │   │   ├── browser-automation/# Persistent Playwright Worker, URL Safety, Form Detector
│   │   │   ├── matching/         # Scoring engine & duplicate detection fingerprinting
│   │   │   └── messaging/        # Email (SMTP), WhatsApp, Telegram services
│   │   ├── utils/                # Logger, Seed Data, Demo Data
│   │   ├── app.ts
│   │   └── server.ts
│   ├── tests/                    # Jest + Supertest test suites
│   ├── uploads/cvs/              # Secure CV storage
│   ├── screenshots/              # Application preview screenshots
│   └── package.json
├── ai_job_hunter_auto_outreach_command_center.html # Original visual reference
├── .gitignore
└── README.md
```

---

## ⚙️ Prerequisites

- **Node.js**: `v18.0.0` or higher (tested on `v24.19.0`)
- **npm**: `v9.0.0` or higher (tested on `v11.17.0`)
- **MongoDB**: (Optional) A local or remote MongoDB instance. If no MongoDB connection is configured, the backend **automatically spins up an embedded in-memory MongoDB** server, allowing zero-setup local execution!

---

## 🚀 Quick Start Instructions

### 1. Backend Setup

Open a terminal in the root directory:

```bash
cd backend

# 1. Copy environment variables
copy .env.example .env

# 2. (Optional) Edit .env with your custom credentials or leave defaults:
# PORT=5000
# JWT_SECRET=your_secure_secret
# ADMIN_EMAIL=rizwan@rizmern.dev
# ADMIN_PASSWORD=RizMern2026!Secure

# 3. Install Playwright Chromium browser binaries (if not already installed)
npx playwright install chromium

# 4. Start the backend in development mode
npm run dev
```

The backend server will bootstrap, connect to MongoDB (or embedded memory server), seed the default admin account and initial integrations, and listen on `http://localhost:5000`.

### 2. Frontend Setup

Open a **second terminal**:

```bash
cd frontend

# Start the Vite development server
npm run dev
```

The React dashboard will be running at `http://localhost:5173`.

---

## 🔑 Default Initial Account

When running for the first time, RizAgent automatically provisions the primary developer profile:

- **Email**: `rizwangul535@gmail.com`
- **Password**: `peral@2426`
- **Candidate**: Rizwan Ullah (`RizMern`)

Registration is closed by default to prevent unauthorized accounts. You can change your password in the Profile page or via `.env`.

---

## 💬 Meta WhatsApp Cloud API & Webhook Configuration

RizAgent includes native integration with Meta's official WhatsApp Business Cloud API for outgoing recruiter outreach, incoming recruiter reply tracking, and message delivery status updates.

### 1. Required Environment Variables

Configure the following in `backend/.env`:

```env
# Meta WhatsApp Cloud API Credentials
WHATSAPP_PHONE_NUMBER_ID=your_meta_phone_number_id
WHATSAPP_ACCESS_TOKEN=your_meta_system_user_access_token
WHATSAPP_VERIFY_TOKEN=your_custom_secure_verify_token
WHATSAPP_APP_SECRET=your_meta_app_secret
```

> **Security Note:** Secrets and tokens are kept strictly in backend environment variables and are never transmitted to the frontend or exposed in server logs.

### 2. Webhook Endpoints Implemented

- **`GET /api/webhooks/whatsapp`**: Webhook verification endpoint requested by Meta during webhook subscription setup. Validates `hub.mode === 'subscribe'` and `hub.verify_token`, responding with the `hub.challenge` string.
- **`POST /api/webhooks/whatsapp`**: Webhook event receiver for incoming recruiter messages and delivery status updates (`sent`, `delivered`, `read`, `failed`). Validates the `X-Hub-Signature-256` HMAC-SHA256 signature when `WHATSAPP_APP_SECRET` is configured.

### 3. Setting Up the Webhook in Meta App Dashboard

1. **Deploy or Tunnel over HTTPS**:
   - Meta requires an **HTTPS** callback URL. Local `http://localhost:5000` cannot be verified by Meta directly.
   - For local development and testing, create an HTTPS tunnel using ngrok:
     ```bash
     ngrok http 5000
     ```
     This provides a public URL such as `https://your-subdomain.ngrok-free.app`.
2. **Configure in Meta for Developers**:
   - Navigate to your App in the **Meta App Dashboard** &rarr; **WhatsApp** &rarr; **Configuration**.
   - Under **Webhook**, click **Edit**.
   - **Callback URL**: `https://<your-domain>/api/webhooks/whatsapp` (e.g. `https://your-subdomain.ngrok-free.app/api/webhooks/whatsapp`)
   - **Verify Token**: Must match `WHATSAPP_VERIFY_TOKEN` from your `backend/.env`.
   - Click **Verify and Save**. Meta will send a `GET` request to verify the token.
3. **Subscribe to Webhook Fields**:
   - Under Webhook fields, subscribe to **`messages`**.

> [!IMPORTANT]
> **Production Status Disclaimer:** This webhook endpoint is implemented and passes all automated HMAC signature and payload tests. However, it is **NOT production-ready until deployed to a persistent server with a valid SSL/TLS HTTPS certificate and verified in your live Meta App Dashboard**.

### 4. Technical Explanation of Meta Cloud API Limitations

**Important Limitation Regarding Personal WhatsApp Groups:**
- The official **Meta WhatsApp Cloud API does NOT have the technical capability or permission to read or monitor messages from arbitrary personal WhatsApp groups** (e.g. general job groups joined via link on a personal phone).
- The Cloud API is strictly designed for **WhatsApp Business Accounts (WABA)** operating on a registered business phone number.
- It can receive:
  1. Direct 1-on-1 replies from recruiters who respond to your candidate outreach.
  2. Inbound messages from candidates or recruiters directly messaging your business number.
  3. Status updates (`sent`, `delivered`, `read`, `failed`) for messages dispatched by RizAgent.
- **How to Handle WhatsApp Job Groups:**
  - Forward or copy-paste job announcements directly into the dashboard using the **"Paste Job / URL"** button.
  - Forward job announcements directly to your RizAgent WhatsApp bot number; the incoming webhook will log the message into your candidate inbox.

---

## 🧪 Running Automated Tests

Run backend integration and unit tests:

```bash
cd backend
npm test
```

This tests:
1. **URL Safety & Anti-SSRF**: Rejection of localhost, cloud metadata, private subnets, and malformed protocols.
2. **AI Scoring Engine & Matching**: Accurate calculation of match percentages, seniority penalties, and SHA-256 fingerprint deduplication.
3. **Authentication & Access Control**: JWT issuance, invalid login rejection, and bearer token protection on API routes.
4. **Job Ingestion & Application Workflow**: Processing manual jobs, preventing duplicates, and approving opportunities.

To build both projects for production:

```bash
# Backend build (generates dist/)
cd backend
npm run build

# Frontend build (generates dist/)
cd frontend
npm run build
```

---

## 📱 How to Safely Test Complete Workflow

1. Open `http://localhost:5173` and log in with `rizwangul535@gmail.com` / `peral@2426`.
2. Toggle between **DEMO MODE** and **REAL MODE** using the toggle pill in the navigation header.
3. In **DEMO MODE**:
   - Click **"Simulate Post"** to generate an incoming WhatsApp recruiter lead.
   - Inspect the job card to view the match score, extracted skills, and generated pitch.
   - Click **"Approve & Dispatch"** to simulate the outreach.
   - Go to **"Recruiter Replies"** and click **"Trigger Simulated Recruiter Reply"** to test the conversation thread and reply composer.
4. In **REAL MODE**:
   - Go to **"Profile & CV"** and upload your real PDF or DOCX resume.
   - Click **"Paste Job / URL"** from the Dashboard or Opportunities page.
   - Paste a real job post with a recruiter email, WhatsApp number, or application link.
   - The AI analyzer calculates match score, detects contacts, and checks for duplicates.
   - Go to **"Integrations"** to verify your SMTP or WhatsApp connection.

---

## 🛡️ Non-Negotiable Safety Safeguards

- **No Bypass of Anti-Bot Measures**: RizAgent never bypasses CAPTCHAs, Cloudflare checks, or OTP verifications. When a security challenge is detected, it pauses and notifies the candidate.
- **SSRF Protection**: Application URLs extracted from untrusted posts cannot navigate to internal LAN services or AWS metadata endpoints.
- **Sanitized Uploads**: Multer limits CV uploads to verified `.pdf` and `.docx` extensions under 5MB with randomized filenames.
- **Duplicate Protection**: Unique SHA-256 fingerprints prevent applying to the same post twice.
#   J o b - h u n t  
 