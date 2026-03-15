
-- Table: recipes
CREATE TABLE public.recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  meal_type text NOT NULL DEFAULT 'lunch',
  prep_time_min integer NOT NULL DEFAULT 15,
  base_calories integer NOT NULL DEFAULT 0,
  base_protein_g numeric NOT NULL DEFAULT 0,
  base_carbs_g numeric NOT NULL DEFAULT 0,
  base_fats_g numeric NOT NULL DEFAULT 0,
  is_system_recipe boolean NOT NULL DEFAULT false,
  diet_tags text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Table: recipe_ingredients
CREATE TABLE public.recipe_ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  ingredient_name text NOT NULL,
  ingredient_normalized_name text NOT NULL DEFAULT '',
  quantity numeric NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'g',
  category text NOT NULL DEFAULT 'other'
);

-- Table: recipe_steps
CREATE TABLE public.recipe_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  step_order integer NOT NULL DEFAULT 0,
  step_text text NOT NULL DEFAULT ''
);

-- Table: planned_meals
CREATE TABLE public.planned_meals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date date NOT NULL,
  meal_type text NOT NULL DEFAULT 'lunch',
  recipe_id uuid NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  adjusted_calories integer,
  adjusted_protein_g numeric,
  adjusted_carbs_g numeric,
  adjusted_fats_g numeric,
  scaling_factor numeric NOT NULL DEFAULT 1,
  portions integer NOT NULL DEFAULT 1,
  is_batch boolean NOT NULL DEFAULT false,
  batch_group_id text,
  is_consumed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_recipes_owner ON public.recipes(owner_profile_id);
CREATE INDEX idx_recipe_ingredients_recipe ON public.recipe_ingredients(recipe_id);
CREATE INDEX idx_recipe_steps_recipe ON public.recipe_steps(recipe_id);
CREATE INDEX idx_planned_meals_profile_date ON public.planned_meals(profile_id, date);

-- Updated_at triggers
CREATE TRIGGER update_recipes_updated_at BEFORE UPDATE ON public.recipes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_planned_meals_updated_at BEFORE UPDATE ON public.planned_meals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planned_meals ENABLE ROW LEVEL SECURITY;

-- RLS for recipes: system recipes readable by all authenticated, user recipes by owner
CREATE POLICY "Anyone can read system recipes"
  ON public.recipes FOR SELECT TO authenticated
  USING (is_system_recipe = true);

CREATE POLICY "Users can read their own recipes"
  ON public.recipes FOR SELECT TO authenticated
  USING (owner_profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert their own recipes"
  ON public.recipes FOR INSERT TO authenticated
  WITH CHECK (owner_profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()) AND is_system_recipe = false);

CREATE POLICY "Users can update their own recipes"
  ON public.recipes FOR UPDATE TO authenticated
  USING (owner_profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()) AND is_system_recipe = false);

CREATE POLICY "Users can delete their own recipes"
  ON public.recipes FOR DELETE TO authenticated
  USING (owner_profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()) AND is_system_recipe = false);

-- RLS for recipe_ingredients: follow parent recipe access
CREATE POLICY "Read ingredients of accessible recipes"
  ON public.recipe_ingredients FOR SELECT TO authenticated
  USING (recipe_id IN (SELECT id FROM public.recipes WHERE is_system_recipe = true OR owner_profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())));

CREATE POLICY "Insert ingredients for own recipes"
  ON public.recipe_ingredients FOR INSERT TO authenticated
  WITH CHECK (recipe_id IN (SELECT id FROM public.recipes WHERE owner_profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()) AND is_system_recipe = false));

CREATE POLICY "Update ingredients for own recipes"
  ON public.recipe_ingredients FOR UPDATE TO authenticated
  USING (recipe_id IN (SELECT id FROM public.recipes WHERE owner_profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()) AND is_system_recipe = false));

CREATE POLICY "Delete ingredients for own recipes"
  ON public.recipe_ingredients FOR DELETE TO authenticated
  USING (recipe_id IN (SELECT id FROM public.recipes WHERE owner_profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()) AND is_system_recipe = false));

-- RLS for recipe_steps: follow parent recipe access
CREATE POLICY "Read steps of accessible recipes"
  ON public.recipe_steps FOR SELECT TO authenticated
  USING (recipe_id IN (SELECT id FROM public.recipes WHERE is_system_recipe = true OR owner_profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())));

CREATE POLICY "Insert steps for own recipes"
  ON public.recipe_steps FOR INSERT TO authenticated
  WITH CHECK (recipe_id IN (SELECT id FROM public.recipes WHERE owner_profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()) AND is_system_recipe = false));

CREATE POLICY "Update steps for own recipes"
  ON public.recipe_steps FOR UPDATE TO authenticated
  USING (recipe_id IN (SELECT id FROM public.recipes WHERE owner_profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()) AND is_system_recipe = false));

CREATE POLICY "Delete steps for own recipes"
  ON public.recipe_steps FOR DELETE TO authenticated
  USING (recipe_id IN (SELECT id FROM public.recipes WHERE owner_profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()) AND is_system_recipe = false));

-- RLS for planned_meals: owner only
CREATE POLICY "Users can read their own planned meals"
  ON public.planned_meals FOR SELECT TO authenticated
  USING (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert their own planned meals"
  ON public.planned_meals FOR INSERT TO authenticated
  WITH CHECK (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their own planned meals"
  ON public.planned_meals FOR UPDATE TO authenticated
  USING (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete their own planned meals"
  ON public.planned_meals FOR DELETE TO authenticated
  USING (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- Enable realtime for planned_meals
ALTER PUBLICATION supabase_realtime ADD TABLE public.planned_meals;
