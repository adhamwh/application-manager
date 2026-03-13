-- Initial schema for Application Management (Supabase + Postgres)
-- Run via `supabase db push` or via SQL runner in Supabase.

-- 1) Core entities

-- List of application statuses (e.g. draft, submitted, approved, rejected, needs_docs, resubmitted)
CREATE TABLE IF NOT EXISTS application_statuses (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  "order" INT NOT NULL DEFAULT 100
);

-- Seed common statuses
INSERT INTO application_statuses (id, label, "order")
VALUES
  ('draft', 'Draft', 10),
  ('submitted', 'Submitted', 20),
  ('needs_docs', 'Needs Documents', 30),
  ('approved', 'Approved', 40),
  ('rejected', 'Rejected', 50),
  ('resubmitted', 'Resubmitted', 60)
ON CONFLICT (id) DO NOTHING;

-- Agents who can be assigned to applications
CREATE TABLE IF NOT EXISTS agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Carriers (for resubmission)
CREATE TABLE IF NOT EXISTS carriers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  api_endpoint TEXT,
  metadata JSONB,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Applications
CREATE TABLE IF NOT EXISTS applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_id uuid NULL,
  applicant_email TEXT NULL,
  applicant_name TEXT NULL,

  status_id TEXT NOT NULL REFERENCES application_statuses(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  agent_id uuid NULL REFERENCES agents(id) ON UPDATE CASCADE ON DELETE SET NULL,
  carrier_id uuid NULL REFERENCES carriers(id) ON UPDATE CASCADE ON DELETE SET NULL,

  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  requested_documents JSONB DEFAULT '[]'::jsonb,

  submitted_at timestamptz,
  approved_at timestamptz,
  rejected_at timestamptz,
  last_resubmitted_at timestamptz,

  created_by uuid NULL,
  updated_by uuid NULL,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Application documents (uploads) - stores metadata / storage references
CREATE TABLE IF NOT EXISTS application_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  storage_key TEXT NOT NULL,
  file_name TEXT,
  mime_type TEXT,
  size_bytes bigint,
  uploaded_by uuid,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Audit log for changes (status changes, assignment changes, resubmissions, document requests)
CREATE TABLE IF NOT EXISTS application_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}'::jsonb,
  performed_by uuid NULL,
  performed_at timestamptz NOT NULL DEFAULT now()
);

-- Trigger helpers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER applications_updated_at
BEFORE UPDATE ON applications
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER agents_updated_at
BEFORE UPDATE ON agents
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER carriers_updated_at
BEFORE UPDATE ON carriers
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER application_documents_updated_at
BEFORE UPDATE ON application_documents
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();
