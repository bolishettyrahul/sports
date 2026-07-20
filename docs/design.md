# Design Specification — CBIT Sports Equipment Issuance & Tracking System

Companion to `requirements.md` and `spec.md`. This document defines the visual language: color, type, spacing, iconography, card/component styling, logo usage, and accessibility rules — so the interface is built consistently regardless of who implements it.

## 1. Design Principles

This is an **operational tool, not a marketing surface** — a non-technical counter operator uses it under time pressure, often outdoors, on a tablet. Every choice below is made for that reality first, "professional clean" second, and visual flair a distant third.

- **Clarity over decoration.** Nothing on the operator screen should require interpretation. If a choice doesn't help someone scan, tap, and confirm faster, it doesn't belong.
- **One consistent visual anchor, not many.** Rather than decorative flourishes, the product carries a single distinctive device — color-coded sport tags (§6) — applied everywhere, so a manager scanning a dense report or an operator scanning a rushed queue can visually parse the screen without reading every word.
- **Institutional, not corporate-generic.** The interface should read as belonging to CBIT specifically — not a template that could be re-skinned for any college. Institutional identity (§2) is load-bearing, not an afterthought logo slapped on a generic layout.
- **Restraint is the deliberate choice here**, not a lack of design effort — a single well-executed type family and a disciplined color system will outperform a "creative" pairing for an audience that needs speed, not personality.

## 2. Institutional Identity

- **College name:** Chaitanya Bharathi Institute of Technology (CBIT), Hyderabad.
- **Primary identity color (institutional maroon):** used as the brand anchor — header bar, primary action buttons, logo backing accents. Applied sparingly; it is not a background color for large surfaces.
- **Secondary identity accent (muted gold):** used only for thin dividers, underlines, and small highlight details — never as a fill color, to avoid competing with the semantic stock-status colors in §3.

> **⚠ Flag — needs confirmation:** I don't have CBIT's actual logo file or verified official brand hex values. The maroon/gold pairing below is a professional placeholder in the same family many Indian engineering institutes use institutionally — **not** a confirmed match to CBIT's real mark. Before this ships anywhere a student or faculty member sees it, pull the exact hex values from CBIT's official letterhead, website header, or a vector logo file and swap them in. Everything else in this document (spacing, type scale, component rules, accessibility) is independent of the exact hex and doesn't need to change.

| Token | Placeholder hex | Usage | Confirm before ship? |
|---|---|---|---|
| `institutional-maroon` | `#6E1423` | Header bar, primary buttons, logo backing | **Yes** |
| `institutional-gold` | `#C89B3C` | Dividers, small accents only | **Yes** |

## 3. Color System

The palette has three tiers: institutional (§2, used sparingly), operational neutrals (the actual workhorse of the UI), and semantic colors (stock/status — functional, not decorative).

### 3.1 Operational Neutrals

| Token | Hex | Usage |
|---|---|---|
| `surface` | `#FFFFFF` | Cards, primary content surfaces |
| `background` | `#F4F5F7` | App background — a soft cool gray, deliberately not cream or pure white, so it doesn't glare on an outdoor tablet screen and doesn't read as a decorative warm palette |
| `border` | `#DDE1E6` | Card borders, dividers |
| `text-primary` | `#1B1F24` | Body text, headings — near-black rather than pure black, easier on the eyes under harsh outdoor light |
| `text-secondary` | `#5B6470` | Captions, metadata, timestamps |

### 3.2 Semantic (Stock & Status)

These carry real operational meaning — an operator or manager should recognize the state at a glance, but never from color alone (see Accessibility, §9).

| Token | Hex | Meaning | Paired icon |
|---|---|---|---|
| `status-available` | `#1F8A5F` | In stock, issuable | check-circle |
| `status-low` | `#C97A1B` | Below the low-stock threshold — needs restocking soon | alert-triangle |
| `status-out` | `#B3261E` | Zero stock, or lost/damaged | x-circle |
| `status-info` | `#2B6CB0` | Neutral system state — syncing, offline, pending | clock / wifi-off |

**Rule:** semantic colors are reserved exclusively for stock/status meaning. Never reuse `status-out` red or `status-available` green for anything decorative — the moment red appears somewhere that isn't "out of stock," the signal stops being trustworthy at a glance.

## 4. Typography

**Single type family, disciplined weight/size scale — not a decorative pairing.** For a fast-glance operational tool, one well-crafted family beats two competing personalities. The one deliberate typographic split is functional, not stylistic: a tabular numeral treatment for data-dense screens (stock counts, timestamps, reports), distinct from the UI/label treatment.

