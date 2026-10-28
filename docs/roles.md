# 👥 Team Roles & Responsibilities

This document defines the team organization, role distribution, module ownership, and contribution standards for the **iMovies** platform.

---

## 1. Core Team Roles & Responsibilities Table

| Role | Primary Focus | Core Responsibilities | Key Deliverables & Modules |
|---|---|---|---|
| **Full-Stack Lead & Architect** | System Design & Technical Governance | • Overall system architecture, design patterns, and data integrity<br>• Technical specification review and core architectural decisions<br>• Concurrency control and cross-stack integration standards | • Architecture blueprint (`docs/architecture.md`)<br>• Cross-service communication & Socket.io architecture<br>• Release management & technical audits |
| **Backend & API Engineer** | REST Services, Database & Business Logic | • MongoDB schema design, indexing, and Mongoose ODM models<br>• REST API endpoints, routing, controllers, and validation<br>• Third-party external API integrations (TMDB v3/v4, Brevo SDK, Razorpay) | • `server/models/*`, `server/controllers/*`<br>• `server/services/emailService.js`, `brevoConfig.js`<br>• `server/services/tmdbService.js`, `pdfTicketService.js` |
| **Frontend UI/UX Engineer** | Client Interface, State & User Experience | • Responsive React 19 SPA design with Tailwind CSS and FontAwesome<br>• Client routing (`react-router-dom`), lazy loading, and suspense loaders<br>• Real-time WebSocket seat map interactions and responsive modals | • `client/src/pages/*`, `client/src/components/*`<br>• `client/src/components/OtpModal.jsx`, `ForgotPasswordModal.jsx`<br>• Fuzzy search bar and tiered auditorium seating map |
| **DevOps & Cloud Engineer** | Deployment, CI/CD & Infrastructure | • Vercel frontend deployment and SPA rewrite configuration (`vercel.json`)<br>• Cloud backend infrastructure on Render and MongoDB Atlas clusters<br>• Environment variable encryption, SSL/TLS, and build optimization | • `vercel.json`, `client/vercel.json`<br>• Server process daemons, Socket.io CORS policies<br>• Build pipelines (`vite build`, dependency tree audits) |
| **QA & Security Specialist** | Concurrency, Cryptography & Quality Assurance | • Race condition prevention and double-booking stress testing<br>• Cryptographic verification (Razorpay HMAC SHA-256 signatures, bcrypt)<br>• Automated test suites for ticket lifecycle and authentication | • `server/tests/*`<br>• Role-Based Access Control (RBAC: `isAdmin.js`, `fetchUser.js`)<br>• Past showtime validation & seat collision test suites |

---

## 2. Feature Ownership & RACI Matrix

The RACI matrix clarifies team member engagement across each project domain:
- **R** — *Responsible*: The role that executes the task.
- **A** — *Accountable*: The role with final approval and ownership.
- **C** — *Consulted*: Key role providing technical input and review.
- **I** — *Informed*: Kept updated on progress and outcomes.

| Project Domain / Feature | Full-Stack Lead | Backend Engineer | Frontend Engineer | DevOps Engineer | QA Specialist |
|---|:---:|:---:|:---:|:---:|:---:|
| **Authentication & OTP Security** | **A** | **R** | **R** | **I** | **C** |
| **TMDB Discovery & Live Feeds** | **A** | **R** | **R** | **I** | **I** |
| **Interactive Seat Map & WebSockets** | **A** | **R** | **R** | **C** | **C** |
| **Double-Booking Concurrency (TTL)** | **A** | **R** | **C** | **I** | **R** |
| **Razorpay Payment Gateway & HMAC** | **A** | **R** | **R** | **I** | **R** |
| **Brevo Transactional Email Service** | **A** | **R** | **C** | **C** | **I** |
| **Vercel & Render Cloud Deployments** | **A** | **C** | **C** | **R** | **I** |
| **Automated Testing & Security Audits** | **A** | **C** | **C** | **I** | **R** |

---

## 3. Contribution Workflow & Code Quality Standards

### Branching & Commit Conventions
1. **Branch Naming**:
   - `feature/<feature-name>` (e.g., `feature/tmdb-fuzzy-search`)
   - `fix/<bug-name>` (e.g., `fix/admin-login-sync`)
   - `docs/<doc-name>` (e.g., `docs/er-diagram-and-architecture`)
2. **Commit Messages**: Follow Conventional Commits format:
   - `feat: Add Brevo transactional email OTP verification`
   - `fix: Resolve Vercel SPA client route 404 navigation`
   - `docs: Add architecture and user flow diagrams`
   - `refactor: Optimize MongoDB compound indexes for seat locks`

### Code Quality Checklist Before Merging
- [x] Run `npm run build` in `/client` to guarantee zero compilation, bundling, or JSX errors.
- [x] Ensure all environment secrets (`.env`) are excluded from Git commits via `.gitignore`.
- [x] Verify that all new API routes have corresponding controller try-catch error handling.
- [x] Test both responsive mobile viewports and desktop resolutions.
