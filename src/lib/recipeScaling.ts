import { Recipe, RecipeIngredient } from '@/data/types';

const MIN_SCALE = 0.5;
const MAX_SCALE = 3.0;

/** Compute a scale factor to match a calorie target, clamped to reasonable bounds */
export function getScaleFactor(recipeCalories: number, targetCalories: number): number {
  if (!recipeCalories || !targetCalories) return 1;
  const raw = targetCalories / recipeCalories;
  return Math.round(Math.min(MAX_SCALE, Math.max(MIN_SCALE, raw)) * 100) / 100;
}

export interface ScaledRecipe {
  original: Recipe;
  scaleFactor: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  ingredients: ScaledIngredient[];
  isScaled: boolean;
}

export interface ScaledIngredient extends RecipeIngredient {
  scaledQuantity: number;
}

/** Apply a scale factor to a recipe's nutritional values and ingredient quantities */
export function scaleRecipe(recipe: Recipe, scaleFactor: number): ScaledRecipe {
  const sf = scaleFactor || 1;
  const isScaled = Math.abs(sf - 1) > 0.01;

  return {
    original: recipe,
    scaleFactor: sf,
    calories: Math.round(recipe.calories * sf),
    protein: Math.round(recipe.protein * sf),
    carbs: Math.round(recipe.carbs * sf),
    fat: Math.round(recipe.fat * sf),
    ingredients: recipe.ingredients.map(ing => ({
      ...ing,
      scaledQuantity: Math.round(ing.quantity * sf * 10) / 10,
    })),
    isScaled,
  };
}

/** Get scale factor for a recipe given a meal-type calorie target */
export function getScaleFactorForMealType(
  recipe: Recipe,
  mealTargets: Record<string, number> | null
): number {
  if (!mealTargets) return 1;
  const target = mealTargets[recipe.mealType];
  if (!target) return 1;
  return getScaleFactor(recipe.calories, target);
}
