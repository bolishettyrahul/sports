# CBIT Sports: Project Master Summary

This document coordinates development tasks and timelines between the **Frontend**, **Backend**, and **Integration** teams/agents. To prevent time collisions and merge conflicts, each domain is isolated into its own folder with its own `summary.md` file.

---

## 📂 Repository Structure
```
sports/
├── API_CONTRACTS.md          # Shared Single Source of Truth (SSOT)
├── summary.md                # This master coordination file
├── backend/
│   ├── summary.md            # Backend task log & timeline
│   └── ...                   # Database, Express server, models
├── frontend/
│   ├── summary.md            # Frontend task log & timeline
│   └── ...                   # Vite, React, Vanilla CSS, offline queue
└── integration/
    ├── summary.md            # E2E test scripts, Docker, sync testing
    └── ...                   # Integration suites
```

---

## 📈 High-Level Milestone Tracking

| Milestone | Target Completion | Status | Owner | Description |
| :--- | :--- | :--- | :--- | :--- |
| **API Contract Defined** | Day 1 (Immediate) | ⏳ Pending | Joint | Freeze all JSON endpoints to allow parallel work. |
| **Monorepo Directory Setup**| Day 1 (Immediate) | 🔄 In Progress | Joint | Setup `/frontend`, `/backend`, and `/integration` trees. |
| **Frontend Shell & Mocks** | Day 3 | ⏳ Pending | Antigravity | Frontend UI running with mock data endpoints. |
| **Backend Integration Ready**| Day 4 | ⏳ Pending | Claude Code | Database, controllers, and SSE feeds operational. |
| **Offline Sync Integration** | Day 5 | ⏳ Pending | Joint | E2E verification of offline queue syncing to DB. |
| **Final Walkthrough** | Day 7 | ⏳ Pending | Joint | Build compilation, responsive audit, test pass. |

---

## 🚦 Collision-Free Guidelines (For Claude Code & Antigravity)

1. **Scoping**:
   - **Antigravity**: Write and execute code ONLY under the `/frontend` directory.
   - **Claude Code**: Write and execute code ONLY under the `/backend` directory.
   - **Integration Workspace**: Only touch files in `/integration` or root for contract definitions and integration testing.
2. **State Syncing**:
   - Updates to tasks must be logged in each directory's respective `summary.md` file.
   - Do not edit each other's files directly. If an API contract needs modification, discuss it in the central `API_CONTRACTS.md` first.
3. **Branching Strategy (if using Git)**:
   - Develop on separate feature branches (e.g. `feat/frontend-ui`, `feat/backend-api`, `feat/offline-sync`).
   - Merge to `main` only after verified tests pass locally.

---

## 🔗 Sub-Module Summaries
* [Frontend Summary](file:///c:/Users/bolis/OneDrive/Desktop/sports/frontend/summary.md)
* [Backend Summary](file:///c:/Users/bolis/OneDrive/Desktop/sports/backend/summary.md)
* [Integration Summary](file:///c:/Users/bolis/OneDrive/Desktop/sports/integration/summary.md)
* [Shared API Contracts](file:///c:/Users/bolis/OneDrive/Desktop/sports/API_CONTRACTS.md)
