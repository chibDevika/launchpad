-- Add ats_suggestions column to persist generated suggestions per application
alter table public.applications
  add column if not exists ats_suggestions jsonb;
