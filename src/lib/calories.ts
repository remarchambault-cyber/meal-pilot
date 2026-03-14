import { UserProfile, CalorieTarget } from '@/data/types';

const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export function calculateCalorieTarget(profile: UserProfile): CalorieTarget {
  let bmr: number;
  if (profile.sex === 'male') {
    bmr = 10 * profile.weightKg + 6.25 * profile.heightCm - 5 * profile.age + 5;
  } else {
    bmr = 10 * profile.weightKg + 6.25 * profile.heightCm - 5 * profile.age - 161;
  }

  const tdee = Math.round(bmr * ACTIVITY_MULTIPLIERS[profile.activityLevel] + (profile.extraCaloriesBurned || 0));

  let target = tdee;
  const rate = profile.targetRate || 'moderate';
  const adjustments = { slow: 250, moderate: 400, fast: 600 };

  if (profile.goal === 'lose') {
    target = tdee - adjustments[rate];
  } else if (profile.goal === 'gain') {
    target = tdee + adjustments[rate];
  }

  return { bmr: Math.round(bmr), tdee, target: Math.round(target) };
}

/** Default calorie distribution percentages by meal type */
export const CALORIE_DISTRIBUTION: Record<string, number> = {
  breakfast: 0.25,
  lunch: 0.35,
  snack: 0.10,
  dinner: 0.30,
};

/** Get suggested calories per meal type for a given daily target */
export function getMealCalorieSuggestion(dailyTarget: number): Record<string, number> {
  return {
    breakfast: Math.round(dailyTarget * CALORIE_DISTRIBUTION.breakfast),
    lunch: Math.round(dailyTarget * CALORIE_DISTRIBUTION.lunch),
    snack: Math.round(dailyTarget * CALORIE_DISTRIBUTION.snack),
    dinner: Math.round(dailyTarget * CALORIE_DISTRIBUTION.dinner),
  };
}

export function getGoalLabel(goal: string): string {
  const labels: Record<string, string> = {
    lose: 'Perte de poids',
    maintain: 'Maintien',
    gain: 'Prise de poids',
  };
  return labels[goal] || goal;
}

export function getActivityLabel(level: string): string {
  const labels: Record<string, string> = {
    sedentary: 'Sédentaire',
    light: 'Légèrement actif',
    moderate: 'Modérément actif',
    active: 'Actif',
    very_active: 'Très actif',
  };
  return labels[level] || level;
}

export function getDietLabel(diet: string): string {
  const labels: Record<string, string> = {
    none: 'Sans restriction',
    vegetarian: 'Végétarien',
    vegan: 'Végan',
    pescatarian: 'Pescatarien',
    gluten_free: 'Sans gluten',
  };
  return labels[diet] || diet;
}
