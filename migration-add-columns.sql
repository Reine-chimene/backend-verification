-- ==========================================
-- VYGC BACKEND - Database Migration
-- ==========================================
-- Run this in Supabase SQL Editor if you get:
-- "Could not find the 'approval_token' column of 'submissions'"
-- This adds missing columns to existing submissions table
-- ==========================================

-- Add approval_token column if missing
ALTER TABLE submissions 
ADD COLUMN IF NOT EXISTS approval_token VARCHAR(255);

-- Add reject_token column if missing
ALTER TABLE submissions 
ADD COLUMN IF NOT EXISTS reject_token VARCHAR(255);

-- Add ip_address column if missing
ALTER TABLE submissions 
ADD COLUMN IF NOT EXISTS ip_address INET;

-- Add user_agent column if missing
ALTER TABLE submissions 
ADD COLUMN IF NOT EXISTS user_agent TEXT;

-- Add metadata column if missing
ALTER TABLE submissions 
ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_submissions_approval_token ON submissions(approval_token);
CREATE INDEX IF NOT EXISTS idx_submissions_reject_token ON submissions(reject_token);
CREATE INDEX IF NOT EXISTS idx_submissions_ip_address ON submissions(ip_address);

-- Verify
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'submissions' 
ORDER BY ordinal_position;
