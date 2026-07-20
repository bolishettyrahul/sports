# Technical Specification: CBIT Sports

This document outlines the detailed system architecture, database models, API contracts, and offline synchronization mechanisms for the CBIT Sports Equipment Management System.

---

## 1. System Architecture & Tech Stack

The application is structured as two role-specific frontend interfaces interacting with a shared central backend API:

### 1.1. Frontend Stack
- **Framework**: React (bootstrapped with Vite) for reactive state handling.
- **Routing**: Client-side role-based routing (separate entry routes for Operator `/operator` and Manager `/manager`).
- **Styling**: Vanilla CSS utilizing CSS Custom Properties (Variables) defined in a central `index.css` for design system tokens.
- **Offline Capabilities**:
  - **Service Worker**: Cache static assets (JS, HTML, CSS, fonts) for offline application shell execution.
  - **Browser Storage**: Use `localStorage` or `indexedDB` to store the pending checkout queue.

### 1.2. Backend & Real-time Delivery
- **Server Application**: Node.js with Express (or Python FastAPI).
- **Real-time Engine**: Server-Sent Events (SSE) or WebSockets to stream low-stock notifications and activity feed logs to the Manager Dashboard.
- **Database**: PostgreSQL (relational structure simplifies transaction integrity and rollback tracking).

---

## 2. Database Schema Specification

```mermaid
erDiagram
    STUDENTS ||--o{ TRANSACTIONS : has
    EQUIPMENT ||--o{ VARIANTS : contains
    EQUIPMENT ||--o{ TRANSACTIONS : logs
    VARIANTS ||--o{ TRANSACTIONS : logs
    
    STUDENTS {
        varchar roll_no PK
        varchar name
        varchar gender
        varchar branch
        int year
        timestamp registered_at
    }

    EQUIPMENT {
        varchar id PK
        varchar name
        varchar sport
        int total_stock
        int available_stock
        int low_stock_threshold
        varchar gender_rule
        int max_issue_cap
    }

    VARIANTS {
        varchar id PK
        varchar equipment_id FK
        varchar name
        int available_stock
    }

    TRANSACTIONS {
        varchar id PK
        varchar client_tx_id UNIQUE
        varchar roll_no FK
        varchar equipment_id FK
        varchar variant_id FK
        varchar operator_id
        timestamp checked_out_at
        timestamp returned_at
        varchar checkout_reason
        varchar status
    }
```

### 2.1. Table Schemas

#### 1. Table: `students`
| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `roll_no` | `VARCHAR(20)` | Primary Key | Format: e.g. "160120733" |
| `name` | `VARCHAR(100)` | NOT NULL | Full name of the student |
| `gender` | `VARCHAR(10)` | NOT NULL | `MALE` or `FEMALE` |
| `branch` | `VARCHAR(50)` | NOT NULL | Branch (e.g. `CSE`, `ECE`) |
| `year` | `INT` | NOT NULL | Academic year: `1` to `4` |
| `registered_at`| `TIMESTAMP` | DEFAULT NOW() | Record creation date |

#### 2. Table: `equipment`
| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(50)` | Primary Key | e.g. `basketball`, `cricket_kit` |
| `name` | `VARCHAR(100)` | NOT NULL | Name of the equipment |
| `sport` | `VARCHAR(50)` | NOT NULL | General sport category |
| `total_stock` | `INT` | NOT NULL | Total inventory count |
| `available_stock` | `INT` | NOT NULL | Current physically present inventory |
| `low_stock_threshold` | `INT` | DEFAULT 5 | Trigger level for manager alerts |
| `gender_rule` | `VARCHAR(10)` | DEFAULT 'ALL' | Restrictions: `ALL`, `MALE`, `FEMALE` |
| `max_issue_cap`| `INT` | DEFAULT 1 | Max quantity allowed per student |

#### 3. Table: `variants`
| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(50)` | Primary Key | e.g. `bball_sz_7`, `tt_bat` |
| `equipment_id` | `VARCHAR(50)` | Foreign Key -> `equipment.id` | Associated parent item |
| `name` | `VARCHAR(50)` | NOT NULL | Variant label (e.g., `Size 7`) |
| `available_stock`| `INT` | NOT NULL | Variant-specific inventory count |

