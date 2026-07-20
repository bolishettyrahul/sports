# System Design Specification — College Sports Equipment Issuance & Tracking System

Companion to `requirements.md`. This document describes how the system is architected to meet those requirements — layers, data flow, and key design decisions. Conceptual only: no schema DDL or code, per system-designer scope.

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│  Interface Layer                                     │
│  Counter Operator PWA  |  Manager Dashboard           │
├─────────────────────────────────────────────────────┤
│  Identification Layer                                │
│  Barcode scan  →  student resolve  →  progressive     │
│  enrollment (unknown barcode path)                    │
├─────────────────────────────────────────────────────┤
│  Rules / Application Layer                            │
│  Eligibility filtering (gender × sport)  |  stock      │
│  checks  |  daily-cap checks  |  low-stock triggers    │
├─────────────────────────────────────────────────────┤
│  Offline / Sync Layer                                 │
│  Local write-ahead queue  |  idempotent sync           │
├─────────────────────────────────────────────────────┤
│  Data / Storage Layer                                 │
│  Postgres (Supabase) — atomic transactions, RLS,      │
│  scheduled rollups                                     │
├─────────────────────────────────────────────────────┤
│  Reporting / Analytics Layer                           │
│  Nightly rollups → daily/weekly/monthly views          │
└─────────────────────────────────────────────────────┘
```

## 2. Layer-by-Layer Design

### 2.1 Identification / Scan Layer

- Browser-based camera scan on the admin's own device (PWA) — no dedicated scanner hardware.
- Card sample confirms a **linear barcode** (Code 128/39-style), not QR — decoder must support both formats for resilience, since a future card redesign could change format.
- Decode via native `BarcodeDetector` API where supported (Chrome/Edge/Android WebView), falling back to a JS library (`html5-qrcode`/ZXing) for browsers without native support — same camera pipeline, no separate code path for the operator.
- Decoded value is looked up against the student master. **Confirmed:** the decode output equals the student's roll number directly — no separate translation table is needed, simplifying this to a single indexed lookup. Two outcomes: **known** → resolve instantly; **unknown** → hand off to Progressive Enrollment (§2.2).
- Manual roll-number search is always available as a fallback (damaged card, camera failure, poor lighting).

### 2.2 Progressive Student Enrollment

Purpose: remove the dependency on the college handing over an official roster before launch.

**Key property: the capture is a one-time event per student, written server-side — not a per-device or per-counter event.** **Confirmed:** the barcode decodes directly to the student's text-based roll number — there's no separate opaque card-ID requiring translation. This simplifies the lookup key to just the roll number itself, and it also means a simple physical card replacement (lost/damaged card, reprinted with the same roll number) resolves automatically on the next scan, with no relink action needed — the reprinted card just re-encodes the same roll number. The student master link lives in the shared database, not on the capturing operator's device, so the *second* time any card with that roll number is scanned — at the same counter or a different one — it's a pure lookup: barcode in, student record out, identical to a pre-loaded roster. There is exactly one capture per student, ever (barring the rarer case below).

| Trigger | Behavior |
|---|---|
| Roll number not found in student master | One-time capture form: name, roll no, gender, branch, year — filled directly off the same card the operator is holding, ~15 seconds. Written to the shared student master, not local device storage. |
| Card with a known roll number scanned again (any counter, any device, including a reprinted/replacement card) | Instant lookup — no form, no relink action. This is the normal-case path for every scan after the first, and covers routine card loss/replacement automatically. |
| Capture would link a roll number already assigned to a different student | Blocked/flagged rather than silently overwritten — protects against a misread/ambiguous scan corrupting an existing student's link. |
| Typo in a previously captured field (e.g., roll number entered wrong during the original 15-second capture) | Manager corrects the existing record directly. Distinct from the row below — same physical card, bad data entry. |
| College itself reissues a student under a **changed** roll number (rare — not a routine card replacement) | "Relink card" action — Manager searches the existing student by old roll number and updates the record to the new one, instead of creating a duplicate. |
| College later provides an official roster | Bulk import matches by roll number; existing progressively-enrolled records are updated, not duplicated. |

This makes onboarding self-building rather than a one-time bulk load — first week has more capture-form hits, converging toward near-zero new captures as the active student population gets covered, since each student only ever passes through capture once.

### 2.3 Rules / Application Layer

- Eligibility (which items a student can even see) is evaluated from **data**, not conditional code paths — a gender restriction or sport-item mapping is a configuration value the Manager can edit, not a hardcoded rule. This is what guarantees the operator screen can never present an invalid option: the query that populates the item list already excludes anything the student isn't eligible for.
- **Variant selection** (basketball ball size 6/7, volleyball's still-unconfirmed quantity option) is handled the same way — each variant is its own trackable stock pool under a shared sport/item label, so selecting a variant is just selecting which pool the transaction draws from, not a special case in code.
- **Bundled issuance** (Table Tennis bat/ball/both, Football ball/shin-guards/both) is a single operator action that can produce more than one stock decrement — one per selected component. Each component still atomically checks and decrements its own pool independently; if one component in a bundle is out of stock, that component is blocked while the rest of the bundle can still proceed (e.g., shin guards issued even if the football is out).
- Daily per-student, per-sport cap is checked at issuance time to prevent one student draining stock.
- Stock check and daily-cap check both happen inside the same atomic operation as the issuance write (see §5) — not as a separate pre-check that a race condition could invalidate between check and write.

### 2.4 Data / Storage Layer — Platform Decision

**Chosen: Postgres via Supabase.**

| Requirement | Why Postgres/Supabase fits |
|---|---|
| Atomic stock decrement (no overselling) | Native row-level transactions — a conditional update either succeeds or fails as one unit, no read-then-write race |
| Relational structure (students ↔ transactions ↔ equipment ↔ locations) | Natural fit for a relational engine; a document store fights this shape |
| Role-based access (Operator vs Manager) | Row Level Security available on Supabase, including free tier |
| Real-time low-stock alerts and dashboard updates | Supabase Realtime channels — well within free-tier concurrent connection limits for this scale |
| Scheduled nightly rollups for reporting | `pg_cron` support for precomputing daily summaries |

**Free tier fit — assessed against actual expected load (not generic limits):**

| Dimension | Expected load | Free tier cap | Verdict |
|---|---|---|---|
| Database size | ~125K small transaction rows/year | 500 MB | Years of headroom |
| Concurrent connections | Single-digit (few counters + 1–2 managers) | 200 realtime connections | Ample |
| Monthly active users | Only admin logins count (students aren't authenticated) | 50,000 | Irrelevant ceiling for this use case |
| Egress | Small JSON payloads, no media | 5 GB/month | Ample |

**One real risk:** free-tier projects auto-pause after 7 days with no database activity. College breaks (summer, winter) exceed this — the project would be dead on the first day back until manually resumed. **Mitigation:** a scheduled keep-alive ping (cron job or uptime monitor) hitting the database weekly during break periods — eliminates the failure mode entirely, costs nothing. Revisit paid tier once this moves from pilot to system-of-record (adds backups, removes pause risk).

### 2.5 Offline / Sync Layer

Sports periods happen outdoors on weak college WiFi — network loss during active use is an expected condition, not an edge case.

- Every issuance/return action writes first to a **local write-ahead queue** on the operator's device (IndexedDB), tagged with a unique idempotency key, before attempting to reach the server.
- **Online:** sync immediately; server performs the atomic stock operation; queue entry marked synced.
- **Offline:** entry stays `pending`; UI shows "issued (syncing...)" so the operator isn't blocked mid-rush.
- **Reconnect:** queue flushes in order; the idempotency key means a retried write can't double-count even if an earlier attempt actually succeeded but the acknowledgment was lost.
- **Asymmetric trust for reads:** cached stock counts are trusted for routine issuance, but once an item's cached stock is near the low-stock threshold, the system forces a live check before allowing the issue — a stale "2 left" shown from a minute-old cache is exactly how overselling happens during a dead zone.

### 2.6 Reporting / Analytics Layer

- Reports are **not** computed live off the full raw transaction history — that query gets slower every semester as the table grows.
- A nightly scheduled job rolls up the previous day's transactions into precomputed daily summary records: unique student count, per-sport issue counts, per-reason breakdown.
- Weekly/monthly views sum a handful of daily summary rows instead of scanning raw history — flat query cost regardless of how many years of data accumulate.

### 2.7 Low-Stock Alerting

- Event-driven, not batch. The moment a stock decrement crosses the configured threshold, the alert fires as part of that same transaction — not on a delayed nightly scan.
- Pushed to the Manager dashboard via a real-time channel, so restocking can happen same-day rather than being discovered the next morning after items already ran out.

### 2.8 Admin / Role-Based Access Layer

| Role | Can do | Cannot do |
|---|---|---|
| Counter Operator | Scan, issue, return, select reason-for-free | Edit equipment/stock, view cross-counter reports, view analytics |
| Manager / Admin | Everything above, plus: add/edit equipment types, edit gender/stock rules, view daily/weekly/monthly reports across all counters, resolve flagged/lost items | — |

Splitting these isn't extra scope — it's what keeps the Operator screen minimal enough to stay usable by a non-technical user. A single flat login that does everything either clutters the operator's screen with controls he'll never touch, or can't distinguish "can issue" from "can edit inventory master," which is the actual error boundary that matters.

## 3. Conceptual Data Entities

Not a schema — describes what information each part of the system needs to track, for reference when the actual data layer is built.

- **Student**: roll number (also serves as the decoded barcode lookup key — confirmed no separate barcode-ID field is needed), name, gender, branch, year.
- **Equipment Type**: sport, item name, **variant label (if applicable — e.g., "size 6" / "size 7" for basketball)**, tracking mode (count vs. serialized), gender restriction (if any), max quantity per issue. Each distinct variant is its own stock pool even when grouped under one sport/item in the UI.
- **Equipment Unit** *(serialized items only — e.g., carrom boards, cricket bats/kits, badminton rackets)*: individual unit identifier, current status (available/issued/lost/damaged), current location.
- **Inventory Count** *(fungible items — e.g., shuttles, balls, chess sets, cricket kit sub-components)*: quantity on hand per location per variant. Chess set count starts from a Manager-editable placeholder value pending a confirmed physical count. The Cricket Kit is a bundle of separately-tracked sub-components (e.g., helmet, gloves, pads) rather than one opaque unit — modeled the same way as other bundled items (§2.3).
- **Transaction**: student, item (equipment type + variant), quantity, action (issue/return), reason-for-free, location/counter, timestamp, operator, **bundle/issuance-group identifier** (links multiple transaction rows created from one operator action, e.g., a TT bat + ball issued together, so each component's stock still decrements independently while the operator sees it as one action).
- **Location** *(if multi-counter)*: counter/site identifier — needed only if the deployment runs more than one simultaneous issue point (see Open Question #5 in requirements.md).

## 4. Concurrency & Atomicity Design

The failure mode to design against: two operators (or two rapid scans) both attempting to issue the last unit of an item at the same moment.

- Stock adjustments (count-based decrement, or serialized unit status change) must be conditional atomic operations — "decrement only if current stock > 0," not "read current stock, then separately write new stock." The gap between read and write is exactly where the race lives.
- The stock operation and the transaction log write happen together as one unit — if the stock adjustment fails (nothing left), no transaction is recorded, and the operator sees an immediate "out of stock" response rather than a silent partial success.

## 5. Fallback Chains

| Failure point | Fallback |
|---|---|
| Barcode scan fails (damage, lighting, unsupported format) | Manual roll-number search |
| Barcode unrecognized | Progressive enrollment capture form |
| Barcode already linked to a different student (misread/duplicate) | Capture blocked/flagged, not silently overwritten |
| Capture had a data-entry typo | Manager corrects the existing record directly — no re-capture, no duplicate |
| Network drops mid-transaction | Local queue holds the write, syncs on reconnect via idempotency key |
| Cached stock may be stale near zero | Forced live check before allowing issue |
| Return can't be matched to a specific unit | Flagged for manual reconciliation, item marked lost/damaged; flow is not blocked |
| Free-tier project paused after a break | Scheduled keep-alive ping prevents the pause from occurring |

## 6. Scalability Considerations

This is a concurrency-at-the-edge problem, not an internet-scale one — the real scaling axis is number of simultaneous issue counters and rush-period concurrency, not total data volume. Postgres's transactional model handles the concurrency case natively. The open question that actually affects scale (single-counter vs. multi-counter deployment) should be resolved before build, since designing for multi-counter costs nothing extra now but retrofitting it later is a rebuild.

## 7. Hardware Requirements

- **Required:** one phone or tablet per active issue counter, with a working camera and modern browser. Tablet preferred over phone at sustained rush-hour volume — two-handed phone scanning while tapping confirm is where drops happen.
- **Not required:** dedicated barcode scanner guns, kiosks, printers, or any new physical infrastructure. ID cards already carry a barcode; no reprinting needed.

## 8. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Free-tier project pause during college breaks | Scheduled keep-alive ping (weekly during known break periods) |
| No backups/SLA on free tier | Acceptable for pilot; budget for paid tier once this becomes system-of-record |
| Ambiguous per-location cricket stock split (KG/BG/KP/BH) | Resolve before build — determines whether multi-location inventory splitting is in scope |
| Barcode value identity unconfirmed (roll no. vs. internal serial) | Resolve before build — affects enrollment matching and any future roster import |
| Cold-start week (many unknown-barcode captures) read as a system flaw during a demo | Communicate the enrollment curve upfront to anyone observing early usage |

## 9. Phased Rollout

| Priority | Item |
|---|---|
| **P0** | Resolve single- vs. multi-counter deployment scope |
| **P0** | Set up free-tier keep-alive ping before first break period |
| **P0** | Build Counter Operator / Manager role separation from day one |
| **P0** | Build unknown-barcode → capture-form path before the known-barcode → issue path (this is what makes the system usable without any external data handoff) |
| **P1** | Nightly rollup job for reporting |
| **P1** | Event-driven low-stock alerting wired into the stock-decrement path |
| **P2** | Evaluate paid-tier upgrade timing once past pilot phase |