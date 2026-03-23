# API Reference (Application Management)

This document describes the backend API endpoints provided by the Next.js application for managing insurance applications.

## Authentication

- Application endpoints now require a valid Supabase access token in:
  - `Authorization: Bearer <access-token>`
- The API resolves the acting user from the bearer token and authorizes requests using the caller's application role (`admin`, `reviewer`, `agent`) from `profiles`.
- Server-side route handlers use a service-role client for database access and enforce authorization in route code.
- `GET /api/health` remains unauthenticated for infrastructure checks.

### Role Behavior

- `admin`: full read/write access.
- `reviewer`: full read access and write access to application management operations.
- `agent`: read access to assigned applications only, plus write access to assigned applications only.

---

## 1) Health Check

- **GET** `/api/health`

Returns a simple status plus a sample row from `application_statuses`.

---

## 2) List / Filter Applications

- **GET** `/api/applications`

Requires authentication.

### Query Parameters

- `status` (string): filter by `status_id` (e.g. `submitted`, `approved`, `needs_docs`).
- `agentId` (uuid): filter by assigned agent.
- `search` (string): case-insensitive match against `applicant_name` and `applicant_email`.
- `page` (number): 1-based page index (default: 1).
- `pageSize` (number): number of records per page (default: 25).

### Response

```json
{
  "ok": true,
  "data": [ /* application rows */ ],
  "meta": { "page": 1, "pageSize": 25, "total": 123 }
}
```

---

## 3) Approve / Reject (Update Status)

- **PATCH** `/api/applications/{id}/status`

Requires authentication. Allowed for `admin`, `reviewer`, and the assigned `agent`.

### Body

```json
{
  "statusId": "approved", // or "rejected", "submitted", etc.
  "notes": "Optional reviewer notes",
  "requestedDocuments": ["id_card", "proof_of_income"]
}
```

This endpoint also creates an audit log entry.

---

## 4) Request Additional Documents

- **POST** `/api/applications/{id}/request-documents`

Requires authentication. Allowed for `admin`, `reviewer`, and the assigned `agent`.

### Body

```json
{
  "requiredDocuments": ["id_card", "bank_statement"],
  "message": "Please upload the missing documents."
}
```

This updates the application status to `needs_docs` and records an audit log.

---

## 5) Assign / Unassign Agent

- **PATCH** `/api/applications/{id}/assign`

Requires authentication. Allowed for `admin` and `reviewer`.

### Body

```json
{ "agentId": "<agent-uuid>" }
```

To unassign, pass `agentId` as `null`.

---

## 6) Resubmit to Carrier

- **POST** `/api/applications/{id}/resubmit`

Requires authentication. Allowed for `admin`, `reviewer`, and the assigned `agent`.

### Body

```json
{
  "carrierId": "<carrier-uuid>",
  "payload": { /* carrier-specific payload */ }
}
```

This endpoint updates the application status to `resubmitted` and logs the carrier response.

---

## 7) Export Applications

- **GET** `/api/applications/export?format=excel` (default)
- **GET** `/api/applications/export?format=pdf`

Requires authentication.

Supports the same query params as the list endpoint (e.g. `status`).

---

## Notes

- The backend uses Supabase for data storage.
- Schema is defined in `supabase/migrations/001_initial.sql`.
- Auth role storage is defined in `supabase/migrations/002_profiles.sql`.
- Policies are outlined in `supabase/policies.sql`.
