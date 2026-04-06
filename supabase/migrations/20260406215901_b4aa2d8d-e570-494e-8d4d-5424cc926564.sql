ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS target_weight_kg REAL,
  ADD COLUMN IF NOT EXISTS onboarding_done BOOLEAN DEFAULT false;