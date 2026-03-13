import { useState, useMemo } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { UserProfile, WeightLog, CalorieLog, MealPlanItem, Recipe } from '@/data/types';
import { calculateCalorieTarget } from '@/lib/calories';
import { mockRecipes } from '@/data/recipes';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { Plus, Lightbulb, TrendingUp, TrendingDown, Minus, Flame, Target, BarChart3, Scale } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function Tracking() {
  const [profile] = useLocalStorage<UserProfile | null>('mealpilot_profile', null);
  const [weightLogs, setWeightLogs] = useLocalStorage<WeightLog[]>('mealpilot_weight', []);
  const [calorieLogs, setCalorieLogs] = useLocalStorage<CalorieLog[]>('mealpilot_calories', []);
  const [mealPlan] = useLocalStorage<MealPlanItem[]>('mealpilot_mealplan', []);
  const [customRecipes] = useLocalStorage<Recipe[]>('mealpilot_custom_recipes', []);

  const [newWeight, setNewWeight] = useState('');
  const [newCalConsumed, setNewCalConsumed] = useState('');
  const [newCalBurned, setNewCalBurned] = useState('');

  const allRecipes = useMemo(() => [...mockRecipes, ...customRecipes], [customRecipes]);
  const target = useMemo(() => profile ? calculateCalorieTarget(profile) : null, [profile]);

  const today = new Date().toISOString().slice(0, 10);

  // Auto-calculated planned calories from planning
  const plannedCalories = useMemo(() => {
    const todayMeals = mealPlan.filter(m => m.date === today);
    return todayMeals.reduce((sum, m) => {
      const recipe = allRecipes.find(r => r.id === m.recipeId);
      return sum + (recipe ? recipe.calories * (m.portions || 1) : 0);
    }, 0);
  }, [mealPlan, today, allRecipes]);

  // List of today's planned meals for display
  const todayMealDetails = useMemo(() => {
    return mealPlan
      .filter(m => m.date === today)
      .map(m => {
        const recipe = allRecipes.find(r => r.id === m.recipeId);
        return recipe ? { name: recipe.title, calories: recipe.calories * (m.portions || 1) } : null;
      })
      .filter(Boolean) as { name: string; calories: number }[];
  }, [mealPlan, today, allRecipes]);

  const todayCalories = calorieLogs.find(l => l.date === today);
  const consumed = todayCalories?.caloriesConsumed || 0;
  const ecart = consumed - plannedCalories;

  const addWeight = () => {
    if (!newWeight) return;
    const log: WeightLog = { id: `w_${Date.now()}`, date: today, weight: parseFloat(newWeight) };
    setWeightLogs(prev => [...prev.filter(l => l.date !== today), log]);
    setNewWeight('');
    toast({ title: '✅ Poids enregistré', description: `${log.weight} kg` });
  };

  const addCalories = () => {
    if (!newCalConsumed && !newCalBurned) return;
    const log: CalorieLog = {
      id: `c_${Date.now()}`,
      date: today,
      caloriesConsumed: parseInt(newCalConsumed) || 0,
      caloriesBurned: parseInt(newCalBurned) || 0,
    };
    setCalorieLogs(prev => [...prev.filter(l => l.date !== today), log]);
    setNewCalConsumed('');
    setNewCalBurned('');
    toast({ title: '✅ Calories enregistrées' });
  };

  // Advice logic
  const advice = useMemo(() => {
    if (!profile || weightLogs.length < 2) return null;
    const sorted = [...weightLogs].sort((a, b) => a.date.localeCompare(b.date));
    const recent = sorted.slice(-7);
    if (recent.length < 2) return null;
    const delta = recent[recent.length - 1].weight - recent[0].weight;
    const days = Math.max(1, recent.length - 1);
    const weeklyChange = (delta / days) * 7;

    if (profile.goal === 'lose') {
      if (weeklyChange > 0.1) return { type: 'warning' as const, icon: '⚠️', text: 'Ton poids augmente malgré un objectif de perte. Vérifie ton apport calorique et essaie de rester proche de ta cible.' };
      if (weeklyChange < -1) return { type: 'warning' as const, icon: '⚡', text: 'Ta perte est un peu rapide (> 1 kg/semaine). Pense à réduire légèrement le déficit pour préserver ta masse musculaire.' };
      if (weeklyChange < -0.1) return { type: 'success' as const, icon: '✅', text: 'Tu es sur la bonne voie ! Ta perte de poids est régulière et raisonnable.' };
      return { type: 'info' as const, icon: '💡', text: 'Ton poids est stable. Essaie de réduire légèrement tes calories (100-200 kcal) ou d\'augmenter ton activité.' };
    }
    if (profile.goal === 'gain') {
      if (weeklyChange < -0.1) return { type: 'warning' as const, icon: '⚠️', text: 'Ton poids baisse malgré un objectif de prise. Augmente tes apports de 200-300 kcal par jour.' };
      if (weeklyChange > 1) return { type: 'warning' as const, icon: '⚡', text: 'Ta prise est rapide (> 1 kg/semaine). Ralentis un peu pour privilégier le muscle sur le gras.' };
      if (weeklyChange > 0.1) return { type: 'success' as const, icon: '✅', text: 'Bonne progression ! Ta prise de poids est régulière.' };
      return { type: 'info' as const, icon: '💡', text: 'Ton poids stagne. Ajoute 100-200 kcal par jour pour relancer la prise.' };
    }
    // maintain
    if (Math.abs(weeklyChange) > 0.5) return { type: 'info' as const, icon: '💡', text: `Ton poids ${weeklyChange > 0 ? 'augmente' : 'diminue'} sensiblement. Ajuste tes apports pour te stabiliser.` };
    return { type: 'success' as const, icon: '✅', text: 'Ton poids est stable. Continue comme ça !' };
  }, [profile, weightLogs]);

  // Trend
  const trend = useMemo(() => {
    if (weightLogs.length < 2) return null;
    const sorted = [...weightLogs].sort((a, b) => a.date.localeCompare(b.date));
    const last = sorted[sorted.length - 1].weight;
    const prev = sorted[sorted.length - 2].weight;
    const diff = last - prev;
    if (Math.abs(diff) < 0.05) return { direction: 'stable' as const, diff: 0 };
    return { direction: diff > 0 ? 'up' as const : 'down' as const, diff };
  }, [weightLogs]);

  const chartData = useMemo(() => {
    return [...weightLogs]
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30)
      .map(l => ({ date: l.date.slice(5), poids: l.weight }));
  }, [weightLogs]);

  const cardVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.35 } }),
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-display font-bold">Suivi</h1>

        {/* Planned vs consumed calories */}
        <div className="grid grid-cols-3 gap-3">
          <motion.div custom={0} variants={cardVariants} initial="hidden" animate="visible" className="card-elevated p-4 text-center">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-2">
              <Target className="w-4 h-4 text-primary" />
            </div>
            <p className="font-display font-bold text-lg">{plannedCalories}</p>
            <p className="text-xs text-muted-foreground">Prévues</p>
          </motion.div>
          <motion.div custom={1} variants={cardVariants} initial="hidden" animate="visible" className="card-elevated p-4 text-center">
            <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center mx-auto mb-2">
              <Flame className="w-4 h-4 text-accent" />
            </div>
            <p className="font-display font-bold text-lg">{consumed}</p>
            <p className="text-xs text-muted-foreground">Consommées</p>
          </motion.div>
          <motion.div custom={2} variants={cardVariants} initial="hidden" animate="visible" className="card-elevated p-4 text-center">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-2 ${ecart > 0 ? 'bg-destructive/10' : ecart < 0 ? 'bg-secondary/10' : 'bg-muted'}`}>
              <BarChart3 className={`w-4 h-4 ${ecart > 0 ? 'text-destructive' : ecart < 0 ? 'text-secondary' : 'text-muted-foreground'}`} />
            </div>
            <p className={`font-display font-bold text-lg ${ecart > 0 ? 'text-destructive' : ecart < 0 ? 'text-secondary' : ''}`}>
              {ecart > 0 ? '+' : ''}{ecart}
            </p>
            <p className="text-xs text-muted-foreground">Écart</p>
          </motion.div>
        </div>

        {/* Today's planned meals detail */}
        {todayMealDetails.length > 0 && (
          <motion.div custom={3} variants={cardVariants} initial="hidden" animate="visible" className="card-elevated p-4">
            <h2 className="font-display font-semibold text-sm mb-2">Repas prévus aujourd'hui</h2>
            <div className="space-y-1">
              {todayMealDetails.map((meal, i) => (
                <div key={i} className="flex justify-between text-sm py-1 border-b border-border last:border-0">
                  <span>{meal.name}</span>
                  <span className="text-muted-foreground">{meal.calories} kcal</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {plannedCalories === 0 && (
          <motion.div custom={3} variants={cardVariants} initial="hidden" animate="visible" className="card-elevated p-4 text-center text-sm text-muted-foreground">
            Aucun repas planifié aujourd'hui. Ajoute des repas au planning pour voir tes calories prévues.
          </motion.div>
        )}

        {/* Trend */}
        {trend && (
          <motion.div custom={4} variants={cardVariants} initial="hidden" animate="visible" className="card-elevated p-4 flex items-center gap-3">
            {trend.direction === 'up' && <TrendingUp className="w-5 h-5 text-accent" />}
            {trend.direction === 'down' && <TrendingDown className="w-5 h-5 text-secondary" />}
            {trend.direction === 'stable' && <Minus className="w-5 h-5 text-muted-foreground" />}
            <div>
              <p className="text-sm font-medium">
                {trend.direction === 'up' && `En hausse (+${Math.abs(trend.diff).toFixed(1)} kg)`}
                {trend.direction === 'down' && `En baisse (${trend.diff.toFixed(1)} kg)`}
                {trend.direction === 'stable' && 'Poids stable'}
              </p>
              <p className="text-xs text-muted-foreground">Tendance récente</p>
            </div>
          </motion.div>
        )}

        {/* Advice */}
        {advice && (
          <motion.div
            custom={5}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            className={`card-elevated p-4 border-l-4 ${
              advice.type === 'warning' ? 'border-l-accent' : advice.type === 'success' ? 'border-l-secondary' : 'border-l-primary'
            }`}
          >
            <div className="flex gap-3">
              <Lightbulb className={`w-5 h-5 shrink-0 mt-0.5 ${
                advice.type === 'warning' ? 'text-accent' : advice.type === 'success' ? 'text-secondary' : 'text-primary'
              }`} />
              <div>
                <h3 className="font-display font-semibold text-sm">Conseil {advice.icon}</h3>
                <p className="text-sm text-body-text mt-1">{advice.text}</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Weight entry */}
        <motion.div custom={6} variants={cardVariants} initial="hidden" animate="visible" className="card-elevated p-4 space-y-3">
          <h2 className="font-display font-semibold text-sm flex items-center gap-2">
            <Scale className="w-4 h-4 text-primary" /> Enregistrer le poids
          </h2>
          <div className="flex gap-2">
            <Input
              type="number"
              step="0.1"
              placeholder="Ex: 72.5"
              value={newWeight}
              onChange={e => setNewWeight(e.target.value)}
              className="flex-1"
            />
            <Button className="gap-1.5 tap-scale" onClick={addWeight}>
              <Plus className="w-4 h-4" /> Enregistrer
            </Button>
          </div>
        </motion.div>

        {/* Weight chart */}
        {chartData.length > 1 && (
          <motion.div custom={7} variants={cardVariants} initial="hidden" animate="visible" className="card-elevated p-4">
            <h2 className="font-display font-semibold text-sm mb-3">Évolution du poids</h2>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <RechartsTooltip
                  contentStyle={{ borderRadius: '0.75rem', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}
                />
                <Line type="monotone" dataKey="poids" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3, fill: 'hsl(var(--primary))' }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>
        )}

        {/* Calories entry */}
        <motion.div custom={8} variants={cardVariants} initial="hidden" animate="visible" className="card-elevated p-4 space-y-3">
          <h2 className="font-display font-semibold text-sm flex items-center gap-2">
            <Flame className="w-4 h-4 text-accent" /> Calories du jour
          </h2>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Consommées</Label>
              <Input type="number" placeholder="kcal" value={newCalConsumed} onChange={e => setNewCalConsumed(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Dépensées (extra)</Label>
              <Input type="number" placeholder="kcal" value={newCalBurned} onChange={e => setNewCalBurned(e.target.value)} />
            </div>
          </div>
          <Button className="w-full gap-1.5 tap-scale" variant="outline" onClick={addCalories}>
            <Plus className="w-4 h-4" /> Enregistrer
          </Button>
          {target && (
            <p className="text-xs text-muted-foreground text-center">
              Cible : {target.target} kcal/jour
            </p>
          )}
        </motion.div>

        {/* History */}
        {weightLogs.length > 0 && (
          <motion.div custom={9} variants={cardVariants} initial="hidden" animate="visible" className="card-elevated p-4">
            <h2 className="font-display font-semibold text-sm mb-3">Historique des pesées</h2>
            <div className="space-y-1">
              {[...weightLogs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10).map((log, i) => {
                const prevLog = weightLogs.sort((a, b) => a.date.localeCompare(b.date))[
                  weightLogs.sort((a, b) => a.date.localeCompare(b.date)).findIndex(l => l.id === log.id) - 1
                ];
                const diff = prevLog ? log.weight - prevLog.weight : null;
                return (
                  <div key={log.id} className="flex justify-between items-center text-sm py-2 border-b border-border last:border-0">
                    <span className="text-muted-foreground">
                      {format(new Date(log.date + 'T12:00:00'), 'd MMM yyyy', { locale: fr })}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{log.weight} kg</span>
                      {diff !== null && Math.abs(diff) >= 0.05 && (
                        <span className={`text-xs ${diff > 0 ? 'text-accent' : 'text-secondary'}`}>
                          {diff > 0 ? '+' : ''}{diff.toFixed(1)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </div>
    </AppLayout>
  );
}