> **Amended 2026-07-20.** This section originally specified **Inter**, which contradicted `CLAUDE.md`'s Modernist design system (Archivo). `CLAUDE.md` was confirmed authoritative on visual style; the faces below are updated to match what is built. The *reasoning* above is unchanged and still holds — Archivo satisfies it.

| Role | Face | Notes |
|---|---|---|
| UI / headings / labels | **Archivo** | Per the Modernist design system. Legible at small sizes on tablets, wide language support, free |
| Body text | Archivo (Regular/Medium) | Same family — consistency over variety |
| Data / numeric (stock counts, timestamps, report tables) | **JetBrains Mono**, tabular figures | Tabular alignment matters when scanning a column of stock counts — this is the justified exception to "one face" |

### Type Scale

| Level | Size | Weight | Usage |
|---|---|---|---|
| Screen title | 28px | 700 | Top-level screen headers |
| Section header | 20px | 600 | Card group headers, dashboard section titles |
| Card title | 18px | 600 | Student name, item name |
| Body | 16px | 400 | Default text — never smaller on operator-facing screens |
| Label / caption | 13px | 500, uppercase, letter-spacing 0.04em | Field labels, category tags |
| Data / numeric | 16px | 500, tabular | Stock counts, timestamps |

Body text floor of 16px is deliberate: this interface is read in motion, sometimes outdoors, sometimes by someone who's been on their feet all period — nothing operator-facing should require close reading.

## 5. Spacing & Layout

8px base grid — standard, predictable, and easy for any implementer to follow consistently without guessing.

| Token | Value |
|---|---|
| `space-1` | 4px |
| `space-2` | 8px |
| `space-3` | 12px |
| `space-4` | 16px |
| `space-6` | 24px |
| `space-8` | 32px |
| `space-12` | 48px |
| `space-16` | 64px |

| Context | Spacing |
|---|---|
| Card padding (operator screens) | 16px |
| Card padding (manager dashboard) | 24px |
| Grid gutter — item selection grid | 12px (dense but still cleanly tappable) |
| Grid gutter — dashboard cards | 24px |
| Minimum touch target | **48×48px** — exceeds the 44px WCAG minimum, since taps happen quickly and sometimes imprecisely mid-rush |

## 6. Iconography

- **Style:** outline/stroke icons, 1.5px stroke weight, 24px default size. Consistent stroke weight across the whole product — no mixing filled and outline styles.
- **Library:** Lucide (open, consistent stroke language, easy to source at any size needed).
- **Signature element — sport tag chips:** every sport gets one fixed icon + one fixed accent color, shown as a small chip wherever that sport appears — the operator's item grid, the manager's daily/weekly reports, the transaction log. This is the single consistent visual device the product is built around (see §1): it turns a dense report table into something scannable by color/shape alone, without reading every row.

| Sport | Icon (Lucide) |
|---|---|
| Badminton | `feather` or racket-style custom mark |
| Basketball | `circle-dot` |
| Cricket | custom bat mark |
| Football | `circle` (ball) |
| Volleyball | custom ball mark |
| Throwball | custom ball mark, distinct from volleyball |
| Table Tennis | `table` or paddle mark |
| Carrom | `square` (board) |
| Chess | custom piece mark |

*(Sport tag colors are drawn from a small fixed 8–9 color set, distinct from the semantic status colors in §3.2, so a sport tag is never mistaken for a stock-status indicator.)*

- **Status icons:** paired with every semantic color per §3.2 — status is never color-only.

## 7. Card & Component Styles

> **Amended 2026-07-20.** Corner radius originally specified 12px. `CLAUDE.md`'s Modernist system is flat and zero-radius, and was confirmed authoritative on visual style. Updated below to match what is built.

| Property | Value | Rationale |
|---|---|---|
| Corner radius | 2px (`--border-radius-sm`), effectively square | Per the Modernist design system: flat, flush-left, zero-radius |
| Shadow (resting) | `0 1px 3px rgba(0,0,0,0.08)` | Minimal elevation — separates card from background without a heavy skeuomorphic look |
| Border | 1px solid `border` token, on cards sitting on `background` | Not needed on cards already separated by shadow on pure white |
| Ineligible / out-of-stock item | 55% opacity, no shadow, non-interactive, **and a badge naming the reason** | Recedes visually rather than vanishing — operator understands *why* it's not tappable, not just that it's missing. *Amended 2026-07-20: raised from 40% to 55% so the reason badge still meets the §9 contrast floor; the reason badge itself was added, without which this row's stated rationale went unmet.* |

### Key Components

