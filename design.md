# Design System & UI/UX Specification: CBIT Sports

This document outlines the UI/UX design decisions, style guides, and design tokens for the CBIT Sports Equipment Management System, ensuring a premium, responsive, and role-optimized interface.

---

## 1. Color Palette & Semantics

The interface utilizes a curated palette with deep classic tones (Maroon and Charcoal) accented with warm tones (Gold/Amber) and crisp neutrals.

### 1.1. Core Brand Colors
- **Primary Brand / Dark Accent**: Maroon (`#6E1423`) — Used for primary action buttons, active navigation states, and branding highlights.
- **Dark Neutral (Text/Borders)**: Charcoal (`#1b1f24` / `#201e1d`) — Used for body text, key buttons, boundaries, and headers.
- **Accent**: Gold / Amber (`#c26b1f` / `#C97A1B`) — Used to represent active focus or highlights.
- **App Canvas Background**: Soft Sand / Cream (`#eceae6` / `#dcdad6`) — Provides a premium, low-glare surface.
- **Surface / Card Background**: Pure White (`#ffffff`) — Used for active cards, grids, and form elements.
- **Divider Color**: Muted Grey (`#cdd3da` / `#e4e7ea`) — Clean boundaries.

### 1.2. Semantic Status Badges
| Status Type | Text Color | Background | Border Color | Meaning |
| :--- | :--- | :--- | :--- | :--- |
| **Success / OK** | `#177049` / `#1F8A5F` | `#e4f1ea` | `#bcdfca` / `#bfe0cd` | Eligible student, high stock status, or success state. |
| **Warning / Low** | `#9a5c10` / `#C97A1B` | `#fbefdc` | `#ecd3a3` | Low stock counts, warnings, pending sync. |
| **Danger / Out** | `#992019` / `#B3261E` | `#f8e3e1` | `#eec1bd` / `#eec3c0` | Out of stock items, blocked operations. |
| **Info / System** | `#255a8f` / `#2B6CB0` | `#e7eef7` | `#b9d0e8` | System notices, offline caching status. |

---

## 2. Typography

We use two distinct Google Fonts to build contrast and support high readability:

- **Primary Headings & Body**: `Archivo`
  - Font weights: `400` (Regular), `500` (Medium), `600` (Semi-Bold), `700` / `800` (Bold/Extra-Bold).
  - Purpose: Headers, titles, descriptions, buttons, forms, and general content.
- **Data & Metadata**: `JetBrains Mono`
  - Font weights: `400` (Regular), `500` (Medium), `600` (Semi-Bold).
  - Purpose: Student Roll Numbers, inventory counts, timestamps, badges, and code statuses.

---

## 3. Layout Densities & Grid Systems

The layout adapts structurally based on the authenticated role and target hardware:

### 3.1. Operator View (Tablet Landscape)
Designed for high-speed, high-stress touch interactions on tablets mounted at issue counters.
- **Target Size**: Minimum touch target of `48px` for all buttons, interactive pills, and option selectors.
- **Screen Splits**:
  - Left Panel: Scrollable equipment item selection grid (2-3 columns depending on sidebar width).
  - Right Panel: Fixed checkout panel (width: `360px` or `30%) for immediate summary, reason selection, and confirmation.
- **Gap Spacings**: Spacious padding (`22px` standard) to prevent accidental taps.

### 3.2. Manager View (Laptop/Desktop)
Designed for information-rich administrative viewing on computers.
- **Target Size**: Denser components (`24px` headers, tighter borders).
- **Layout Panels**:
  - KPI Dashboard Row: 4 equal-width cards tracking daily counts.
  - Split Column Row: Left column (1.4x width) for live low-stock alerts, Right column (1x width) for recent activity logs.
  - Bottom Row: Wide tabular lists for rolling stats.
- **Gap Spacings**: Compact padding (`12px` to `16px`) to maximize above-the-fold information.

---

## 4. UI Components

### 4.1. The Top Bar (CB Bar)
- **Brand Identity**: Left-aligned monogram badge (`CB`) inside a solid block background.
- **Sub-info**: Under-header label displaying specific location (e.g., "Counter 1").
- **Middle Section (Manager Only)**: Horizontal navigation tabs: *Dashboard*, *Reports*, *Equipment*, *Flagged*. Active tab uses a Maroon underline.
- **Right Section**: Real-time sync badge (icon + label), user profile indicator, and avatar badge containing operator initials (e.g., `RV`).

### 4.2. Student Strip
- **Status Indicator**: Left bordered graphic for scanning state.
- **Details Section**: Large student name, secondary text displaying `Roll Number · Department · Year`.
- **Status Badge**: Inline eligibility badge with icon (e.g. `[Checkmark] Eligible · 8 sports`).

### 4.3. Equipment Card
- **Header**: Inline Sport Chip (with designated color dot per sport) and remaining count.
- **Body**: Bold item title and variant characteristics (e.g., "Size 6 · Size 7").
- **Variant Selector**: Segmented control with equal widths (e.g., Radio inputs styled as buttons). Checked option transitions from white background to solid Maroon background with white text.
- **Disabled State**: Non-selectable cards receive an opacity filter of `0.42` and are disabled from hover and tap events.

### 4.4. KPI Card
- **Border**: Bordered frame with accent borders on high-priority items (e.g., Orange border for low-stock warnings).
- **Data**: Large bold text using `JetBrains Mono`.
- **Label**: Tiny uppercase text using `JetBrains Mono` at the top of the card.
- **Sub-indicator**: Colored text indicator showing daily trend/status (e.g. "▲ 12% vs avg").

### 4.5. Table View
- **Header Cells**: Upper-case, small monospace text with solid bottom borders.
- **Rows**: alternating cell paddings, bottom-bordered items.
- **Value Alignments**: Text columns left-aligned, numeric quantities right-aligned using tabular numbers for visual comparison.

---

## 5. Interaction States & Transitions

- **Hover States**: Interactive elements (buttons, sport chips, menu items) should scale slightly or shift background colors smoothly (`transition: all 0.2s ease-in-out`).
- **Scan Reticle**: The camera scan container is framed in black. An animated, bright orange horizontal scanline oscillates up and down to indicate an active camera/decoding session.
- **Real-time Push Notification**: New items arriving in the Manager activity feed or low-stock warnings must slide down or fade in with a subtle animation to draw attention.
