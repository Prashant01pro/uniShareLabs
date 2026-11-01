# UniShare Labs — Frontend Application

[![React](https://img.shields.io/badge/React-19.x-61dafb.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.x-646cff.svg)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC.svg)](https://tailwindcss.com/)
[![Lucide](https://img.shields.io/badge/Lucide-Icons-orange.svg)](https://lucide.dev/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-Client-white.svg)](https://socket.io/)

The UniShare Labs frontend is a **React 19 single-page application** powered by **TypeScript**, **Vite 6**, and **Tailwind CSS**. It delivers an institutional user experience for discovering scientific instrumentation, evaluating deterministic safety gates, managing custody check-in PINs, tracking 48h review SLAs, inspecting sensor condition diffs, and verifying cryptographic audit trails.

---

## Table of Contents
1. [Architecture & Component Structure](#architecture--component-structure)
2. [State Management & Contexts](#state-management--contexts)
3. [6 Interactive Operational Consoles](#6-interactive-operational-consoles)
4. [Authentication Portals & Evaluator Fast Pass](#authentication-portals--evaluator-fast-pass)
5. [Real-Time WebSocket Integration](#real-time-websocket-integration)
6. [Axios RFC 7807 & Token Refresh Queue](#axios-rfc-7807--token-refresh-queue)
7. [Directory Map](#directory-map)
8. [Running, Previewing & Building](#running-previewing--building)

---

## Architecture & Component Structure

The frontend application is structured for usability and high-density academic information display:
- **Clean Separation of Concerns**: Consoles (`catalog`, `bookings`, `management`, `audit`, `auth`) are decoupled into feature folders.
- **Strict TypeScript Typing**: Interfaces in [`src/types/index.ts`](file:///d:/hackathon/frontend/src/types/index.ts) map to backend Mongoose schemas and DTOs.
- **Defensive API Resilience**: Components guard data fetching with active token checks and render informative empty states instead of raw console errors.
- **Dark Scientific Laboratory Aesthetic**: Styled with Tailwind CSS using custom surface elevations (`bg-surface-950`, `bg-surface-900`), border highlights, and status badge color-coding.

---

## State Management & Contexts

### 1. `AuthContext` ([`src/context/AuthContext.tsx`](file:///d:/hackathon/frontend/src/context/AuthContext.tsx))
- **Smart Session Initialization**: Automatically provisions a demo persona on initial boot if no saved token exists:
  - If navigating to `/review`, automatically initializes as **Lab Manager** (`Dr. Sarah Jenkins`).
  - Otherwise, initializes as **Researcher** (`Dr. Elena Rostova`).
- **1-Click Persona Switching**: Exposes `switchPersona(role)` that leverages `/api/v1/auth/demo-tokens` for instant credential-free switching across all 5 roles.
- **Global Token Dispatch**: Manages `localStorage` token storage and synchronizes bearer authorization headers across all Axios instances.

### 2. `SocketContext` ([`src/context/SocketContext.tsx`](file:///d:/hackathon/frontend/src/context/SocketContext.tsx))
- Establishes a persistent WebSocket connection to the backend gateway.
- Automatically joins departmental and role rooms (`user:id`, `role:ROLE`).
- Dispatches real-time toasts and updates when reservations are approved, rejected, or offered.

---

## 6 Interactive Operational Consoles

### 1. Equipment Discovery Catalog (`/resources`)
- **Category Filter Tabs**: *Microscopes*, *Cleanrooms*, *Makerspace 3D Printers*, *Spectrometers*, *CNC Machining*, and *General Lab*.
- **Live Search**: Instant keyword filtering across instrument titles, lab rooms, and specification summaries.
- **Deterministic 7-Gate Eligibility Modal**:
  - Tests user credentials against the instrument's safety prerequisites.
  - Displays a detailed diagnostic roadmap indicating met criteria (Role, Inductions, Safety courses) and remediation actions for missing requirements.
- **Reservation Modal**: Half-open time interval picker with NSF/NIH grant code input and safety agreement confirmation.

### 2. Reservations & Custody Sessions (`/bookings`)
- **Status Filtering**: Filter by *Active & Approved*, *Pending Review*, *Completed*, *In Dispute*, and *Waitlist & Offers*.
- **Digital Access PIN**: Masked 4-digit PIN toggle (`••••` $\rightarrow$ `4892`) for unlocking equipment access controllers.
- **Pre-Flight Custody Check-In Modal**:
  - Verifies baseline hardware meters (e.g. Laser emission hours, Cryo-temperature).
  - Prompts pre-use checklist completion and captures a digital signature.
- **Post-Use Return Modal & Condition Diff Viewer**:
  - Records post-session dial readings and final cleanliness ratings.
  - Computes the condition diff ($\Delta \text{Meters}$, $\Delta \text{Condition}$) and displays usage deltas.

### 3. Manager Review & Adjudication Queue (`/review`)
- **48-Hour SLA Countdown**: Real-time visual tracking of review deadlines (`NORMAL`, `WARNING < 12h`, `URGENT < 4h`, `SLA BREACHED`).
- **Applicant Trust Dossier**: Displays applicant trust score badge, departmental affiliation, and research grant billing codes.
- **1-Click Action Modals**: Approve reservation (generating PIN), Reject request (selecting standardized reason codes), or Delegate review to another investigator.
- **Role Guard Banner**: If signed in as Student or Researcher, displays a notice with an instant 1-click **"Switch to Lab Manager"** button.

### 4. Anti-Monopolization Fair Waitlist (`/waitlist`)
- **Dynamic $F$-Formula Breakdown Cards**:
  - Visual display of component scores:
    $$F = 0.35 \cdot S_{\text{history}} + 0.20 \cdot S_{\text{cancellations}} + 0.25 \cdot S_{\text{reputation}} + 0.20 \cdot S_{\text{waitlist}}$$
  - Displays weekly usage hours, trust score, and queue tenure.
- **Active 2-Hour Offer Countdown**: If a slot is offered, an interactive countdown timer allows 1-click **Accept Offer** or **Decline Offer** (cascading slot to next candidate).

### 5. Incident Triage & Dispute Resolution Center (`/incidents`)
- **High-Density Incident Cards**: Categorized by severity (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`) and status (`INVESTIGATING`, `RESOLVED`, `DISMISSED`).
- **Photographic Evidence Viewer**: Inspects uploaded before-and-after photos with SHA-256 tamper-evident hashes.
- **Operator Defense Statement Filing**: Borrower can submit an official defense explanation directly on the disputed ticket.
- **Facility Manager Adjudication Console**: Allows managers to enter liability rulings (`USER_LIABLE`, `DISMISSED`, `PREEXISTING_FATIGUE`), assign penalty points, and charge grant accounts.

### 6. SHA-256 Cryptographic Audit Ledger (`/audit`)
- **Chronological Block Explorer**: Interactive timeline of every system mutation from Genesis block to current tip.
- **Expanded Block Inspection**: Inspect sequence numbers, event IDs, actor IDs, actions, payload hashes, and preceding hashes ($H_{n-1}$).
- **Interactive "Verify Hash Chain" Engine**: Runs a live verification recalculating every SHA-256 block hash from Genesis to current tip, displaying a green **"100% Cryptographically Intact"** audit confirmation.
- **Stewardship Analytics**: Embedded utilization rate summaries and departmental grant chargeback graphs.

---

## Authentication Portals & Evaluator Fast Pass

The platform supports two complementary authentication paths:

1. **Dedicated Sign-In & Registration Pages (`/login` & `/register`)**:
   - **Login Page (`/login`)**: Supports university credentials with real-time error feedback, RFC 7807 problem details display, and a **1-Click Evaluator Fast Pass** section for all 5 personas.
   - **Registration Page (`/register`)**: Institutional registration with role selection (`STUDENT`, `RESEARCHER`, `RESOURCE_OWNER`, `LAB_MANAGER`), department dropdown, and a live password criteria checklist (8+ chars, upper, lower, digit, special symbol).
2. **Top Navigation & Floating Role Switcher (`RoleSwitcher.tsx`)**:
   - Available on every screen to allow evaluators to swap between Student, Researcher, Owner, Manager, and Admin with zero credential typing.

---

## Real-Time WebSocket Integration

The client automatically connects to the backend gateway:
- **Connection Handshake**: Authenticates with active Bearer token.
- **Room Subscriptions**: Automatically enters personal room (`user:${userId}`) and role room (`role:${userRole}`).
- **Event Listeners**:
  - `booking:approved`: Emits real-time notification to borrower with their generated PIN.
  - `booking:rejected`: Displays reviewer notes and rejection reason.
  - `waitlist:offered`: Triggers the 2-hour countdown offer alert.
  - `incident:filed`: Alerts manager and borrower when an inspection condition delta flags an anomaly.

---

## Axios RFC 7807 & Token Refresh Queue

The HTTP client in [`src/services/api.ts`](file:///d:/hackathon/frontend/src/services/api.ts) provides robust error handling:
- **RFC 7807 Problem Details Parsing**: Automatically unpacks `detail`, `title`, and structured field validation arrays from API responses.
- **401 Token Refresh Interceptor**: When an access token expires:
  1. Intercepts the 401 response and pauses outgoing requests in a memory queue.
  2. Dispatches a call to `/api/v1/auth/refresh-token` with the stored refresh token.
  3. Replays all failed requests with the new access token.
  4. If the refresh token is also invalid, triggers a graceful `auth:logout` event.

---

## Directory Map

```
frontend/
├── src/
│   ├── components/
│   │   └── common/
│   │       ├── Navbar.tsx            # Navigation, active user pill & console tabs
│   │       ├── Footer.tsx            # University branding & attribution
│   │       ├── RoleSwitcher.tsx      # 1-Click Fast Pass persona switcher
│   │       ├── StatusBadge.tsx       # Standardized status pill badge
│   │       └── Modal.tsx             # Accessible backdrop dialog component
│   │
│   ├── context/
│   │   ├── AuthContext.tsx           # Auto-login fallback, switchPersona & tokens
│   │   └── SocketContext.tsx         # WebSocket gateway provider
│   │
│   ├── features/
│   │   ├── catalog/
│   │   │   ├── ResourceCatalog.tsx   # Discovery, category filters & search
│   │   │   ├── ResourceDetailModal.tsx # 7-gate deterministic safety evaluation
│   │   │   ├── BookingModal.tsx      # Guided half-open interval reservation wizard
│   │   │   └── ResourceCreateModal.tsx # Instrument listing creation dialog
│   │   ├── bookings/
│   │   │   └── BookingsList.tsx      # My Bookings, PIN reveal & cancellation
│   │   ├── handover/
│   │   │   ├── CheckInModal.tsx      # Pre-use dial inspection & digital signature
│   │   │   ├── ReturnModal.tsx       # Post-use dial readings & cleanliness rating
│   │   │   └── ConditionDiffViewer.tsx # Sensor meter delta & condition diff viewer
│   │   ├── management/
│   │   │   ├── ReviewQueue.tsx       # 48h SLA review queue & 1-click approvals
│   │   │   └── WaitlistManager.tsx   # Anti-monopoly F-Score & 2h countdown timer
│   │   ├── audit/
│   │   │   ├── DisputeCenter.tsx     # Incident triage, defense & adjudication
│   │   │   └── AuditLedgerView.tsx   # SHA-256 cryptographic chain verifier
│   │   └── auth/
│   │       ├── LoginPage.tsx         # Sign-in portal with 1-click evaluator buttons
│   │       └── RegisterPage.tsx      # Academic registration with password criteria
│   │
│   ├── services/
│   │   ├── api.ts                    # Axios RFC 7807 client & 401 refresh queue
│   │   └── socket.ts                 # Socket.IO connection & event dispatcher
│   │
│   ├── types/
│   │   └── index.ts                  # Shared TypeScript models and interfaces
│   │
│   ├── App.tsx                       # Master routing & tab controller
│   ├── main.tsx                      # Entry point
│   └── index.css                     # Tailwind CSS & custom styling
│
├── package.json
├── vite.config.ts                    # Vite dev server & proxy configuration
└── tsconfig.json
```

---

## Running, Previewing & Building

From the `frontend/` directory:

```bash
# Start Vite development server with HMR on http://localhost:5173
npm run dev

# Run TypeScript type check and production Vite bundle
npm run build

# Preview production build locally
npm run preview
```

