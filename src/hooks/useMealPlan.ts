import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/hooks/useProfile';
import { MealPlanItem } from '@/data/types';

interface DbPlannedMeal {
  id: string;
  profile_id: string;
  date: string;
  meal_type: string;
  recipe_id: string;
  adjusted_calories: number | null;
  adjusted_protein_g: number | null;
  adjusted_carbs_g: number | null;
  adjusted_fats_g: number | null;
  scaling_factor: number;
  portions: number;
  is_batch: boolean;
  batch_group_id: string | null;
  is_consumed: boolean;
}

function dbToMealPlanItem(row: DbPlannedMeal): MealPlanItem {
  return {
    id: row.id,
    date: row.date,
    mealType: row.meal_type as MealPlanItem['mealType'],
    recipeId: row.recipe_id,
    isBatchCooking: row.is_batch,
    portions: row.portions,
    scaleFactor: Number(row.scaling_factor),
    consumed: row.is_consumed,
  };
}

export function useMealPlan() {
  const { dbProfile } = useProfile();
  const [mealPlan, setMealPlan] = useState<MealPlanItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMealPlan = useCallback(async () => {
    if (!dbProfile) { setLoading(false); return; }
    const { data, error } = await supabase
      .from('planned_meals')
      .select('*')
      .eq('profile_id', dbProfile.id)
      .order('date', { ascending: true });

    if (error) {
      console.error('Error fetching meal plan:', error);
      setMealPlan([]);
    } else {
      setMealPlan((data || []).map(d => dbToMealPlanItem(d as unknown as DbPlannedMeal)));
    }
    setLoading(false);
  }, [dbProfile]);

  useEffect(() => { fetchMealPlan(); }, [fetchMealPlan]);

  // Subscribe to realtime changes
  useEffect(() => {
    if (!dbProfile) return;
    const channel = supabase
      .channel('planned_meals_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'planned_meals',
        filter: `profile_id=eq.${dbProfile.id}`,
      }, () => {
        fetchMealPlan();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [dbProfile, fetchMealPlan]);

  const addMeals = useCallback(async (items: MealPlanItem[]) => {
    if (!dbProfile) throw new Error('No profile');

    const batchGroupId = items.length > 1 && items[0].isBatchCooking
      ? `batch_${Date.now()}`
      : null;

    const rows = items.map(item => ({
      profile_id: dbProfile.id,
      date: item.date,
      meal_type: item.mealType,
      recipe_id: item.recipeId,
      scaling_factor: item.scaleFactor || 1,
      portions: item.portions || 1,
      is_batch: item.isBatchCooking,
      batch_group_id: batchGroupId,
      is_consumed: false,
    }));

    const { error } = await supabase.from('planned_meals').insert(rows);
    if (error) throw error;
    await fetchMealPlan();
  }, [dbProfile, fetchMealPlan]);

  const removeMeal = useCallback(async (id: string) => {
    const { error } = await supabase.from('planned_meals').delete().eq('id', id);
    if (error) throw error;
    await fetchMealPlan();
  }, [fetchMealPlan]);

  const toggleConsumed = useCallback(async (id: string) => {
    const current = mealPlan.find(m => m.id === id);
    if (!current) return;
    const { error } = await supabase
      .from('planned_meals')
      .update({ is_consumed: !current.consumed })
      .eq('id', id);
    if (error) throw error;
    await fetchMealPlan();
  }, [mealPlan, fetchMealPlan]);

  const duplicateMeals = useCallback(async (source: MealPlanItem, targetDays: string[]) => {
    if (!dbProfile) throw new Error('No profile');
    const rows = targetDays.map(date => ({
      profile_id: dbProfile.id,
      date,
      meal_type: source.mealType,
      recipe_id: source.recipeId,
      scaling_factor: source.scaleFactor || 1,
      portions: source.portions || 1,
      is_batch: false,
      is_consumed: false,
    }));

    const { error } = await supabase.from('planned_meals').insert(rows);
    if (error) throw error;
    await fetchMealPlan();
  }, [dbProfile, fetchMealPlan]);

  return {
    mealPlan,
    loading,
    addMeals,
    removeMeal,
    toggleConsumed,
    duplicateMeals,
    refetch: fetchMealPlan,
  };
}
