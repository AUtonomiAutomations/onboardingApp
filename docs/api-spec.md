# AutoAgency Platform — API Specification v1

## Overview

Base URL: `https://<your-domain>/api/v1`

All endpoints require the following header:

```
x-api-secret: <MAKE_WEBHOOK_SECRET>
```

The secret is stored in `.env.local` as `MAKE_WEBHOOK_SECRET`.
All request bodies must use `Content-Type: application/json` unless noted as `multipart/form-data`.
All responses are JSON. Successful responses include `"success": true`. Errors include `"error": "..."`.

---

## Clients

---

### 1. Create Client

**Action:** Provision a new client — creates an Auth user, `clients` record, and an initial project.

| Field | Value |
|-------|-------|
| **Method** | `POST` |
| **URL** | `/api/v1/clients` |

**Request Body:**

```json
{
  "company_name":   "string   (REQUIRED) — Client's company name",
  "email":          "string   (REQUIRED) — Login email for the client portal",
  "monday_item_id": "string   (optional) — Monday.com item ID for cross-reference",
  "system_ids":     "uuid[]   (optional) — Array of system UUIDs to pre-attach to the project",
  "project_value":  "number   (optional) — Project revenue value in ILS (admin-only field)"
}
```

**Example Request:**
```json
{
  "company_name":   "Acme Ltd.",
  "email":          "ceo@acme.com",
  "monday_item_id": "1234567890",
  "system_ids":     ["c2039595-4a4e-4e18-a3b7-311cc874b3d4"],
  "project_value":  15000
}
```

**Success Response `201`:**
```json
{
  "success":    true,
  "user_id":    "3a49f7ef-09bf-4c4c-9e15-f7899a900ef4",
  "client_id":  "17322f9e-0182-4ec7-894a-86c59787d848",
  "project_id": "a1810549-5704-4987-8e5a-bb2a175624c8"
}
```

> The client receives a `needs_password_change: true` flag — they will be prompted to set a password on first login.

---

### 2. Search Clients

**Action:** Find clients by Monday.com ID, email address, or company name.

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **URL** | `/api/v1/clients` |

**Query Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `monday_id` | string | optional | Exact match on `monday_item_id` |
| `email` | string | optional | Exact match on profile email |
| `company_name` | string | optional | Case-insensitive partial match |

**Example Request:**
```
GET /api/v1/clients?monday_id=1234567890
GET /api/v1/clients?company_name=acme
GET /api/v1/clients?email=ceo@acme.com
```

**Success Response `200`:**
```json
{
  "data": [
    {
      "id":             "17322f9e-0182-4ec7-894a-86c59787d848",
      "company_name":   "Acme Ltd.",
      "status":         "in_progress",
      "monday_item_id": "1234567890",
      "created_at":     "2026-03-05T10:00:00Z"
    }
  ]
}
```

---

### 3. Update Client

**Action:** Update client details or change onboarding status.

| Field | Value |
|-------|-------|
| **Method** | `PATCH` |
| **URL** | `/api/v1/clients/:id` |

**URL Parameter:** `id` — `uuid` of the client record.

**Request Body (all fields optional, at least one required):**

```json
{
  "company_name":   "string   (optional) — Updated company name",
  "status":         "string   (optional) — pending | in_progress | completed",
  "monday_item_id": "string   (optional) — Updated Monday.com item ID"
}
```

**Example Request:**
```json
{ "status": "completed" }
```

**Success Response `200`:**
```json
{
  "success": true,
  "data": {
    "id":             "17322f9e-0182-4ec7-894a-86c59787d848",
    "company_name":   "Acme Ltd.",
    "status":         "completed",
    "monday_item_id": "1234567890"
  }
}
```

---

## Freelancers

---

### 4. Create Freelancer

**Action:** Provision a new freelancer account.

| Field | Value |
|-------|-------|
| **Method** | `POST` |
| **URL** | `/api/v1/freelancers` |

**Request Body:**

```json
{
  "email":     "string   (REQUIRED) — Login email",
  "full_name": "string   (REQUIRED) — Full display name",
  "password":  "string   (optional, min 8 chars) — If omitted, user must set password on first login"
}
```

**Example Request:**
```json
{
  "email":     "dev@autoagency.io",
  "full_name": "ישראל ישראלי"
}
```

**Success Response `201`:**
```json
{
  "success":   true,
  "user_id":   "fc1f003b-6d50-4bcc-9212-02c72310773a",
  "email":     "dev@autoagency.io",
  "full_name": "ישראל ישראלי"
}
```

---

### 5. Search Freelancers

**Action:** Find freelancers by email or name.

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **URL** | `/api/v1/freelancers` |

**Query Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | optional | Partial match on email |
| `name` | string | optional | Partial match on full_name |

**Example Request:**
```
GET /api/v1/freelancers?name=ישראל
```

