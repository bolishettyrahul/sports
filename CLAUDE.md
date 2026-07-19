# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

**CBIT Sports** — a sports-equipment checkout/return system for a college counter. Two role-specific frontends (Operator + Manager) talk to one shared backend. Core hard problems: **offline-first checkout with idempotent sync**, **real-time manager dashboard (SSE)**, and **precomputed student eligibility**.

**Current state: specs only.** `backend/`, `frontend/`, and `integration/` contain _only_ a `summary.md` task log each — no source, no `package.json`, no build/test tooling exists yet. There are no build, lint, or test commands to run until the stacks are scaffolded (per SPEC.md: Vite+React frontend, Express or FastAPI + PostgreSQL backend). When you scaffold, add the resulting commands here.

## Project Rules (follow on every task)

1. **Stay in your directory.** Claude Code writes and runs code **only under `/backend`**. Antigravity owns `/frontend`. Root + `/integration` are for shared contracts and E2E tests. Never edit another domain's files.
2. **`API_CONTRACTS.md` is the Single Source of Truth.** Match its payloads exactly. If a shape must change, edit `API_CONTRACTS.md` *first* and note it — never let frontend and backend diverge silently.
3. **Log every completed task in `summary.md` (mandatory — see next section).**
4. **Idempotency is non-negotiable.** Guard `transactions.client_tx_id` with a UNIQUE index; a repeated `client_tx_id` must be skipped, never re-applied.
5. **All stock mutations run inside a DB transaction** so bulk sync stays race-safe (no double-decrements).
6. **Frontend keeps the mock layer toggleable** (`USE_MOCKS`) so UI can be built and previewed before the backend is live.
7. **Styling uses design tokens only** — consume `var(--color-*)`, `var(--space-*)`, `var(--font-*)`; never hard-code hex/px/font values the tokens already carry.
8. **Branch per domain** (`feat/frontend-ui`, `feat/backend-api`, `feat/offline-sync`); merge to `main` only after tests pass locally.

## Summary logging rule (required for each completed task)

Whenever a task finishes, immediately update that domain's `summary.md` (`backend/summary.md`, `frontend/summary.md`, or `integration/summary.md`). Every completed task **must** carry both its timeline and a short note of what was done:

- In the task's row: set **Status → ✅ Done** and fill **Actual Date** with the real completion date (absolute, `YYYY-MM-DD`).
- Append a one-line entry to a **`## ✅ Completed Log`** section at the bottom of the same file, in this format:

  ```
  YYYY-MM-DD — [TASK-ID] short description of what was completed
  ```

  Example: `2026-07-19 — [BE-02] Wrote migrations for all 4 tables and seeded 200 students + sports inventory.`

Keep the note to one line — what shipped, not how. The timeline (target vs. actual) lives in the table; the "what" lives in the Completed Log.

## Source of truth documents

Read these before implementing anything; they are authoritative and detailed:

- **`API_CONTRACTS.md`** — SSOT for every request/response payload. Start here for any endpoint work.
- **`SPEC.md`** — DB schema (4 tables), tech stack, endpoint list, offline sync protocol.
- **`requirements.md`** — functional (FR-1…FR-12) and non-functional requirements.
- **`design.md`** + **`Wireframe design screens/`** — UI/UX spec, wireframes, and the design system.

## Architecture essentials (the non-obvious parts)

**Data model** (see SPEC.md §2): `students` (PK `roll_no`) · `equipment` (PK string id like `basketball`) · `variants` (FK → equipment) · `transactions` (PK UUID). `equipment.available_stock` and `variants.available_stock` are the mutable inventory counters that checkout/return move.

**Offline sync + idempotency** — the defining constraint of the system:
- Every checkout carries a client-generated `client_tx_id` (UUID v4). The `transactions.client_tx_id` column has a **UNIQUE index**.
- Offline, the frontend queues transactions in browser storage and does optimistic stock decrements. On reconnect it POSTs the batch to `/api/transactions/sync`.
- The backend must skip any `client_tx_id` it has already seen (returns `skipped_duplicate`) so retried batches never double-decrement stock. All stock mutations must run inside DB transactions to stay race-safe under bulk sync.

