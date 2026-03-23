-- Minimal seed file so `supabase db reset` succeeds in local development.
-- Add deterministic local-only data here as the backend evolves.

INSERT INTO carriers (name, api_endpoint, metadata)
VALUES
  ('Atlas Assurance', 'https://api.atlas-assurance.test/resubmit', '{"tier":"gold","region":"US"}'::jsonb),
  ('Northwind Mutual', 'https://api.northwind-mutual.test/resubmit', '{"tier":"silver","region":"EU"}'::jsonb),
  ('Summit Risk', 'https://api.summit-risk.test/resubmit', '{"tier":"standard","region":"MENA"}'::jsonb)
ON CONFLICT (name) DO NOTHING;