| Component | Description |
|---|---|
| **Student ID card display** | Appears immediately after a successful scan. Surface white, 12px radius, student name at Card Title size, roll number and branch/year at Label size, no photo unless the college roster provides one later. |
| **Item selection card** | One per eligible equipment type/variant. Sport tag chip top-left, item name at Body size, live stock count at Data/numeric size bottom-right, colored by `status-available`/`status-low`/`status-out`. |
| **Reason-for-free chip** | Five fixed pill-shaped tap targets (Free Hour / Fit Hour / Lunch Hour / After College / Practice Session), single-select, `institutional-maroon` fill when selected, neutral outline otherwise — never free text (per `requirements.md` FR-15). |
| **Low-stock alert card** | Manager dashboard only. `status-low` left border accent, item name, current count, threshold, location. |
| **Manager report summary card** | Daily/weekly/monthly rollup. Uses the numeric/tabular type treatment, sport tag chips inline next to each row for fast visual scanning. |

## 8. States

Every interactive element must define these explicitly — this is where "professional clean" either holds up or falls apart under real use:

| State | Treatment |
|---|---|
| Default | As specified per component above |
| Selected | `institutional-maroon` fill or border, per component |
| Disabled / ineligible | 40% opacity, no pointer cursor, no shadow |
| Loading (e.g., stock check in progress) | Skeleton placeholder, not a spinner over real content — avoids a flash of stale data |
| Offline / syncing | `status-info` blue badge with clock/wifi-off icon and plain-language label ("Saved — will sync when back online"), never a silent or ambiguous state |
| Error | `status-out` red, icon + plain text describing what happened and what to do next — never just a red border with no explanation |
| Empty (e.g., no transactions yet today) | Plain-language prompt, not a decorative illustration — this is a utility tool, not a consumer app |

## 9. Accessibility

- **Contrast:** WCAG AA minimum — 4.5:1 for body text, 3:1 for large text and icons. All hex pairs above should be checked against this once the real institutional colors (§2) are confirmed, since maroon-on-white and gold-on-white have different margins.
- **Never color-only status.** Every semantic color (§3.2) is always paired with an icon and a text label — roughly 8% of men have some form of red-green color vision deficiency, which matters directly here given red/green stock semantics.
- **Touch targets:** 48×48px minimum on all Operator surfaces, not just primary actions. *Amended 2026-07-20:* the Manager dashboard is a dense desktop tool per `CLAUDE.md`, so it uses 32px targets on a mouse and steps up to 44px under `@media (pointer: coarse)` — a manager on a tablet still gets a real target. "48px everywhere" and `CLAUDE.md`'s role-specific densities were in conflict; this resolves it without leaving touch users behind.
- **Focus states:** visible keyboard/external-input focus rings — on **both** roles, not only the Manager dashboard. An Operator tablet may have a keyboard attached, and keyboard access is not optional. Implemented as a single `--focus-ring` token applied via `:focus-visible`.

## 10. Logo & Asset Usage

- **Placement:** CBIT mark, top-left of every screen header, always on a `surface` (white) backing — never floating directly on `institutional-maroon` or any busy background, to protect legibility.
- **Clear space:** minimum clear space around the mark equal to the mark's own height on all sides.
- **Minimum size:** never rendered smaller than 32px height in the mobile/tablet header.
- **App icon / favicon:** a simplified monogram or crest-only mark (no wordmark) at a 512×512 master, exported to standard PWA icon sizes.
- **Don't:** stretch, recolor, rotate, add drop shadows, or place on a background that fails the contrast rule in §9.
- **Asset gap:** as noted in §2, the actual CBIT logo file (ideally vector/SVG, official version) is needed before this can be finalized — these are placement *rules*, not a substitute for the real asset.

## 11. Voice & Microcopy

Brief, because tone is part of "professional clean" too:

- Plain, active voice. "Item issued" not "Yay! Item issued!" — no exclamation marks, no filler.
- Buttons describe the action they take: "Confirm issue," not "Submit."
- Errors state what happened and what to do — never apologize, never leave the operator guessing.
- Vocabulary stays consistent through a flow: if a button says "Issue," the confirmation that follows says "Issued," not "Processed" or "Done."

## 12. Open Items

| # | Item | Status |
|---|---|---|
| 1 | Actual CBIT logo file and confirmed official brand hex values | **Needed before ship** — see §2, §10 |
| 2 | Whether a student photo becomes available (from a future official roster import) for the ID card display component | Deferred — component designed to work without one for now |
| 3 | Final icon choices for sports without an obvious existing Lucide match (cricket bat, volleyball, chess piece, carrom striker) | Custom marks needed — placeholder direction given in §6 |