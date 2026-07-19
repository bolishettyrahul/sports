# Requirements Specification: CBIT Sports Equipment Management System

This document outlines the comprehensive functional and non-functional requirements for the CBIT Sports Equipment Management System, derived from the core wireframes and user feedback.

---

## 1. User Roles & Authentication

The system is designed for two distinct roles with separate login systems:

### 1.1. Counter Operator
- **Access Scope**: Fast, rush-hour transactional screens for issuing equipment.
- **Environment**: Primarily tablet (landscape), with future support for mobile/laptop.
- **Authentication**: Individual username-password login. No Single Sign-On (SSO) required. Redirects directly to the Scanning interface upon successful authentication.

### 1.2. Manager / Admin
- **Access Scope**: System configuration, high-level dashboards, reporting, and issue resolution.
- **Environment**: Denser layout optimized for laptop/desktop browsers.
- **Authentication**: Individual username-password login. Redirects directly to the Admin Dashboard upon successful authentication.

---

## 2. Functional Requirements (FR)

### FR-1: Student Identification (Scan & Search)
- **FR-1.1: Barcode Scanning**: The system must support accessing the device camera to scan student ID barcodes.
- **FR-1.2: Manual Fallback Search**: If the ID barcode is damaged or lighting is poor, the Operator must be able to search for a student manually by typing their Roll Number.
- **FR-1.3: Verification Response**: Scanning or searching must resolve and display student details or trigger enrollment within 1 second under normal network conditions.

### FR-2: Student Eligibility Verification
- **FR-2.1: Roster Match**: Match scanned/searched Roll Number against the active student roster database.
- **FR-2.2: Eligibility Rules**: Precompute student eligibility based on:
  - Gender restrictions per sport.
  - Overall active issue limits (e.g., maximum 2 items checked out simultaneously).
  - Sport-specific checkout limits (e.g., maximum 1 basketball at a time).
- **FR-2.3: Eligibility Indicators**: Display clear eligibility status badges (e.g., "Eligible · 8 sports" or block checkout if ineligible).

### FR-3: Progressive Student Enrollment
- **FR-3.1: Auto-detection**: If a scanned barcode is not matched in the roster, the system must prompt for progressive enrollment.
- **FR-3.2: Enrollment Roster Creation**: Capture critical fields: Roll Number, Full Name, Gender, Year, and Branch/Department.
- **FR-3.3: Roster Save**: Saving must write the student to the master roster, allowing immediate transition back to the equipment checkout grid.
- **FR-3.4: Target Flow Duration**: The enrollment capture flow must be design-optimized to complete in under 15 seconds.

### FR-4: Equipment Catalog & Selection Grid
- **FR-4.1: Sports Categorization**: Display equipment organized by sport (Basketball, Cricket, Table Tennis, Volleyball, etc.).
- **FR-4.2: Real-time Stock Display**: Show remaining available stock for each equipment item.
- **FR-4.3: Stock Badging**: Display stock status based on configurable thresholds:
  - **OK**: Stock is well above threshold (e.g., "18 available").
  - **Low Stock**: Stock is at or below threshold (e.g., "3 left / threshold 5").
  - **Out of Stock**: Stock is 0 (e.g., "0 available").
- **FR-4.4: Active Disabling**: Dim or make untappable any items that are Out of Stock or for which the student is ineligible.
- **FR-4.5: Variant Selection**: Support multi-tier options within a single card (e.g., choosing "Size 6" vs "Size 7" for a Basketball, or "Bat/Ball/Both" for Table Tennis).

### FR-5: Issue Summary & Checkout Reasons
- **FR-5.1: Selection Review**: Display selected items, selected variants, and current stock status on an issue rail.
- **FR-5.2: Fixed Checkout Reasons**: Require selection of a checkout reason from a pre-defined, non-editable list:
  - `Free Hour`
  - `Fit Hour`
  - `Lunch Hour`
  - `After College`
  - `Practice`
