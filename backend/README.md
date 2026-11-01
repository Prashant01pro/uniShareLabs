# UniShare Labs — Backend Service

[![Node.js](https://img.shields.io/badge/Node.js-22.x-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-5.0-black.svg)](https://expressjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Mongoose](https://img.shields.io/badge/Mongoose-8.x-47A248.svg)](https://mongoosejs.com/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.8-white.svg)](https://socket.io/)
[![Zod](https://img.shields.io/badge/Zod-3.24-3068b7.svg)](https://zod.dev/)
[![Vitest](https://img.shields.io/badge/Vitest-3.0-yellow.svg)](https://vitest.dev/)

The UniShare Labs backend is a **Feature-Based Modular Monolith** engineered with **Express 5**, **TypeScript**, **Mongoose 8**, and **Socket.IO**. It governs institutional equipment stewardship through atomic state transitions, strict schema validation, dual-token JWT authentication, and an immutable SHA-256 append-only audit trail.

---

## Table of Contents
1. [Architecture & Design Principles](#architecture--design-principles)
2. [Technology Stack](#technology-stack)
3. [Directory Layout](#directory-layout)
4. [Feature Modules Deep Dive](#feature-modules-deep-dive)
5. [Database Engine & Transparent In-Memory Fallback](#database-engine--transparent-in-memory-fallback)
6. [Faker-Powered Simulation Seeder](#faker-powered-simulation-seeder)
7. [Environment Configuration](#environment-configuration)
8. [REST API Endpoints Specification](#rest-api-endpoints-specification)
9. [Running, Testing & Building](#running-testing--building)

---

## Architecture & Design Principles

The backend adheres to a **Feature-Based Modular Monolith** architecture:
- **Locality of Behavior**: Every domain entity (`auth`, `labs`, `resources`, `bookings`, `fairness`, `waitlist`, `inspections`, `incidents`, `audit`) encapsulates its own Mongoose models, validation schemas, controllers, services, and route definitions.
- **Fail-Safe Database Strategy**: Automatically detects whether an external MongoDB instance is reachable. If absent, it transparently spawns an embedded in-memory MongoDB 7.0 engine without crashing.
- **RFC 7807 Problem Details**: Errors return standardized, machine-readable JSON structures with distinct error codes and remediation pointers.
- **Atomic Concurrency Guarantee**: Double-booking requests are prevented through atomic half-open interval overlap checks ($[A_s, A_e) \cap [B_s, B_e) \ne \emptyset$).
- **Cryptographic Chaining**: Audit events cannot be inserted, edited, or deleted without breaking the sequential SHA-256 hash continuity.

---

## Technology Stack

| Component | Library / Framework | Purpose |
|---|---|---|
| **Runtime** | Node.js v22 LTS | High-performance asynchronous execution |
| **Framework** | Express 5.0.1 | Next-generation routing with native async error handling |
| **Language** | TypeScript 5.7 | Strict type-safety across models, DTOs, and services |
| **Database** | MongoDB 7.0 & Mongoose 8.9 | Schematized persistence with compound indexing & hooks |
| **In-Memory Fallback** | `mongodb-memory-server` 10.1 | Zero-configuration dev and evaluation database |
| **Real-Time** | Socket.IO 4.8 | Bidirectional event dispatch for approvals & alerts |
| **Validation** | Zod 3.24 | Runtime request payload validation with custom refinements |
| **Security** | Helmet, bcryptjs, jsonwebtoken | Headers security, password hashing, dual JWT tokens |
| **Data Simulation** | `@faker-js/faker` 10.6 | Deterministic high-fidelity academic research simulation |
| **Testing** | Vitest 3.0 & Supertest 7.0 | Integration and API testing harness |

---

## Directory Layout

```
backend/
├── src/
│   ├── app.ts                        # Express app setup, CORS, Helmet, RateLimiting
│   ├── server.ts                     # HTTP server startup, Socket.IO gateway, seed-on-boot
│   │
│   ├── database/
│   │   ├── connection.ts             # Resilient MongoDB connection with MongoMemoryServer fallback
│   │   └── seed.ts                   # High-fidelity Faker-powered database seeder
│   │
│   ├── middleware/
│   │   ├── auth.middleware.ts        # JWT token verification & RBAC guard (requireRoles)
│   │   ├── error.middleware.ts       # RFC 7807 Problem Details error handler
│   │   ├── validate.middleware.ts    # Zod schema validation for body, params, and queries
│   │   └── rate-limit.middleware.ts  # Route-level IP rate limiting
│   │
│   ├── features/                     # Modular domain features
│   │   ├── auth/                     # User model, dual-token JWT, login/register, demo-tokens
│   │   ├── labs/                     # Facility models, opening hours, safety levels
│   │   ├── resources/                # Instrument models, meters, checklists, prerequisites
│   │   ├── bookings/                 # 10-state lifecycle state machine, atomic scheduler
│   │   ├── fairness/                 # F-Score anti-monopoly formula calculator
│   │   ├── waitlist/                 # Cascading queue, 2h offer countdown engine
│   │   ├── inspections/              # Pre-use check-in, post-use return, condition diffing
│   │   ├── incidents/                # Damage reports, operator defense, manager adjudication
│   │   └── audit/                    # SHA-256 immutable ledger, canonical JSON hash chain
│   │
│   └── types/                        # Ambient TypeScript definitions
│
├── .env                              # Environment variable configuration
├── package.json
└── tsconfig.json                     # Strict TypeScript configuration
```

---

## Feature Modules Deep Dive

### 1. `auth` — Institutional Authentication & RBAC
- **Dual-Token Flow**: Generates a 15-minute access token (`JWT_SECRET`) and a 7-day refresh token (`JWT_REFRESH_SECRET`).
- **Standardized Roles**: `STUDENT`, `RESEARCHER`, `RESOURCE_OWNER`, `LAB_MANAGER`, `ADMIN`.
- **Fast Pass Dispatch (`/api/v1/auth/demo-tokens`)**: Issues valid access tokens for all 5 demo personas simultaneously, powering the 1-click UI Role Switcher.

### 2. `labs` — Research Facilities & Core Laboratories
- Defines building locations, room suites, safety levels (`LEVEL_1_GENERAL`, `LEVEL_2_SUPERVISED`, `LEVEL_3_RESTRICTED`), operating hour schedules, and safety officers.

### 3. `resources` — Scientific Instrumentation & Telemetry
- Catalogs instruments with specifications, hourly recharge rates, lead times, turnaround buffers, and maintenance cooldown periods.
- Configures hardware sensor meters (`laserHours`, `operatingTemperature`, `spindleCycles`, `runTimeSeconds`, `chamberVacuum`) and custom inspection checklists.

### 4. `bookings` — 10-State Reservation Lifecycle Engine
- Governs the full state transition machine: `DRAFT` $\rightarrow$ `PENDING_REVIEW` $\rightarrow$ `APPROVED` $\rightarrow$ `CHECKED_IN` $\rightarrow$ `RETURNED` $\rightarrow$ `COMPLETED` (or `DISPUTED` $\rightarrow$ `RESOLVED`).
- Implements half-open time interval conflict detection:
$$\text{Conflict} \iff \max(A_s, B_s) < \min(A_e, B_e)$$
- Generates 4-digit numeric digital access PINs for verified borrowers.

### 5. `fairness` — Anti-Monopoly Multi-Factor Scoring
- Evaluates borrower priority dynamically using the weighted formula:
$$F = 0.35 \cdot S_{\text{history}} + 0.20 \cdot S_{\text{cancellations}} + 0.25 \cdot S_{\text{reputation}} + 0.20 \cdot S_{\text{waitlist}}$$
- Prevents resource monopolization across grant holders and department boundaries.

### 6. `waitlist` — Automated Slot Cascade
- Queues applicants when a slot is occupied.
- When an active reservation is cancelled, the system automatically promotes the top-ranked candidate and activates a **2-hour offer acceptance countdown window**.

### 7. `inspections` — Bilateral Custody & Condition Diffing
- Stores pre-use check-in baseline readings and post-use return metrics.
- Automatically calculates condition deltas ($\Delta \text{ConditionRating}$, $\Delta \text{Meters}$).
- If condition degrades (e.g. `GOOD` $\rightarrow$ `DAMAGED`), it automatically flags an anomaly and creates a linked incident ticket.

### 8. `incidents` — Incident Triage & Dispute Resolution
- Manages dispute tickets across categories (`PHYSICAL_DAMAGE`, `LATE_RETURN`, `EQUIPMENT_DAMAGE`, `SAFETY_VIOLATION`, `ENVIRONMENTAL_SPILL`).
- Supports operator defense statements, photographic evidence hashes, and manager adjudications (`USER_LIABLE`, `DISMISSED`, `PREEXISTING_FATIGUE`).

### 9. `audit` — Cryptographic SHA-256 Ledger
- Computes deterministic canonical JSON hashes over transaction metadata:
$$H_n = \text{SHA-256}(H_{n-1} \parallel \text{action} \parallel \text{actorId} \parallel \text{timestampIso} \parallel \text{payloadHash})$$
- Exposes `/api/v1/audit/verify-chain`, which recalculates every block's hash from Genesis to current tip, guaranteeing 100% data integrity.

---

## Database Engine & Transparent In-Memory Fallback

The database connection in [`src/database/connection.ts`](file:///d:/hackathon/backend/src/database/connection.ts) includes an automatic fallback mechanism:
1. Attempts to connect to the configured MongoDB URI (`MONGODB_URI`).
2. If `MONGODB_URI=inmemory` is set, or if an external MongoDB daemon is not running on port 27017, the system automatically launches an isolated **`MongoMemoryServer`** (MongoDB v7.0).
3. The server logs the connection and continues booting without crashing:
```
[Database] Initializing standalone MongoMemoryServer...
[Database] Connected to in-memory MongoDB at mongodb://127.0.0.1:55192/
```

---

## Faker-Powered Simulation Seeder

Running [`src/database/seed.ts`](file:///d:/hackathon/backend/src/database/seed.ts) uses `@faker-js/faker` with a deterministic seed (`2026`) to populate an authentic university ecosystem:
- **36 Academic Profiles**: 5 core fixed evaluation personas + 31 Faker academics across 8 departments.
- **6 Research Facilities**: Cleanroom Core, Electron Microscopy Center, Robotics Makerspace, Bio-Spectrometry Wing, Quantum Optics Center, Precision Heavy Machining.
- **28 Scientific Instruments**: DualBeam SEM/FIB, Aberration-Corrected TEM, 600 MHz NMR, Laser Lithography, ICP-Etcher, 5-Axis Haas CNC Mill, DMLS Metal 3D Printer, Q-TOF LC/MS, 14T Cryofree Superconducting Magnet, etc.
- **64 Bookings**: Spanning all 10 states (`DRAFT`, `PENDING_REVIEW`, `APPROVED`, `WAITLISTED`, `OFFERED`, `CHECKED_IN`, `RETURNED`, `COMPLETED`, `DISPUTED`, `RESOLVED`, `CANCELLED`, `REJECTED`, `NO_SHOW`).
- **35 Custody Inspection Records**: Paired pre-use and post-use dial readings, checklist verifications, and digital signatures.
- **6 Incidents & Adjudications**: Scratched quartz chucks, cleanroom particle spikes, late return overruns, and snapped CNC end mills.
- **89 Cryptographically Chained Blocks**: Verifiable via `/api/v1/audit/verify-chain`.

---

## Environment Configuration

Configuration in `backend/.env`:

```ini
PORT=5000
NODE_ENV=development
MONGODB_URI=inmemory
JWT_SECRET=super_secret_university_jwt_access_key_2026!
JWT_REFRESH_SECRET=super_secret_university_jwt_refresh_key_2026!
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d
CORS_ORIGIN=http://localhost:5173
SEED_ON_BOOT=true
```

---

## REST API Endpoints Specification

### Authentication
- `POST /api/v1/auth/register` — Register a new student or researcher
- `POST /api/v1/auth/login` — Sign in and receive dual access/refresh tokens
- `GET  /api/v1/auth/demo-tokens` — Fetch pre-issued tokens for all 5 demo personas
- `POST /api/v1/auth/refresh-token` — Rotate refresh token for a new access token
- `POST /api/v1/auth/logout` — Revoke token session
- `GET  /api/v1/auth/me` — Get authenticated user profile, quotas & certifications

### Facilities & Resources
- `GET  /api/v1/labs` — List laboratory facilities
- `GET  /api/v1/resources` — List scientific instruments (with category & status filters)
- `GET  /api/v1/resources/:id` — Retrieve instrument details, custom checklists & sensor meters
- `GET  /api/v1/resources/:id/eligibility` — Evaluate deterministic 7-gate safety eligibility

### Bookings & Scheduling
- `POST  /api/v1/bookings` — Create reservation request (with half-open interval conflict check)
- `GET   /api/v1/bookings` — List reservations for active user
- `GET   /api/v1/bookings/review-queue` — List pending requests in 48h manager SLA queue
- `PATCH /api/v1/bookings/:id/approve` — Approve reservation and generate 4-digit PIN
- `PATCH /api/v1/bookings/:id/reject` — Reject reservation with standardized reason code
- `PATCH /api/v1/bookings/:id/cancel` — Cancel reservation with reason
- `POST  /api/v1/bookings/:id/check-in` — Submit pre-flight custody inspection
- `POST  /api/v1/bookings/:id/return` — Submit post-use return & compute condition diff

### Fairness & Waitlist
- `GET  /api/v1/waitlist/my-waitlists` — List user waitlist entries with $F$-Score breakdowns
- `POST /api/v1/bookings/:id/accept-waitlist-offer` — Accept promoted waitlist slot within 2h window

### Incidents & Disputes
- `GET  /api/v1/incidents` — List active incident tickets
- `POST /api/v1/incidents/:id/dispute` — File operator dispute/defense statement
- `POST /api/v1/incidents/:id/adjudicate` — Manager ruling, penalty assignment & billing charge

### Audit Ledger
- `GET  /api/v1/audit/ledger` — Retrieve chronological audit log entries
- `GET  /api/v1/audit/verify-chain` — Verify SHA-256 cryptographic chain continuity
- `GET  /api/v1/audit/analytics/utilization` — Instrument utilization statistics
- `GET  /api/v1/audit/analytics/chargebacks` — Departmental grant billing chargebacks

---

## Running, Testing & Building

From the `backend/` directory:

```bash
# Start backend in development mode with live watch
npm run dev

# Compile TypeScript to dist/
npm run build

# Run production build
npm start

# Run database seeder
npm run seed

# Execute Vitest test suite
npm run test
```