**Success Response `200`:**
```json
{
  "data": [
    {
      "id":         "fc1f003b-6d50-4bcc-9212-02c72310773a",
      "full_name":  "ישראל ישראלי",
      "email":      "dev@autoagency.io",
      "created_at": "2026-03-05T10:00:00Z"
    }
  ]
}
```

---

### 6. Update Freelancer

**Action:** Update freelancer profile or activate/deactivate portal access.

| Field | Value |
|-------|-------|
| **Method** | `PATCH` |
| **URL** | `/api/v1/freelancers/:id` |

**URL Parameter:** `id` — `uuid` of the freelancer (auth user ID).

**Request Body (all fields optional):**

```json
{
  "full_name": "string   (optional) — Updated name",
  "email":     "string   (optional) — Updated email",
  "active":    "boolean  (optional) — false = ban user (revoke access), true = unban"
}
```

**Example Request:**
```json
{ "active": false }
```

**Success Response `200`:**
```json
{
  "success": true,
  "data": {
    "id":        "fc1f003b-6d50-4bcc-9212-02c72310773a",
    "full_name": "ישראל ישראלי",
    "email":     "dev@autoagency.io",
    "role":      "freelancer"
  }
}
```

---

## Files

---

### 7. Upload Client File

**Action:** Upload a document (contract, quote, invoice, spec) directly to a client's project.

| Field | Value |
|-------|-------|
| **Method** | `POST` |
| **URL** | `/api/v1/clients/:id/files` |
| **Content-Type** | `multipart/form-data` |

**URL Parameter:** `id` — `uuid` of the client record.

**Form Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | **REQUIRED** | The file to upload (max 50 MB) |
| `file_type` | string | optional | `contract` \| `invoice` \| `quote` \| `spec` \| `other` (default: `other`) |
| `visible_to_freelancer` | string | optional | `"true"` or `"false"` (default: `"false"`) |

**Success Response `201`:**
```json
{
  "success": true,
  "data": {
    "id":          "d3a1f820-...",
    "file_name":   "contract-acme.pdf",
    "file_type":   "contract",
    "uploaded_at": "2026-03-05T10:00:00Z"
  }
}
```

---

### 8. Upload Freelancer File

**Action:** Upload a private administrative document to a freelancer's profile (NDA, work agreement). Not visible to clients.

| Field | Value |
|-------|-------|
| **Method** | `POST` |
| **URL** | `/api/v1/freelancers/:id/files` |
| **Content-Type** | `multipart/form-data` |

**URL Parameter:** `id` — `uuid` of the freelancer (auth user ID).

**Form Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | **REQUIRED** | The document to upload |
| `file_type` | string | optional | `nda` \| `contract` \| `other` (default: `other`) |

**Success Response `201`:**
```json
{
  "success": true,
  "data": {
    "id":          "a9c2e311-...",
    "file_name":   "nda-israel.pdf",
    "file_type":   "nda",
    "uploaded_at": "2026-03-05T10:00:00Z"
  }
}
```

---

## Projects

---

### 9. Attach Systems to Project

**Action:** Define (or replace) the list of systems a client must provide credentials for. Replaces the entire current list.

| Field | Value |
|-------|-------|
| **Method** | `PUT` |
| **URL** | `/api/v1/projects/:id/systems` |

**URL Parameter:** `id` — `uuid` of the project.

**Request Body:**

```json
{
  "system_ids": "uuid[]  (REQUIRED, min 1) — Ordered list of system UUIDs"
}
```

**Example Request:**
```json
{
  "system_ids": [
    "c2039595-4a4e-4e18-a3b7-311cc874b3d4",
    "a36d508e-bb14-4a3e-96ee-0e376b9021dc"
  ]
}
```

**Success Response `200`:**
```json
{
  "success":    true,
  "project_id": "a1810549-5704-4987-8e5a-bb2a175624c8",
  "system_ids": [
    "c2039595-4a4e-4e18-a3b7-311cc874b3d4",
    "a36d508e-bb14-4a3e-96ee-0e376b9021dc"
  ]
}
```

---

### 10. Assign Freelancer to Project & Set Payment

**Action:** Link a freelancer to a project and set their `payment_amount`. If an assignment already exists, it is updated (upsert).

| Field | Value |
|-------|-------|
| **Method** | `POST` |
| **URL** | `/api/v1/projects/:id/assign` |

**URL Parameter:** `id` — `uuid` of the project.

**Request Body:**

```json
{
  "freelancer_id":  "uuid    (REQUIRED) — The freelancer's auth user ID",
  "payment_amount": "number  (optional) — Payment in ILS (e.g. 2500)",
  "assigned_by":    "uuid    (optional) — Admin user ID performing the assignment"
}
```

**Example Request:**
```json
{
  "freelancer_id":  "fc1f003b-6d50-4bcc-9212-02c72310773a",
  "payment_amount": 3500
}
```

