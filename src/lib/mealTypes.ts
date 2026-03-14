import { MealPlanItem, Recipe } from '@/data/types';

export const PLANNING_MEAL_TYPE_LABELS: Record<MealPlanItem['mealType'], string> = {
  breakfast: 'Petit déjeuner',
  lunch: 'Déjeuner',
  dinner: 'Dîner',
  snack: 'Collation',
};

export const PLANNING_MEAL_TYPE_LABELS_SHORT: Record<MealPlanItem['mealType'], string> = {
  breakfast: 'Petit déj.',
  lunch: 'Déjeuner',
  dinner: 'Dîner',
  snack: 'Collation',
};

export const PLANNING_MEAL_TYPE_ORDER: MealPlanItem['mealType'][] = ['breakfast', 'lunch', 'dinner', 'snack'];

export function getCompatibleMealTypesForRecipe(recipe: Recipe): MealPlanItem['mealType'][] {
  return [recipe.mealType];
}

export function isRecipeCompatibleWithMealType(recipe: Recipe, mealType: MealPlanItem['mealType']): boolean {
  return recipe.mealType === mealType;
}

export function filterRecipesByMealType(recipes: Recipe[], mealType: MealPlanItem['mealType']): Recipe[] {
  if (mealType === 'snack') return [];
  return recipes.filter(recipe => isRecipeCompatibleWithMealType(recipe, mealType));
}
