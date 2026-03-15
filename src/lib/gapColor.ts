/**
 * Goal-aware semantic color for calorie gap values.
 *
 * gap = plannedOrConsumed − target
 *   positive → surplus
 *   negative → deficit
 *
 * Colors use Tailwind semantic tokens only.
 */

type Goal = 'lose' | 'maintain' | 'gain';

export function gapTextColor(gap: number, goal: Goal): string {
  if (gap === 0) return 'text-muted-foreground';

  if (goal === 'gain') {
    // surplus is good (green/primary), deficit is bad (red/destructive)
    return gap > 0 ? 'text-primary' : 'text-destructive';
  }

  if (goal === 'lose') {
    // deficit is good (green/primary), surplus is bad (red/destructive)
    return gap < 0 ? 'text-primary' : 'text-destructive';
  }

  // maintain: near zero is neutral, otherwise warning
  return Math.abs(gap) <= 50 ? 'text-muted-foreground' : 'text-destructive';
}

export function gapBgColor(gap: number, goal: Goal): string {
  if (gap === 0) return 'bg-muted';

  if (goal === 'gain') {
    return gap > 0 ? 'bg-primary/8' : 'bg-destructive/10';
  }

  if (goal === 'lose') {
    return gap < 0 ? 'bg-primary/8' : 'bg-destructive/10';
  }

  return Math.abs(gap) <= 50 ? 'bg-muted' : 'bg-destructive/10';
}
