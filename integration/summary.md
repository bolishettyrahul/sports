# CBIT Sports: Integration & E2E Testing Log

This document tracks milestones relating to the coordination, deployment, and end-to-end integration testing of both Frontend and Backend systems.

---

## 📅 Timeline & Status Board

| Task ID | Action Area | Description | Target Completion | Status | Actual Date |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **INT-01** | API Agreement | Lock down request/response payloads in `API_CONTRACTS.md`. | Day 1 | ⏳ Pending | - |
| **INT-02** | Local Env Setup | Configure Docker Compose or script commands to run frontend & database & backend simultaneously. | Day 3 | ⏳ Pending | - |
| **INT-03** | Interface Linking | Switch frontend configuration from mock data layer to live backend API base URL. | Day 5 | ⏳ Pending | - |
| **INT-04** | Offline-Online E2E | Run manual tests shutting down/enabling the backend server to verify offline recovery queue logs. | Day 5 | ⏳ Pending | - |
| **INT-05** | Real-time SSE Test | Verify that transactions in the Operator view update the Manager dashboard feeds within 1 second. | Day 6 | ⏳ Pending | - |
| **INT-06** | End-to-End Test Suite | Implement automated E2E script flows (e.g. using Cypress or Playwright) simulating key user workflows. | Day 7 | ⏳ Pending | - |
| **INT-07** | Performance & Audit | Verify responsive target sizes, print layout behaviors, and DB query speed. | Day 7 | ⏳ Pending | - |

---

## 🛠️ Developer / AI Agent Instructions

1. **Development Domain**: Write and modify code ONLY inside the `/integration` or root directory.
2. **Environment isolation**: Verify frontend and backend utilize clean local development environments and configurations.
3. **Automated Verification**: Focus on mocking browser state and network connectivity drops to systematically test offline sync reliability.
