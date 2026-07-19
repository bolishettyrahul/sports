# CBIT Sports: Shared API Contracts

This document is the **Single Source of Truth (SSOT)** for all communication between the frontend and backend. Both teams/agents must implement their respective sides to match these payloads precisely.

---

## 🔒 1. Authentication
*Role validation and token retrieval.*

### `POST /api/auth/login`
- **Request**:
  ```json
  {
    "username": "operator1",
    "password": "securepassword"
  }
  ```
- **Response (Success)**:
  ```json
  {
    "token": "jwt-token-string",
    "role": "operator",
    "name": "Rohan Verma",
    "location": "Counter 1"
  }
  ```
- **Response (Error)**:
  ```json
  {
    "error": "Invalid credentials"
  }
  ```

---

## 📋 2. Student Identification & Roster
*Scan/search validation and eligibility computation.*

### `GET /api/students/:roll_no`
- **Response (Eligible Student)**:
  ```json
  {
    "roll_no": "160120733",
    "name": "Ananya Sharma",
    "gender": "FEMALE",
    "branch": "CSE",
    "year": 3,
    "eligible": true,
    "active_checkouts": 1,
    "eligible_sports": ["basketball", "cricket", "table_tennis"]
  }
  ```
- **Response (Ineligible Student - Limit Exceeded)**:
  ```json
  {
    "roll_no": "160120734",
    "name": "Vikram Singh",
    "gender": "MALE",
    "branch": "ECE",
    "year": 4,
    "eligible": false,
    "reason": "Max active checkouts (2) reached",
    "active_checkouts": 2,
    "eligible_sports": []
  }
  ```
- **Response (Not Found - Triggers Enrollment Dialog)**:
  ```json
  {
    "error": "Student not found",
    "code": "STUDENT_NOT_FOUND"
  }
  ```

### `POST /api/students/enroll`
- **Request**:
  ```json
  {
    "roll_no": "160120755",
    "name": "Aman Raj",
    "gender": "MALE",
    "branch": "MECH",
    "year": 2
  }
  ```
- **Response**:
  ```json
  {
    "status": "success",
    "student": {
      "roll_no": "160120755",
      "name": "Aman Raj",
      "gender": "MALE",
      "branch": "MECH",
      "year": 2,
      "eligible": true,
      "active_checkouts": 0,
      "eligible_sports": ["basketball", "cricket", "table_tennis", "volleyball", "football"]
    }
  }
  ```

---

## 🎒 3. Inventory Catalog
*Fetch catalog items, stock status, and trigger restock updates.*

### `GET /api/equipment`
- **Response**:
  ```json
  [
    {
      "id": "basketball",
      "name": "Basketball",
      "sport": "Basketball",
      "total_stock": 20,
      "available_stock": 12,
      "low_stock_threshold": 5,
      "gender_rule": "ALL",
      "max_issue_cap": 1,
      "variants": [
        { "id": "bball_sz_7", "name": "Size 7 (Standard)", "available_stock": 8 },
        { "id": "bball_sz_6", "name": "Size 6 (Women's)", "available_stock": 4 }
      ]
    },
    {
      "id": "cricket_kit",
      "name": "Cricket Kit",
      "sport": "Cricket",
      "total_stock": 5,
      "available_stock": 2,
      "low_stock_threshold": 3,
      "gender_rule": "ALL",
      "max_issue_cap": 1,
      "variants": [
        { "id": "cricket_bat", "name": "Bat & Balls", "available_stock": 2 }
      ]
    }
  ]
  ```

### `POST /api/equipment/restock`
- **Request**:
  ```json
  {
    "equipment_id": "basketball",
    "variant_id": "bball_sz_7",
    "quantity": 5
  }
  ```
- **Response**:
  ```json
  {
    "status": "success",
    "new_available_stock": 17,
    "variant_stock": 13
  }
  ```

---

## ⚡ 4. Transactions Processing
*Create checkouts, process returns, and handle bulk sync.*

### `POST /api/transactions/issue`
- **Request**:
  ```json
  {
    "client_tx_id": "550e8400-e29b-41d4-a716-446655440000",
    "roll_no": "160120733",
    "equipment_id": "basketball",
    "variant_id": "bball_sz_7",
    "operator_id": "operator1",
    "checkout_reason": "Lunch Hour"
  }
  ```
- **Response**:
  ```json
  {
    "status": "success",
    "transaction_id": "aa33d1b5-9011-477c-bc7d-944d320921bf",
    "client_tx_id": "550e8400-e29b-41d4-a716-446655440000",
    "available_stock": 11
  }
  ```

### `POST /api/transactions/return`
- **Request**:
  ```json
  {
    "roll_no": "160120733",
    "equipment_id": "basketball",
    "variant_id": "bball_sz_7"
  }
  ```
- **Response**:
  ```json
  {
    "status": "success",
    "message": "Equipment returned successfully",
    "available_stock": 12
  }
  ```

### `POST /api/transactions/sync`
- **Request**:
  ```json
  {
    "transactions": [
      {
        "client_tx_id": "8fa88924-f7b5-4a6c-94dc-3882798e945c",
        "roll_no": "160120733",
        "equipment_id": "basketball",
        "variant_id": "bball_sz_7",
        "operator_id": "operator1",
        "checkout_reason": "Lunch Hour",
        "checked_out_at": "2026-07-19T14:15:39.000Z"
      },
      {
        "client_tx_id": "c30fa58c-c2b6-455b-bf42-990ff5d9e504",
        "roll_no": "160120755",
        "equipment_id": "cricket_kit",
        "variant_id": "cricket_bat",
        "operator_id": "operator1",
        "checkout_reason": "Practice",
        "checked_out_at": "2026-07-19T14:20:00.000Z"
      }
    ]
  }
  ```
- **Response (Partial/Full success showing idempotency)**:
  ```json
  {
    "status": "success",
    "synced_count": 2,
    "results": [
      { "client_tx_id": "8fa88924-f7b5-4a6c-94dc-3882798e945c", "status": "processed" },
      { "client_tx_id": "c30fa58c-c2b6-455b-bf42-990ff5d9e504", "status": "skipped_duplicate" }
    ]
  }
  ```

---

## 📡 5. Real-time Live Streams (SSE)
*Server Sent Events stream details for Manager dashboard.*

### `GET /api/dashboard/live-stream`
- **Headers**:
  - `Content-Type: text/event-stream`
  - `Cache-Control: no-cache`
  - `Connection: keep-alive`

- **Event: `activity`** (Streamed immediately upon checkout or return completion)
  ```
  event: activity
  data: {
    "timestamp": "2026-07-19T14:15:39Z",
    "student_name": "Ananya Sharma",
    "action": "issued",
    "equipment_name": "Basketball",
    "variant_name": "Size 7",
    "sport": "Basketball"
  }
  ```

- **Event: `low_stock`** (Streamed when available stock falls below target threshold)
  ```
  event: low_stock
  data: {
    "equipment_id": "cricket_kit",
    "equipment_name": "Cricket Kit",
    "variant_id": "cricket_bat",
    "variant_name": "Bat & Balls",
    "available_stock": 2,
    "threshold": 3
  }
  ```
