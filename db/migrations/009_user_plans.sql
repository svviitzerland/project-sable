-- Simulated subscription plans (no payment gateway). One plan per user, switched instantly.
-- plan: trial | lite | advokat | kantor | lembaga. Usage is metered from existing records, never billed.
BEGIN;
ALTER TABLE jude_users ADD COLUMN IF NOT EXISTS plan VARCHAR(20) NOT NULL DEFAULT 'trial';
ALTER TABLE jude_users ADD COLUMN IF NOT EXISTS plan_billing VARCHAR(10) NOT NULL DEFAULT 'yearly';
ALTER TABLE jude_users ADD COLUMN IF NOT EXISTS plan_accounts INTEGER NOT NULL DEFAULT 1;
ALTER TABLE jude_users ADD COLUMN IF NOT EXISTS plan_started_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE jude_users ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ DEFAULT (now() + interval '14 days');
DO $$ BEGIN
 ALTER TABLE jude_users ADD CONSTRAINT jude_users_plan_check CHECK (plan IN ('trial','lite','advokat','kantor','lembaga'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
 ALTER TABLE jude_users ADD CONSTRAINT jude_users_plan_billing_check CHECK (plan_billing IN ('monthly','yearly'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
COMMIT;