**Eligibility is computed server-side**, not stored. `GET /api/students/:roll_no` returns `eligible`, `active_checkouts`, and `eligible_sports`, derived from gender rules (`equipment.gender_rule`), per-student active-issue limits, and per-sport caps (`equipment.max_issue_cap`). A missing roll number returns `STUDENT_NOT_FOUND`, which triggers the frontend's progressive-enrollment flow.

**Real-time dashboard** — `GET /api/dashboard/live-stream` is an SSE endpoint emitting two event types: `activity` (on every issue/return) and `low_stock` (when a counter drops to/below `low_stock_threshold`). The manager UI listens to both.

**Reports** are expected to read from pre-aggregated daily summaries, not raw transaction scans (NFR-2).

## Workflow trees

Each domain's tasks run top-to-bottom; indentation shows what depends on what. Targets are the SPEC day numbers. Update status/dates in each `summary.md` as tasks land (see Summary logging rule).

### Frontend (`/frontend`)
```
FE-01  Shared System CSS — Vite+React shell, index.css tokens        [Day 3]
  └─ FE-02  Login Interface — operator/manager redirects             [Day 3]
       └─ FE-03  Mock Service Layer — maps API_CONTRACTS.md          [Day 3]
            ├─ FE-04  Operator Grid UI — cards, filters, variants    [Day 4]
            │    └─ FE-05  Scan & Enroll View — camera + enrollment  [Day 4]
            │         └─ FE-06  Local Queue / Service Worker         [Day 5]
            │              └─ FE-07  Network Sync hook — optimistic  [Day 5]
            └─ FE-08  Manager Layout — KPI panels, list views        [Day 6]
                 └─ FE-09  Live stream (SSE) client                  [Day 6]
                      ├─ FE-10  Reports & CSV export                 [Day 7]
                      └─ FE-11  Administrative Actions — relink/flag  [Day 7]
```

### Backend (`/backend`)
```
BE-01  Project Setup & DB config — framework, PG driver, routing     [Day 1]
  └─ BE-02  Migrations & Seeding — 4 tables + initial dataset        [Day 1]
       └─ BE-03  Auth Endpoints — login + JWT middleware             [Day 2]
            └─ BE-04  Student APIs — lookup + eligibility checker     [Day 2]
                 └─ BE-05  Inventory & Transactions — issue/return   [Day 2]
                      └─ BE-06  Integration Tests — stock-drop safety [Day 2]
                           └─ BE-07  Sync Endpoint — client_tx_id     [Day 5]
                                └─ BE-08  SSE Feed — activity/low_stock[Day 6]
                                     └─ BE-09  Restock & Admin API     [Day 7]
```

### Integration (`/integration` + root)
```
INT-01  API Agreement — lock payloads in API_CONTRACTS.md            [Day 1]
  └─ INT-02  Local Env Setup — Docker Compose / run scripts          [Day 3]
       └─ INT-03  Interface Linking — switch mocks → live API        [Day 5]
            ├─ INT-04  Offline-Online E2E — kill/restore backend     [Day 5]
            └─ INT-05  Real-time SSE Test — <1s dashboard update     [Day 6]
                 └─ INT-06  End-to-End Test Suite — Cypress/Playwright[Day 7]
                      └─ INT-07  Performance & Audit — sizes, DB speed[Day 7]
```

## Design system

Frontend styling derives from the **Modernist** design system in `Wireframe design screens/_ds/modernist-*/`. Link its `styles.css` and consume tokens only (see Project Rule 7). It is flat, flush-left, zero-radius, Archivo type, single red accent, Lucide icons. `design.md` layers the project-specific palette (Maroon `#6E1423`, Charcoal, Gold), two-font system (Archivo for text, JetBrains Mono for data/counts/roll numbers), and role-specific densities (Operator = 48px touch targets, tablet; Manager = 24px dense, desktop).