#### 4. Table: `transactions`
| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | Primary Key | Auto-generated UUID |
| `client_tx_id` | `VARCHAR(100)`| UNIQUE | Client-side UUID for offline idempotency |
| `roll_no` | `VARCHAR(20)` | FK -> `students.roll_no` | Recipient student |
| `equipment_id` | `VARCHAR(50)` | FK -> `equipment.id` | Issued item |
| `variant_id` | `VARCHAR(50)` | FK -> `variants.id` | Optional variant designation |
| `operator_id` | `VARCHAR(50)` | NOT NULL | Submitting operator identifier |
| `checked_out_at`| `TIMESTAMP` | NOT NULL | Issue timestamp |
| `returned_at` | `TIMESTAMP` | NULLABLE | Return timestamp |
| `checkout_reason`| `VARCHAR(50)`| NOT NULL | Fixed enum (`Free Hour`, etc.) |
| `status` | `VARCHAR(20)` | DEFAULT 'ISSUED' | `ISSUED`, `RETURNED`, `FLAGGED` |

---

## 3. Core API Routes & Endpoints

### 3.1. Authentication (No SSO)
- `POST /api/auth/login`
  - Request: `{ username, password }`
  - Response: `{ token, role: "operator" | "manager", name }`

### 3.2. Student Identification & Roster
- `GET /api/students/:roll_no`
  - Description: Resolves student record and returns calculated eligibility list.
  - Response:
    ```json
    {
      "roll_no": "160120733",
      "name": "Ananya Sharma",
      "branch": "CSE",
      "year": 3,
      "eligible": true,
      "active_checkouts": 0,
      "eligible_sports": ["basketball", "cricket", "table_tennis"]
    }
    ```
- `POST /api/students/enroll`
  - Description: Progressive enrollment endpoint.
  - Request: `{ roll_no, name, gender, branch, year }`
  - Response: `{ status: "success", student: { ... } }`

### 3.3. Inventory Management
- `GET /api/equipment`
  - Description: Fetches entire catalog with available stock and variant attributes.
- `POST /api/equipment/restock`
  - Description: Triggered by manager to reload stock count.
  - Request: `{ equipment_id, variant_id, quantity }`

### 3.4. Transaction Processing
- `POST /api/transactions/issue`
  - Description: Process checked out item. Writes transaction record and decrements stock.
  - Request: `{ client_tx_id, roll_no, equipment_id, variant_id, checkout_reason }`
- `POST /api/transactions/return`
  - Description: Marks transaction as returned and increments stock.
  - Request: `{ roll_no, equipment_id, variant_id }`

### 3.5. Real-time Dashboard Updates
- `GET /api/dashboard/live-stream`
  - Protocol: Server-Sent Events (SSE).
  - Event Streams:
    - `low_stock`: Fires when an item dips below threshold.
    - `activity`: Fires on new checkouts/returns to update the live scroll feed.

---

## 4. Offline Synchronization Protocol

When connection transitions to offline:
1. **Queue Store**: Write transaction records with a newly generated `client_tx_id` (UUID v4) into the browser client-side storage array `offline_queue`.
2. **Optimistic Updates**: Decrement stock counts in memory on the client app immediately so the UI reflects current inventory.
3. **Queue Push Execution**:
   - The application monitors network states (`navigator.onLine` window triggers).
   - Once online status is detected, the frontend sends the local queue array in sequence to the sync bulk route `/api/transactions/sync`.
4. **Idempotency Safeguard**:
   - The server maintains a unique index on `transactions.client_tx_id`.
   - If the sync batch retries due to partial connectivity failure, the server skips transactions with existing `client_tx_id` matching its records, preventing double-decrements.
