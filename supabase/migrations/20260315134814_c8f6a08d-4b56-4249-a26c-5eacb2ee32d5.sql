
-- Table weight_logs
CREATE TABLE public.weight_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date date NOT NULL,
  weight_kg numeric NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(profile_id, date)
);

ALTER TABLE public.weight_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own weight logs" ON public.weight_logs
  FOR SELECT TO authenticated
  USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert their own weight logs" ON public.weight_logs
  FOR INSERT TO authenticated
  WITH CHECK (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their own weight logs" ON public.weight_logs
  FOR UPDATE TO authenticated
  USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete their own weight logs" ON public.weight_logs
  FOR DELETE TO authenticated
  USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Table manual_calorie_logs
CREATE TABLE public.manual_calorie_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date date NOT NULL,
  consumed_manual_kcal integer NOT NULL DEFAULT 0,
  burned_extra_kcal integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(profile_id, date)
);

ALTER TABLE public.manual_calorie_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own calorie logs" ON public.manual_calorie_logs
  FOR SELECT TO authenticated
  USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert their own calorie logs" ON public.manual_calorie_logs
  FOR INSERT TO authenticated
  WITH CHECK (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their own calorie logs" ON public.manual_calorie_logs
  FOR UPDATE TO authenticated
  USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete their own calorie logs" ON public.manual_calorie_logs
  FOR DELETE TO authenticated
  USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Trigger for updated_at on weight_logs
CREATE TRIGGER update_weight_logs_updated_at
  BEFORE UPDATE ON public.weight_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for updated_at on manual_calorie_logs
CREATE TRIGGER update_manual_calorie_logs_updated_at
  BEFORE UPDATE ON public.manual_calorie_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