**Success Response `201`:**
```json
{
  "success": true,
  "data": {
    "id":             "e9a0f112-...",
    "project_id":     "a1810549-5704-4987-8e5a-bb2a175624c8",
    "freelancer_id":  "fc1f003b-6d50-4bcc-9212-02c72310773a",
    "payment_amount": 3500,
    "assigned_at":    "2026-03-05T10:00:00Z"
  }
}
```

---

### 11. Update Project Value

**Action:** Set or update the `project_value` (revenue) for a project. Visible to admins only — drives ROI dashboard.

| Field | Value |
|-------|-------|
| **Method** | `PATCH` |
| **URL** | `/api/v1/projects/:id/value` |

**URL Parameter:** `id` — `uuid` of the project.

**Request Body:**

```json
{
  "project_value": "number  (REQUIRED, min 0) — Revenue value in ILS"
}
```

**Example Request:**
```json
{ "project_value": 18000 }
```

**Success Response `200`:**
```json
{
  "success": true,
  "data": {
    "id":            "a1810549-5704-4987-8e5a-bb2a175624c8",
    "name":          "Acme Ltd. - קליטה",
    "project_value": 18000
  }
}
```

---

### 12. Get Project Onboarding Progress

**Action:** Retrieve the completion status and list of missing systems for a project. Designed for Make.com automations (e.g. send follow-up email when progress < 100%).

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **URL** | `/api/v1/projects/:id/progress` |

**URL Parameter:** `id` — `uuid` of the project.

**Success Response `200`:**
```json
{
  "project_id":   "a1810549-5704-4987-8e5a-bb2a175624c8",
  "project_name": "Acme Ltd. - קליטה",
  "company_name": "Acme Ltd.",
  "status":       "active",
  "progress": {
    "total":      3,
    "submitted":  1,
    "draft":      1,
    "pending":    1,
    "percentage": 33
  },
  "missing_systems": [
    { "system_id": "a36d508e-...", "system_name": "Facebook Ads" },
    { "system_id": "c36fbc30-...", "system_name": "Google Ads" }
  ],
  "is_complete": false
}
```

> **Make.com usage:** Poll this endpoint after a client session or on a schedule. If `is_complete` is `false`, trigger a reminder automation using `missing_systems` to personalise the message.

---

### 13. Deactivate Project / Client

**Action:** Instantly revoke portal access for the client and all assigned freelancers on a project. Sets project status to `on_hold` and bans the auth users.

| Field | Value |
|-------|-------|
| **Method** | `POST` |
| **URL** | `/api/v1/projects/:id/deactivate` |

**URL Parameter:** `id` — `uuid` of the project.

**Request Body:** None required.

**Success Response `200`:**
```json
{
  "success":            true,
  "project_id":         "a1810549-5704-4987-8e5a-bb2a175624c8",
  "client_banned":      true,
  "freelancers_banned": 1
}
```

> To re-activate, use `PATCH /api/v1/freelancers/:id` with `{ "active": true }` and update the project status via Supabase dashboard or a future `/api/v1/projects/:id/activate` endpoint.

---

## Error Reference

| HTTP Status | Meaning |
|-------------|---------|
| `400` | Bad request — malformed JSON or missing required fields |
| `401` | Unauthorized — missing or invalid `x-api-secret` |
| `404` | Resource not found |
| `422` | Validation error — response includes field-level detail |
| `500` | Internal server error — response includes Supabase error message |

---

## Make.com Integration Guide

### Recommended Webhook Header
Set `x-api-secret` as a custom HTTP header in every Make.com HTTP module, sourcing the value from a Make.com Connection or environment variable.

### Typical Automation Flows

| Trigger | Action | Endpoint |
|---------|--------|----------|
| New client signed in Monday.com | Create client + assign systems | `POST /api/v1/clients` |
| Client portal session ended | Check onboarding progress | `GET /api/v1/projects/:id/progress` |
| Progress < 100% after 24h | Send follow-up email with missing systems | `GET /api/v1/projects/:id/progress` |
| Project signed off | Set project value + mark completed | `PATCH /api/v1/projects/:id/value` + `PATCH /api/v1/clients/:id` |
| Freelancer assigned in Monday | Assign freelancer + set payment | `POST /api/v1/projects/:id/assign` |
| Contract dispute / cancellation | Deactivate project | `POST /api/v1/projects/:id/deactivate` |

---

## Security Notes

- `project_value` is fetched exclusively via `createServiceClient()` (service-role key) — never exposed through the authenticated client, ensuring clients and freelancers cannot see revenue figures.
- `payment_amount` is visible only to the assigned freelancer (via row-level security on `freelancer_assignments`) and to admins.
- Freelancer files (`/api/v1/freelancers/:id/files`) are stored in the `client-files` bucket under a `freelancers/` prefix and are protected by the `admins_all_on_freelancer_files` RLS policy — inaccessible to clients or freelancers.
