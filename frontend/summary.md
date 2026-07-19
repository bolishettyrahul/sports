# CBIT Sports: Frontend Development Log

This document tracks all frontend tasks, timelines, and progress states.

---

## 📅 Timeline & Status Board

| Task ID | Component / Page | Description | Target Completion | Status | Actual Date |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **FE-01** | Shared System CSS | Set up Vite React template and write shared `index.css` variables, typography, and classes. | Day 3 | ⏳ Pending | - |
| **FE-02** | Login Interface | Design user credentials layout with operator/manager redirects. | Day 3 | ⏳ Pending | - |
| **FE-03** | Mock Service Layer | Create client mock controllers mapping to `API_CONTRACTS.md` parameters. | Day 3 | ⏳ Pending | - |
| **FE-04** | Operator Grid UI | Build equipment card elements, category filters, and touch action selectors. | Day 4 | ⏳ Pending | - |
| **FE-05** | Scan & Enroll View | Implement camera viewport scan reticle and Progressive Student Enrollment drawer. | Day 4 | ⏳ Pending | - |
| **FE-06** | Local Queue / Cache | Set up Service Worker configuration and write local transaction storage manager. | Day 5 | ⏳ Pending | - |
| **FE-07** | Network Sync hook | Build optimistic update handler and sequential queue pusher module. | Day 5 | ⏳ Pending | - |
| **FE-08** | Manager Layout | Design dashboard grid, KPI metric panels, and list views. | Day 6 | ⏳ Pending | - |
| **FE-09** | Live stream (SSE) client | Connect SSE hooks to render live activities scroll and slide-in low stock banners. | Day 6 | ⏳ Pending | - |
| **FE-10** | Reports & CSV export | Add rolling date tabs and front-end CSV data parser. | Day 7 | ⏳ Pending | - |
| **FE-11** | Administrative Actions | Code overrides interfaces: student card relinking and damaged gear reporting. | Day 7 | ⏳ Pending | - |

---

## 🛠️ Developer / AI Agent Instructions

1. **Development Domain**: Write and modify code ONLY inside the `/frontend` root.
2. **API Mocking**: Keep the mock API layer active by default (e.g. using a toggle: `const USE_MOCKS = true;` or environment variables) so that the UI can be fully built, tested, and previewed before integration.
3. **Design Guidelines**: Ensure all styling classes refer to custom tokens declared in `index.css`. Touch targets must be tested on mobile viewport dimensions.
