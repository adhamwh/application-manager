-- Supabase Row Level Security (RLS) policies for Application Management
-- Run this in the SQL editor after deploying the schema.

-- 1) Make sure auth.users map to a 'profiles' table for easier access
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY,
  full_name text,
  email text,
  role text NOT NULL DEFAULT 'user', -- e.g. admin, agent, reviewer, user
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2) Enable RLS on tables we want protected
ALTER TABLE IF EXISTS applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS application_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS application_audit_logs ENABLE ROW LEVEL SECURITY;

-- 3) Define some helper functions
CREATE OR REPLACE FUNCTION is_admin() RETURNS boolean AS $$
  SELECT role = 'admin' FROM profiles WHERE id = auth.uid();
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION is_agent() RETURNS boolean AS $$
  SELECT role = 'agent' FROM profiles WHERE id = auth.uid();
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION is_reviewer() RETURNS boolean AS $$
  SELECT role = 'reviewer' FROM profiles WHERE id = auth.uid();
$$ LANGUAGE SQL STABLE;

-- 4) Policies for reading applications
-- Admins can read everything
CREATE POLICY "admins can read applications" ON applications
  FOR SELECT USING (is_admin());

-- Agents can read applications assigned to them
CREATE POLICY "agents can read their assigned applications" ON applications
  FOR SELECT USING (is_agent() AND agent_id = auth.uid());

-- Reviewers can read all submitted applications
CREATE POLICY "reviewers can read submitted applications" ON applications
  FOR SELECT USING (is_reviewer() AND status_id IN ('submitted', 'needs_docs', 'resubmitted'));

-- Applicants can read their own applications (if you track applicant_id against auth.uid())
CREATE POLICY "applicants can read theirs" ON applications
  FOR SELECT USING (applicant_id = auth.uid());

-- 5) Policies for updating applications
CREATE POLICY "admins can update" ON applications
  FOR UPDATE USING (is_admin());

CREATE POLICY "agents can update assigned applications" ON applications
  FOR UPDATE USING (is_agent() AND agent_id = auth.uid());

CREATE POLICY "reviewers can update status" ON applications
  FOR UPDATE USING (is_reviewer() AND status_id IN ('submitted', 'needs_docs', 'resubmitted'));

-- 6) Policies for inserting (creating) applications
CREATE POLICY "authenticated can insert" ON applications
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 7) Making sure documents and logs are protected similarly
CREATE POLICY "admins can manage docs" ON application_documents
  FOR ALL USING (is_admin());

CREATE POLICY "agents can read their apps docs" ON application_documents
  FOR SELECT USING (
    is_agent() AND EXISTS(
      SELECT 1 FROM applications WHERE applications.id = application_documents.application_id AND agent_id = auth.uid()
    )
  );

CREATE POLICY "admins can manage audit logs" ON application_audit_logs
  FOR ALL USING (is_admin());

-- NOTE: Review and adapt these policies to your real authorization model.
-- In Supabase, you might also want to use `auth.role()` and custom JWT claims.