- **FR-5.3: Checkout Confirmation**: Generate a transaction log upon clicking "Confirm Issue", updating local and remote stock counts.

### FR-6: Offline Synchronization Support
- **FR-6.1: Connection Auto-detection**: Detect loss of network connectivity and seamlessly transition to local queue mode.
- **FR-6.2: Offline Transaction Queuing**: Save completed checkouts locally to browser storage.
- **FR-6.3: Idempotency Key**: Embed a unique client-generated UUID for each transaction in the offline queue to prevent duplicate logs.
- **FR-6.4: Automatic Sync**: Automatically background-sync the queue to the backend once connection is restored. Display sync state badges (e.g., "Online · synced" or "Offline · 3 pending").

### FR-7: Manager Dashboard KPIs
- **FR-7.1: KPI Counters**: Provide real-time counts for:
  - `Issued Today` (total number of checkouts)
  - `Unique Students` (count of distinct students served)
  - `Returns Today` (total returns processed)
  - `Low-Stock Alerts` (count of items currently under threshold)
- **FR-7.2: Comparative Delta**: Display performance indicator deltas (e.g., "▲ 12% vs avg" or "46 outstanding").

### FR-8: Real-time Low-Stock Alerts
- **FR-8.1: Real-time Monitoring**: Monitor stock level decrements on each transaction.
- **FR-8.2: Live Feed Alerts**: Push notifications to the Manager Dashboard immediately when an item's stock dips below its threshold.
- **FR-8.3: Actionable Restock**: Provide a "Restock" trigger button next to each alert to increment quantities.

### FR-9: Live Activity Feed
- **FR-9.1: Real-time Transaction Logs**: Stream a live feed of all operator checkouts and returns on the Manager Dashboard.
- **FR-9.2: Content Elements**: Display timestamp, Student Name, action type (issued/returned), and Sport Chip.

### FR-10: Reports & Rolling Summaries
- **FR-10.1: Time Range Filters**: Provide Daily, Weekly, and Monthly rollup reports.
- **FR-10.2: Rolled Metrics by Sport**: Display: Sport, Issues, Unique Students, Returns, and Top Reason.
- **FR-10.3: CSV Export**: Allow exporting the active report rollup table as a CSV file.

### FR-11: Equipment & Rules Editor
- **FR-11.1: Rules Management**: Edit data-driven eligibility rules, including:
  - Variant pools (Size 6, Size 7, etc.)
  - Gender-specific restriction parameters
  - Low-stock threshold triggers
  - Maximum issue caps per student transaction

### FR-12: Flagged Issues & Administrative Resolution
- **FR-12.1: Duplicate Card Link Prevention**: Block roll numbers already registered to active barcodes.
- **FR-12.2: Student Card Relinking**: Provide administrative flow to search old roll numbers and update/relink them to a newly issued barcode.
- **FR-12.3: Unmatched Return Processing**: Allow managers to flag lost or damaged items without blocking the main operator flow.

---

## 3. Non-Functional Requirements (NFR)

### NFR-1: Performance & UX Responsiveness
- **Scan Response Time**: Camera identification and check should take `< 1 sec`.
- **Roster Search**: Roster filters must react instantly as characters are typed.
- **Data Densities**:
  - **Operator Layout**: Touch targets must be at least `48px` high and wide for error-free tablet taps.
  - **Manager Layout**: Denser layouts (`24px` elements) to maximize visible data on laptop screens without scrolling.

### NFR-2: Reliability & Data Integrity
- **Local Persistence**: Pending transactions in the offline queue must survive browser page reloads or tab closures by utilizing browser `localStorage` or `indexedDB`.
- **Idempotency Safeguard**: Every transaction payload must carry a unique transaction ID. The server must discard any duplicate sync requests with the same ID.
- **Precomputed Statistics**: Reports and rollups must be generated from pre-aggregated daily summaries rather than raw logs to minimize database read overhead.
