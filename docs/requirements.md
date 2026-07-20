# Requirements — College Sports Equipment Issuance & Tracking System

## 1. Overview

A system to replace manual, memory-dependent sports equipment issuance at a college with a barcode-scan-driven flow. The system enforces eligibility rules (gender-based, sport-based), tracks stock in real time, and gives admin staff daily/weekly/monthly visibility into usage — without requiring the counter operator to memorize any rules.

## 2. Goals

- Eliminate rule-memorization burden on non-technical counter staff — the UI only ever shows valid choices.
- Prevent equipment overselling/oversubscription through atomic stock operations.
- Function without dedicated scanning hardware — admin's own phone/tablet is sufficient.
- Remain usable through network drops during outdoor sports periods.
- Build student master data organically, without depending on the college's IT department to hand over a roster before launch.
- Give management-level staff (not just counter staff) visibility into usage trends and low-stock conditions.

## 3. Non-Goals (Out of Scope)

- **Payment/chargeable issuance.** All issuance is free. No pricing, invoicing, or payment integration.
- **Bulk student data import as a launch dependency.** The prototype does not wait on or require an official college roster.
- **Dedicated scanning hardware.** No barcode guns, no kiosks, no new physical infrastructure.
- **Multi-campus / multi-institution support.** Single college, single deployment.

## 4. User Roles

| Role | Responsibilities | Access |
|---|---|---|
| **Counter Operator** | Scan ID, select sport/item, confirm issue or return, select reason-for-free | Issue/return actions only — no equipment editing, no cross-counter reports |
| **Manager / Admin** | Add/edit equipment types and stock, view daily/weekly/monthly reports across all counters, resolve flagged discrepancies (lost items, low stock) | Full read access to all transactions and analytics; write access to equipment master data |

## 5. Functional Requirements

### 5.1 Identification
- FR-1: System scans a student ID card's barcode using the admin's device camera (browser-based, no dedicated scanner).
- FR-2: A recognized barcode resolves to student details (name, roll no, gender, branch, year) automatically — no manual re-entry per scan.
- FR-3: An unrecognized barcode triggers a one-time capture form (name, roll no, gender, branch, year). The barcode-to-student link is written server-side, so it is a **one-time event per student, not per device or per counter** — every subsequent scan of that card, from any counter, resolves instantly with no form (see §5.9, Progressive Enrollment).
- FR-4: Manual roll-number lookup is available as a fallback when scanning fails or the card is damaged/unreadable.
- FR-5: A "relink card" action lets an operator/manager map a corrected roll number to an existing student record. **Scope narrowed (confirmed):** since the barcode decodes directly to the student's roll number (see Constraints §7), a simple physical card replacement re-encodes the same roll number and resolves automatically with no action needed. This action is only needed for the rarer case where the college itself reissues a student under a changed roll number.
- FR-6: Before a capture is saved, the system checks that the scanned barcode value isn't already linked to a different existing student record — prevents an ambiguous/misread scan from silently overwriting the wrong student's link.
- FR-7: A Manager can correct a data-entry mistake made during capture (e.g., mistyped roll number) directly on the existing record. This is distinct from FR-5 — it corrects a typo on the original card's data, not a card replacement.

### 5.2 Issuance
- FR-8: After identification, the system shows only equipment eligible for that student's sport and gender — ineligible items are never presented as selectable options.
- FR-9: Stock availability is checked and enforced at the moment of issuance; an item with zero stock cannot be issued.
- FR-10: Every issuance records: student, item, quantity, issuing location/counter, timestamp, and reason-for-free.
- FR-11: A daily per-student, per-sport cap prevents a single student from repeatedly draining stock of one item in one day (exact cap configurable per sport).

### 5.3 Returns
- FR-12: Equipment can be returned and restored to available stock.
- FR-13: A return that cannot be matched to a specific issued unit (e.g., unclear which cricket bat came back) does not block the flow — it is flagged for manual reconciliation rather than silently dropped or silently accepted as a clean match.
- FR-14: Items reported lost or damaged are marked as such and removed from available stock, distinct from a normal return.

### 5.4 Reason for Free Issue
- FR-15: Every issuance requires selecting exactly one reason from a fixed list — no free-text entry:
  - Free Hour
  - Fit Hour
  - Lunch Hour
  - After College (post–4 PM)
  - Practice Session

### 5.5 Sport-Specific Rules

