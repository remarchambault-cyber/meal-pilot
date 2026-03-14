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
  const types: MealPlanItem['mealType'][] = [recipe.mealType];
  // Snack-tagged recipes only go to snack; breakfast recipes can also be snacks
  if (recipe.mealType === 'breakfast') types.push('snack');
  return types;
}

export function isRecipeCompatibleWithMealType(recipe: Recipe, mealType: MealPlanItem['mealType']): boolean {
  if (mealType === 'snack') {
    // Snacks can use breakfast recipes or snack-tagged recipes
    return recipe.mealType === 'breakfast' || recipe.mealType === ('snack' as any);
  }
  return recipe.mealType === mealType;
}

export function filterRecipesByMealType(recipes: Recipe[], mealType: MealPlanItem['mealType']): Recipe[] {
  return recipes.filter(recipe => isRecipeCompatibleWithMealType(recipe, mealType));
}
