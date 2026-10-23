# ScholarFund — Direct Academic Sponsorship Platform

ScholarFund is a full-stack university scholarship and micro-sponsorship web application built with **React 19**, **Express 5**, and an embedded **SQLite (WAL)** relational database.

## Repository Setup (Clone & Run)

```bash
git clone https://github.com/Deval999-arch/group-work.git
cd group-work
npm install
npm run dev
```

- **Web Interface (Vite Dev Server):** `http://localhost:5173`
- **Unified Full-Stack Server & REST API:** `http://localhost:4000`
- **Production Build:** `npm run build`
- **Automated Security Suite (`8/8` checks):** `npm run test:security`

## Project Structure

```text
group-work/
├── index.html                 # Application HTML entry shell & typography setup
├── package.json               # Scripts & minimal full-stack dependencies
├── vite.config.js             # Vite dev server, /api proxy & production build config
├── scripts/
│   └── dev.mjs                # Concurrent launcher for Express (:4000) + Vite (:5173)
├── server/
│   ├── index.cjs              # Express 5 REST API, auth, checkout, uploads & static server
│   ├── db.cjs                 # Embedded SQLite (WAL) schema & initial scholar seed data
│   ├── sessionStore.cjs       # Signed HttpOnly cookie session store
│   ├── policies.cjs           # Input validation, magic-byte check & security headers
│   └── policies.test.cjs      # Automated security test suite (Node test runner)
├── public/
│   └── images/                # Verified scholar campaign portraits
└── src/
    ├── main.jsx               # React 19 entry point
    ├── App.jsx                # Application shell, navigation state & live activity toast
    ├── api.js                 # Typed frontend API client
    ├── format.js              # Currency, date & percentage helpers
    ├── styles.css             # Custom design tokens, aurora gradients & responsive layout
    └── components/
        ├── Navbar.jsx         # Persistent navigation bar & active role session controls
        ├── LandingSections.jsx# Executive hero, metrics, scholar spotlight & FAQ sections
        ├── MotionPrimitives.jsx# Scroll reveals, eased counters & micro-interaction primitives
        ├── CampaignDetail.jsx # Detailed scholar dossier, budget table & milestone timeline
        ├── PaymentCheckout.jsx# 4-method sponsorship checkout & printable escrow receipt
        ├── StudentPortal.jsx  # Scholar campaign studio, photo uploader & funding analytics
        ├── DonorDashboard.jsx # Sponsor portfolio dashboard & receipt history
        ├── AdminDashboard.jsx # Institutional review queue, verification & audit log console
        ├── PhotoUploader.jsx  # Client canvas image optimizer & binary upload widget
        ├── AuthModal.jsx      # Sign-in & scholar enrollment modal
        └── AboutSecurity.jsx  # Governance, escrow architecture & security documentation
```

## Key Capabilities

- **Public Scholar Directory & Motion Choreography:** Live search, discipline & status filters, smooth scroll reveals, eased impact counters, and a live sponsorship activity stream.
- **Scholar Campaign Studio & Detailed Dashboard:**
  - Drag-and-drop / file-picker photograph upload with client-side canvas optimization and server-side binary magic-byte verification (`JPG`, `PNG`, `WebP`).
  - Itemized tuition, laboratory, and thesis cost breakdown builder with automatic funding goal calculation.
  - Real-time radial progress gauge, interactive cumulative sponsorship SVG chart, academic milestone composer, and incoming sponsor ledger.
- **Sponsor Portfolio Dashboard & Multi-Channel Checkout:**
  - Four settlement workflows: **Credit / Debit Card** (live visual card preview & brand detection), **Institutional Bank Wire**, **Mobile Money** (`OPay`, `PalmPay`, `MTN MoMo`, `Airtel`, `M-Pesa`), and **Digital Wallets** (`PayPal`, `Apple Pay`, `Google Pay`), supporting both **One-Time** and **Monthly Stipend** schedules.
  - Portfolio analytics by academic discipline, supported scholar progress tracking, and printable official escrow certificates.
- **Executive Review & Security Governance Console:**
  - Pending student dossier verification queue, spotlight & verification controls, payment rail volume summaries, and an immutable server-side audit trail.

## Seeded Institutional Profiles

- **Review Board Chair (`admin`):** `admin@scholarfund.org` / `ScholarFund!2026`
- **Verified Scholar (`student`):** `amara.mensah@scholarfund.org` / `Scholar!2026`
- **Fellowship Sponsor (`donor`):** `marcus.vance@scholarfund.org` / `Sponsor!2026`