| Sport | Item(s) | Tracking mode | Rule notes |
|---|---|---|---|
| Badminton | Racket | **Serialized (confirmed)** | **Girls only** |
| Badminton | Shuttle | Count | Issued to all genders |
| Basketball | Ball — **two size variants: size 6, size 7** | Count, tracked as **two separate stock pools** (one per size) | Size selected at issuance, **open to all students regardless of gender (confirmed)** |
| Carrom | Board (numbered 1–15), coins, striker | **Serialized** (board), bundled accessories | 15 physical boards to track individually |
| Cricket | Ball / Bat / Kit | Serialized (bat, kit) + count (ball) | **Confirmed:** KG-1, BG-3, KP-1, BH-3 represent kit **sub-component quantities** (e.g., helmet, gloves, pads) bundled within the Kit item — not a location split as previously assumed. Exact code-to-component mapping to be finalized during equipment setup |
| Volleyball (VB) | Balls | Count | **Confirmed:** standard count-based tracking, same as other fungible items — no special selection step needed. "3-1-2" in the original notes illustrated the decrement mechanic (3 total, 1 issued, 2 remaining), not a distinct selectable option |
| Throwball (TB) | Balls | Count | — |
| Football (FB) | Ball, Shin guards | Count, **two separate stock pools** | Issuable independently or together in the same issuance — not mutually exclusive |
| Chess | Coin/piece sets | **Count (confirmed)** | Tracked as number of complete sets. Initial stock is a **placeholder default (e.g., 8–10 sets)** pending an actual inventory count from the Manager |
| Table Tennis (TT) | Bat, Ball | Count, tracked as **two separate stock pools** | Operator selects bat only, ball only, or both together in one issuance |

### 5.5.1 Selection & Variant Behavior

These sports require an additional selection step beyond "pick sport → pick item," since more than one valid item/size combination exists:

- FR-25: Basketball issuance requires selecting a ball size (6 or 7) before confirming — each size is tracked and decremented as an independent stock pool. Open to all students regardless of gender (confirmed).
- FR-26: **Removed.** Originally proposed for Volleyball based on an ambiguous note; clarified that volleyball uses standard count-based tracking with no special selection step required — see §5.5 Volleyball row.
- FR-27: Table Tennis issuance allows the operator to select bat only, ball only, or both in a single issuance action — each component still decrements its own stock pool.
- FR-28: Football issuance allows the operator to select ball only, shin guards only, or both in a single issuance action — each component still decrements its own stock pool.
- FR-29: Chess set stock starts from a Manager-configurable placeholder count (not a hardcoded value) so it can be corrected once the real inventory is confirmed, without requiring a code or schema change.

### 5.6 Equipment Management
- FR-16: Manager can add new equipment types, edit gender restrictions, edit per-location stock, and retire discontinued items.
- FR-17: Manager can add/remove issue counters (locations) if the deployment is multi-counter.

### 5.7 Reporting
- FR-18: Daily summary: total unique students served, per-sport issue counts, per-reason breakdown.
- FR-19: Weekly and monthly rollups derived from daily summaries (not recomputed from raw transaction history each time).
- FR-20: Reports are viewable by Manager role across all counters/locations.

### 5.8 Low Stock Alerts
- FR-21: When any item's stock crosses a configured low-stock threshold, an alert is raised immediately at the moment of the triggering transaction — not on a delayed batch schedule.
- FR-22: Alerts are visible to the Manager role, ideally in real time.

### 5.9 Progressive Student Enrollment
- FR-23: The system does not require a pre-loaded student roster to function. Student records are created on first scan (see FR-3), and the barcode-to-student link is a one-time, server-side event — not repeated per device or per counter (see FR-6, FR-7 for the integrity checks around this).
- FR-24: If the college later provides an official roster, it can be bulk-imported without overwriting or duplicating already-enrolled students (matched by roll number).

## 6. Non-Functional Requirements

### 6.1 Availability / Offline Behavior
- NFR-1: The system must remain usable for issuing equipment during temporary network loss (outdoor WiFi drops).
- NFR-2: Pending actions taken offline must sync automatically on reconnect without creating duplicate transactions.
- NFR-3: When local stock data may be stale (item near zero), the system must not trust the cached value blindly — it should force a live check before allowing issuance of low-stock items.

### 6.2 Concurrency & Data Integrity
- NFR-4: Two simultaneous issuance attempts for the same item must not both succeed if only one unit remains — stock decrement must be atomic.
- NFR-5: No student data or transaction record may be lost due to a network interruption.

### 6.3 Performance
- NFR-6: A single scan-to-confirm cycle should complete in roughly 10 seconds under normal network conditions.
- NFR-7: Report queries must not degrade materially as transaction history grows across semesters.

### 6.4 Scalability
- NFR-8: The system must support multiple simultaneous issue counters/locations if the deployment expands beyond a single point.
- NFR-9: The system must handle rush-period concurrency (multiple students at one counter, multiple counters active) without data races.

