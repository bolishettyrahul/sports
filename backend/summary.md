# CBIT Sports: Backend Development Log

This document tracks all backend tasks, database migrations, endpoint integrations, and testing timelines.

---

## 📅 Timeline & Status Board

| Task ID | System / Endpoint | Description | Target Completion | Status | Actual Date |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **BE-01** | Project Setup & DB config | Initialize framework (Express/FastAPI), install DB driver (PG), and structure routing. | Day 1 | ⏳ Pending | - |
| **BE-02** | Migrations & Seeding | Write schemas for the 4 core tables and populate with initial student and sports inventory dataset. | Day 1 | ⏳ Pending | - |
| **BE-03** | Auth Endpoints | Code authentication handlers and JWT security token validation middlewares. | Day 2 | ⏳ Pending | - |
| **BE-04** | Student APIs | Code `GET /api/students/:roll_no` (with eligibility checker) and `POST /api/students/enroll`. | Day 2 | ⏳ Pending | - |
| **BE-05** | Inventory & Transactions | Implement checkout (`/issue`) and return (`/return`) routes updating database quantities. | Day 2 | ⏳ Pending | - |
| **BE-06** | Integration Tests | Write mock endpoint routing integration tests validating stock drop safety constraints. | Day 2 | ⏳ Pending | - |
| **BE-07** | Sync Endpoint | Implement `/sync` route mapping to the transaction database with `client_tx_id` checks. | Day 5 | ⏳ Pending | - |
| **BE-08** | SSE Notification Feed | Code server-sent events connection channel streaming logs and low-stock warnings. | Day 6 | ⏳ Pending | - |
| **BE-09** | Restock & Admin API | Code `/restock` trigger and database modification endpoints for overrides. | Day 7 | ⏳ Pending | - |

---

## 🛠️ Developer / AI Agent Instructions

1. **Development Domain**: Write and modify code ONLY inside the `/backend` root.
2. **Database Integrity**: Ensure database updates (such as inventory checkouts) run inside transactions to prevent race conditions (especially during bulk synchronization checks).
3. **Idempotency checks**: Guard transactional entries on database level with index constraints on `client_tx_id`.
