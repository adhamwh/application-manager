# AI Coding Agent Instructions for Admin Manager

## Project Overview
This is a Next.js 16 application for managing insurance applications with a Supabase backend. It provides APIs for listing/filtering applications, updating statuses, assigning agents, requesting documents, and exporting data.

## Architecture
- **Frontend**: Next.js App Router (pages in `app/` directory)
- **Backend**: API routes in `app/api/` using Next.js serverless functions
- **Database**: Supabase (Postgres) with tables for applications, agents, carriers, documents, and audit logs
- **Authentication**: Placeholder header-based (`x-user-id`) - replace with Supabase Auth + RLS in production

## Key Components
- `applications` table: Core entity with JSONB `data` field for flexible application details
- Status workflow: `draft` → `submitted` → `approved`/`rejected`/`needs_docs` → `resubmitted`
- Audit logging: All status changes and key actions logged in `application_audit_logs`
- Exports: Excel (exceljs) and PDF (pdfkit) generation for filtered application lists

## API Patterns
- All responses: `{ok: true, data?, error?, meta?}`
- Error handling: Return `{ok: false, error: string}` with appropriate HTTP status
- Authentication: Extract `userId` from `x-user-id` header for audit trails
- Status updates: Automatically set timestamps (`approved_at`, `rejected_at`) based on status
- Audit events: Insert into `application_audit_logs` for all mutations with `event_data` JSONB

## Database Schema Highlights
- Flexible `data` JSONB in applications for custom fields
- `requested_documents` JSONB array for document requirements
- Foreign keys: `status_id` (text), `agent_id`/`carrier_id` (uuid)
- Triggers: Auto-update `updated_at` on changes

## Development Workflow
- `npm run dev`: Start development server
- `npm run build`: Build for production
- Supabase setup: Run migrations (`supabase db push`) and policies from `supabase/` directory
- Environment: Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Code Conventions
- Imports: Use `@/lib/supabaseClient` for database access
- Types: Define request/response types inline or in separate files
- Error handling: Check Supabase errors and return consistent API responses
- File structure: API routes in `app/api/`, shared code in `lib/`, docs in `docs/`

## Common Patterns
- Filtering: Use Supabase query builders with `.eq()`, `.ilike()`, `.range()` for pagination
- Updates: Fetch existing data first for audit logs, then update
- Exports: Query with filters, then use exceljs/pdfkit to generate files
- Documents: Store metadata in `application_documents`, files in Supabase Storage

## Key Files
- `lib/supabaseClient.ts`: Supabase client initialization
- `supabase/migrations/001_initial.sql`: Database schema
- `supabase/policies.sql`: RLS policies (admin/agent/reviewer roles)
- `docs/api.md`: API reference with examples
- `app/api/applications/route.ts`: Main list/filter endpoint example</content>
<parameter name="filePath">d:\Desktop\admin-manager\admin-man\.github\copilot-instructions.md