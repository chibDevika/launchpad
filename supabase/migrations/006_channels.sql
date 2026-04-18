-- Add channels array to applications
ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS channels text[] NOT NULL DEFAULT '{}';
