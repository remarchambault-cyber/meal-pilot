import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/hooks/useProfile';
import { Recipe, RecipeIngredient } from '@/data/types';
import { normalizeIngredientName } from '@/lib/ingredientNormalizer';

// Map DB row to app Recipe type
function dbToRecipe(
  row: any,
  ingredients: any[],
  steps: any[]
): Recipe {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    mealType: row.meal_type as Recipe['mealType'],
    calories: Number(row.base_calories),
    protein: Number(row.base_protein_g),
    carbs: Number(row.base_carbs_g),
    fat: Number(row.base_fats_g),
    prepTime: row.prep_time_min,
    ingredients: ingredients
      .sort((a, b) => a.ingredient_name.localeCompare(b.ingredient_name))
      .map(i => ({
        name: i.ingredient_name,
        quantity: Number(i.quantity),
        unit: i.unit,
        category: i.category as RecipeIngredient['category'],
      })),
    steps: steps
      .sort((a, b) => a.step_order - b.step_order)
      .map(s => s.step_text),
    dietTags: row.diet_tags || [],
  };
}

export function useRecipes() {
  const { dbProfile } = useProfile();
  const [allRecipes, setAllRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecipes = useCallback(async () => {
    setLoading(true);
    // Fetch all accessible recipes (system + user's own via RLS)
    const { data: recipes, error } = await supabase
      .from('recipes')
      .select('*');

    if (error || !recipes) {
      console.error('Error fetching recipes:', error);
      setAllRecipes([]);
      setLoading(false);
      return;
    }

    const recipeIds = recipes.map(r => r.id);

    // Fetch ingredients and steps in parallel
    const [ingredientsRes, stepsRes] = await Promise.all([
      supabase.from('recipe_ingredients').select('*').in('recipe_id', recipeIds),
      supabase.from('recipe_steps').select('*').in('recipe_id', recipeIds),
    ]);

    const ingredientsByRecipe: Record<string, any[]> = {};
    const stepsByRecipe: Record<string, any[]> = {};

    (ingredientsRes.data || []).forEach(i => {
      if (!ingredientsByRecipe[i.recipe_id]) ingredientsByRecipe[i.recipe_id] = [];
      ingredientsByRecipe[i.recipe_id].push(i);
    });

    (stepsRes.data || []).forEach(s => {
      if (!stepsByRecipe[s.recipe_id]) stepsByRecipe[s.recipe_id] = [];
      stepsByRecipe[s.recipe_id].push(s);
    });

    const mapped = recipes.map(r =>
      dbToRecipe(r, ingredientsByRecipe[r.id] || [], stepsByRecipe[r.id] || [])
    );

    setAllRecipes(mapped);
    setLoading(false);
  }, []);

  useEffect(() => { fetchRecipes(); }, [fetchRecipes]);

  // Separate system vs custom for compatibility
  const systemRecipes = useMemo(() => allRecipes.filter(r => {
    // System recipes have the known UUID pattern
    return r.id.startsWith('00000000-0000-0000-0000-');
  }), [allRecipes]);

  const customRecipes = useMemo(() => allRecipes.filter(r => {
    return !r.id.startsWith('00000000-0000-0000-0000-');
  }), [allRecipes]);

  const createRecipe = useCallback(async (recipe: Omit<Recipe, 'id'>) => {
    if (!dbProfile) throw new Error('No profile');

    const { data: recipeRow, error: recipeError } = await supabase
      .from('recipes')
      .insert({
        owner_profile_id: dbProfile.id,
        title: recipe.title,
        description: recipe.description,
        meal_type: recipe.mealType,
        prep_time_min: recipe.prepTime,
        base_calories: recipe.calories,
        base_protein_g: recipe.protein,
        base_carbs_g: recipe.carbs,
        base_fats_g: recipe.fat,
        is_system_recipe: false,
        diet_tags: recipe.dietTags,
      })
      .select()
      .single();

    if (recipeError || !recipeRow) throw recipeError;

    // Insert ingredients
    if (recipe.ingredients.length > 0) {
      const { error: ingError } = await supabase
        .from('recipe_ingredients')
        .insert(recipe.ingredients.map(ing => ({
          recipe_id: recipeRow.id,
          ingredient_name: ing.name,
          ingredient_normalized_name: normalizeIngredientName(ing.name),
          quantity: ing.quantity,
          unit: ing.unit,
          category: ing.category,
        })));
      if (ingError) throw ingError;
    }

    // Insert steps
    if (recipe.steps.length > 0) {
      const { error: stepError } = await supabase
        .from('recipe_steps')
        .insert(recipe.steps.map((text, i) => ({
          recipe_id: recipeRow.id,
          step_order: i + 1,
          step_text: text,
        })));
      if (stepError) throw stepError;
    }

    await fetchRecipes();
    return recipeRow.id;
  }, [dbProfile, fetchRecipes]);

  const updateRecipe = useCallback(async (id: string, recipe: Omit<Recipe, 'id'>) => {
    const { error: recipeError } = await supabase
      .from('recipes')
      .update({
        title: recipe.title,
        description: recipe.description,
        meal_type: recipe.mealType,
        prep_time_min: recipe.prepTime,
        base_calories: recipe.calories,
        base_protein_g: recipe.protein,
        base_carbs_g: recipe.carbs,
        base_fats_g: recipe.fat,
        diet_tags: recipe.dietTags,
      })
      .eq('id', id);

    if (recipeError) throw recipeError;

    // Replace ingredients: delete then re-insert
    await supabase.from('recipe_ingredients').delete().eq('recipe_id', id);
    if (recipe.ingredients.length > 0) {
      await supabase.from('recipe_ingredients').insert(
        recipe.ingredients.map(ing => ({
          recipe_id: id,
          ingredient_name: ing.name,
          ingredient_normalized_name: normalizeIngredientName(ing.name),
          quantity: ing.quantity,
          unit: ing.unit,
          category: ing.category,
        }))
      );
    }

    // Replace steps
    await supabase.from('recipe_steps').delete().eq('recipe_id', id);
    if (recipe.steps.length > 0) {
      await supabase.from('recipe_steps').insert(
        recipe.steps.map((text, i) => ({
          recipe_id: id,
          step_order: i + 1,
          step_text: text,
        }))
      );
    }

    await fetchRecipes();
  }, [fetchRecipes]);

  const deleteRecipe = useCallback(async (id: string) => {
    const { error } = await supabase.from('recipes').delete().eq('id', id);
    if (error) throw error;
    await fetchRecipes();
  }, [fetchRecipes]);

  return {
    allRecipes,
    systemRecipes,
    customRecipes,
    loading,
    createRecipe,
    updateRecipe,
    deleteRecipe,
    refetch: fetchRecipes,
  };
}
