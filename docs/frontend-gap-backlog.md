# Frontend Gap Backlog

Gaps found during the 2026-07-20 design-system / responsiveness / accessibility
audit that were **deliberately left unfixed**, because they are contract or
behaviour work rather than presentation work. Each names the requirement it
misses and where the code sits today.

Ordered by severity.

---

## 1. Returns do not exist in the Operator UI — **blocking**

**Misses:** FR-12, FR-13, FR-14, and the `requirements.md` §4 role table
("Counter Operator … confirm issue **or return**").

`OperatorView.jsx` implements issuance only. Returns already exist elsewhere in
the system — the mock seeds `returned_at`, the Manager's "Returns today" KPI
counts them, and the activity feed renders `action: "returned"` — but there is
no operator-facing path to create one. This is half the operator's job.

Also missing with it: FR-14 (lost/damaged marked distinctly and removed from
available stock) and FR-13 (an unmatchable return must be flagged for
reconciliation, not silently dropped or silently accepted).

The Manager's "Process unresolved return" button is now explicitly `disabled`
with a note pointing here, rather than firing an `alert()` stub that implied a
working feature.

**Needs:** a return endpoint in `API_CONTRACTS.md` first, then the UI.

---

## 2. Multi-component issuance is impossible — **blocks two acceptance criteria**

**Misses:** FR-27 (Table Tennis: bat only, ball only, **or both**) and FR-28
(Football: ball, shin guards, **or both**) — each in a single issuance action.

The variant selector is a single-select radio group
(`OperatorView.jsx`, `.segmented-control` with `input type="radio"`). Choosing
"both" cannot be expressed. Two `requirements.md` §9 acceptance criteria
therefore cannot pass as built.

**Needs:** a decision on whether "both" is one transaction with multiple
variant lines or several transactions sharing a `client_tx_id` prefix — that is
an `API_CONTRACTS.md` question, which is why it was not fixed here. Then the
control becomes a multi-select for equipment flagged as combinable.

---

## 3. Business rules hardcoded in the UI

**Misses:** FR-11 (cap configurable per sport), FR-17 / NFR-8 (multi-counter).

- The two-item checkout limit was hardcoded in `OperatorView.jsx` and used to
  render a fabricated "max N items remaining". The audit removed the fabricated
  number — the badge now shows only `active_checkouts`, which is real API data —
  but the *authoritative* remaining-allowance still is not returned by
  `GET /api/students/:roll_no`. The mock also hardcodes `maxAllowedCheckouts = 2`
  in `services/api.js`.
- `"Counter 1"` is a literal fallback in both views. Single-counter launch is
  confirmed (§7), so this is not urgent, but it hardcodes an assumption the
  architecture explicitly keeps open.

**Needs:** eligibility response to carry the remaining allowance and the counter
identity.

---

## 4. Camera scanning is a stub

**Misses:** FR-1, FR-2, and `requirements.md` §7 (linear Code 128/39 barcode,
format `NN-NNN-NNN`, decoding directly to the roll number).

`simulateBarcodeScan` picks at random from a hardcoded array of four roll
numbers. There is no `getUserMedia` call and no barcode library anywhere in the
project. The scan viewport is a CSS animation.

Acceptable while `USE_MOCKS` is the operating mode, but nothing in the current
code moves toward FR-1, and the acceptance criterion "scanning a known barcode
resolves in under 2 seconds" has nothing to run against.

---

## 5. NFR-3 not implemented — stale stock trusted blindly

Offline issuance applies an optimistic decrement unconditionally. NFR-3 requires
that when local stock data may be stale and an item is near zero, the system
**forces a live check before allowing issuance**. There is no such guard, and no
low-stock threshold check on the offline path.

Related: sync failures are only `console.error`'d. `syncOfflineQueue` has no
retry, no backoff, and no user-visible failure state — an operator cannot tell
that a queued batch failed to sync.

---

## 6. Sport tag icons missing

**Misses:** `design.md` §6, which calls the sport tag chip "the single
consistent visual device the product is built around" and specifies one fixed
**icon** plus one fixed colour per sport.

Only the colour half shipped. The audit fixed the colours — they were being
keyed off equipment ids (`cricket_kit`) that never matched the CSS classes
(`.cricket`), so three of six chips rendered uncoloured — and darkened the two
that failed contrast. The icons remain unbuilt, and §12 open item 3 (custom
marks for cricket bat, volleyball, chess piece, carrom striker) is unresolved.

---

## 7. Loading states are text swaps, not skeletons

**Misses:** `design.md` §8 — "Skeleton placeholder, **not a spinner** over real
content — avoids a flash of stale data."

All loading states are text substitutions ("Loading catalog inventory…",
"Verifying student details…"). Low severity, but it is a stated rule and the
catalog grid is the obvious place it would matter.

---

## 8. Reason-for-free copy drift

`requirements.md` FR-15 fixes the list as *Free Hour, Fit Hour, Lunch Hour,
**After College (post–4 PM)**, **Practice Session***. The UI and the mock seed
data both use `"After College"` and `"Practice"`.

Left alone deliberately: these strings are the `checkout_reason` **payload
value**, so changing them is an `API_CONTRACTS.md` change, not a copy change.
Decide whether the payload uses a stable enum with separate display labels —
which is the better shape — and fix both ends together.

---

## 9. Report data is fabricated

`generateReports()` returns a hardcoded array multiplied by a per-period
constant. The CSV export then writes those invented numbers to a file named
`CBIT_Sports_Report_<period>_<real date>.csv`, which reads as genuine.

Not a design defect, but worth flagging before anyone shows it to staff. NFR-2 /
FR-19 require rollups derived from stored daily summaries.