### 6.5 Security & Access Control
- NFR-10: Counter Operator and Manager roles must have distinct, enforced permission levels — an operator cannot edit equipment master data or view cross-counter reports.
- NFR-11: Admin login should be low-friction (e.g., PIN-based) given non-technical users, while still gating destructive/administrative actions.

### 6.6 Usability
- NFR-12: The counter operator interface must never present an ineligible option (wrong gender, out-of-stock item) — correctness is enforced by what's shown, not by operator judgment.
- NFR-13: No step in the issuance flow should require free-text typing under normal operation (reason-for-free, sport, item are all selection-based).

## 7. Constraints & Assumptions

- All issuance is free; no payment/chargeable path exists in this system.
- Admin devices are phones/tablets with a working camera and browser — no dedicated scanning hardware will be procured.
- The college's official student data may never arrive, or may arrive late — the system must be fully functional without it.
- ID cards carry a **linear barcode** (confirmed from physical card sample: Code 128/39-style, format `NN-NNN-NNN`), not a QR code as originally assumed. The scanning implementation must support linear barcode formats, not only QR.
- **Confirmed:** the barcode decodes directly to the student's text-based roll number — there is no separate college-internal card-serial requiring a translation step. The decoded value can be matched directly against the roll number field.
- **Confirmed:** deployment is a single issue counter at launch. Multi-counter/location support remains part of the architecture for future expansion (see NFR-8, FR-17) but is not exercised in the prototype.

## 8. Resolved Decisions Log

All six items previously listed as Open Questions are now resolved. Kept here for traceability rather than deleted, since these decisions shaped several requirements above.

| # | Original question | Resolution |
|---|---|---|
| 1 | Does the barcode value equal roll number, or a separate internal ID? | **Resolved:** barcode decodes directly to the text-based roll number. No translation/mapping step needed (see §7, FR-5 narrowed scope). |
| 2 | What do KG-1, BG-3, KP-1, BH-3 next to Cricket represent? | **Resolved:** kit sub-component quantities (e.g., helmet, gloves, pads) bundled within the Kit item — not a location split. Exact letter-to-component mapping to be finalized at equipment setup time, not an architectural question. |
| 3 | What does "VB – Balls – 3-1-2" specify? | **Resolved:** illustrative of the standard decrement mechanic (3 total, 1 issued, 2 remaining). Volleyball needs no special selection step — see FR-26 removal. |
| 4 | Is badminton racket tracking count-based or serialized? | **Resolved:** serialized (individual rackets tracked as units). |
| 5 | Single issue counter or multiple simultaneous counters at launch? | **Resolved:** single counter at launch; multi-counter support remains available in the architecture for later expansion. |
| 6 | Can boys select either basketball size, or is one size restricted? | **Resolved:** open to all students regardless of gender. |

No open questions remain as of this revision.

## 9. Acceptance Criteria (Prototype Phase)

- [ ] Scanning a known barcode resolves to student details in under 2 seconds on a stable connection.
- [ ] Scanning an unknown barcode opens the capture form; after saving, that same barcode resolves instantly on every subsequent scan with no form shown again.
- [ ] A student captured at one counter/device resolves instantly when scanned from a different counter/device — confirming the link is server-side, not local to the capturing device.
- [ ] Attempting to capture a barcode already linked to a different student is blocked/flagged rather than silently overwriting the existing link.
- [ ] A Manager can correct a mistyped field from an earlier capture without triggering a new capture flow or creating a duplicate record.
- [ ] A physical card replacement for an existing student (same roll number, re-encoded) resolves automatically on scan, with no relink action required.
- [ ] A badminton racket return matches to a specific serialized unit, not just a generic stock count.
- [ ] An ineligible item (wrong gender for that sport) never appears as a selectable option.
- [ ] Basketball issuance requires a size selection (6 or 7) and decrements only the chosen size's stock pool, leaving the other size's stock unaffected.
- [ ] Table Tennis issuance supports bat-only, ball-only, and both-together as three distinct valid selections in one action.
- [ ] Football issuance supports ball-only, shin-guards-only, and both-together as three distinct valid selections in one action.
- [ ] Chess set stock reflects a Manager-editable count (not a fixed/hardcoded value), confirmed by changing it from its placeholder default and seeing the change take effect immediately.
- [ ] Two rapid, near-simultaneous issue attempts for the last unit of an item result in exactly one success and one rejection.
- [ ] An issuance recorded while offline appears correctly in the transaction log after reconnect, exactly once.
- [ ] Daily summary correctly shows unique student count and per-sport breakdown for a test day of transactions.
- [ ] A configured low-stock threshold triggers a visible alert immediately upon the crossing transaction.
- [ ] Counter Operator login cannot access equipment-editing or cross-counter reporting screens.