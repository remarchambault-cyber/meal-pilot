export interface UserProfile {
  firstName: string;
  age: number;
  sex: 'male' | 'female';
  heightCm: number;
  weightKg: number;
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  goal: 'lose' | 'maintain' | 'gain';
  targetRate?: 'slow' | 'moderate' | 'fast';
  dietPreference: 'none' | 'vegetarian' | 'vegan' | 'pescatarian' | 'gluten_free';
  extraCaloriesBurned: number;
}

export interface Recipe {
  id: string;
  title: string;
  description: string;
  mealType: 'breakfast' | 'lunch' | 'dinner';
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  prepTime: number;
  ingredients: RecipeIngredient[];
  steps: string[];
  dietTags: string[];
}

export interface RecipeIngredient {
  name: string;
  quantity: number;
  unit: string;
  category: 'protein' | 'carbs' | 'vegetables' | 'dairy' | 'fruits' | 'condiments' | 'other';
}

export interface MealPlanItem {
  id: string;
  date: string; // YYYY-MM-DD
  mealType: 'breakfast' | 'lunch' | 'dinner';
  recipeId: string;
  isBatchCooking: boolean;
}

export interface WeightLog {
  id: string;
  date: string;
  weight: number;
}

export interface CalorieLog {
  id: string;
  date: string;
  caloriesConsumed: number;
  caloriesBurned: number;
}

export interface CalorieTarget {
  bmr: number;
  tdee: number;
  target: number;
}
