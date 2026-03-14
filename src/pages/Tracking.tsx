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
import { Plus, Lightbulb, TrendingUp, TrendingDown, Minus, Flame, Target, Scale, CalendarCheck, Utensils, CheckCircle2, ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { motion } from 'framer-motion';
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
  const today = format(new Date(), 'yyyy-MM-dd');

  const sortedWeightLogsAsc = useMemo(
    () => [...weightLogs].sort((a, b) => a.date.localeCompare(b.date)),
    [weightLogs]
  );

  const recentWeightLogsDesc = useMemo(
    () => [...sortedWeightLogsAsc].reverse().slice(0, 10),
    [sortedWeightLogsAsc]
  );

  const weightDiffByLogId = useMemo(() => {
    const map: Record<string, number | null> = {};
    sortedWeightLogsAsc.forEach((log, index) => {
      const prev = sortedWeightLogsAsc[index - 1];
      map[log.id] = prev ? log.weight - prev.weight : null;
    });
    return map;
  }, [sortedWeightLogsAsc]);

  const plannedCalories = useMemo(() => {
    const todayMeals = mealPlan.filter(m => m.date === today);
    return todayMeals.reduce((sum, m) => {
      const recipe = allRecipes.find(r => r.id === m.recipeId);
      const sf = m.scaleFactor || 1;
      return sum + (recipe ? Math.round(recipe.calories * sf) * (m.portions || 1) : 0);
    }, 0);
  }, [mealPlan, today, allRecipes]);

  const consumedFromMeals = useMemo(() => {
    const todayConsumed = mealPlan.filter(m => m.date === today && m.consumed);
    return todayConsumed.reduce((sum, m) => {
      const recipe = allRecipes.find(r => r.id === m.recipeId);
      const sf = m.scaleFactor || 1;
      return sum + (recipe ? Math.round(recipe.calories * sf) * (m.portions || 1) : 0);
    }, 0);
  }, [mealPlan, today, allRecipes]);

  const todayMealDetails = useMemo(() => {
    return mealPlan
      .filter(m => m.date === today)
      .map(m => {
        const recipe = allRecipes.find(r => r.id === m.recipeId);
        const sf = m.scaleFactor || 1;
        return recipe ? {
          name: recipe.title,
          calories: Math.round(recipe.calories * sf) * (m.portions || 1),
          mealType: m.mealType,
          consumed: !!m.consumed,
        } : null;
      })
      .filter(Boolean) as { name: string; calories: number; mealType: MealPlanItem['mealType']; consumed: boolean }[];
  }, [mealPlan, today, allRecipes]);

  const todayCalorieLog = calorieLogs.find(l => l.date === today);
  const manualConsumed = todayCalorieLog?.caloriesConsumed || 0;
  const extraBurned = todayCalorieLog?.caloriesBurned || 0;
  const consumed = consumedFromMeals + manualConsumed;
  const netConsumed = consumed - extraBurned;
  const dailyTarget = target?.target || 0;

  // Two distinct gaps
  const ecartPlanifie = plannedCalories - dailyTarget;
  const ecartConsomme = netConsumed - dailyTarget;

  const todayWeightLog = weightLogs.find(l => l.date === today);

  const addWeight = () => {
    if (!newWeight) return;
    const isUpdate = !!todayWeightLog;
    const log: WeightLog = { id: `w_${Date.now()}`, date: today, weight: parseFloat(newWeight), updatedAt: new Date().toISOString() };
    setWeightLogs(prev => [...prev.filter(l => l.date !== today), log]);
    setNewWeight('');
    toast({
      title: isUpdate ? '🔄 Pesée du jour mise à jour' : '✅ Poids enregistré',
      description: `${log.weight} kg`,
    });
  };

  const addCalories = () => {
    if (!newCalConsumed && !newCalBurned) return;
    const isUpdate = !!todayCalorieLog;
    const log: CalorieLog = {
      id: todayCalorieLog?.id || `c_${Date.now()}`,
      date: today,
      caloriesConsumed: parseInt(newCalConsumed, 10) || 0,
      caloriesBurned: parseInt(newCalBurned, 10) || 0,
    };
    setCalorieLogs(prev => [...prev.filter(l => l.date !== today), log]);
    setNewCalConsumed('');
    setNewCalBurned('');
    toast({ title: isUpdate ? '🔄 Calories du jour mises à jour' : '✅ Calories enregistrées' });
  };

  const resetCalories = () => {
    setCalorieLogs(prev => prev.filter(l => l.date !== today));
    setNewCalConsumed('');
    setNewCalBurned('');
    toast({ title: '🗑️ Calories manuelles du jour réinitialisées' });
  };

  const advice = useMemo(() => {
    if (!profile || sortedWeightLogsAsc.length < 2) return null;
    const recent = sortedWeightLogsAsc.slice(-7);
    if (recent.length < 2) return null;
    const delta = recent[recent.length - 1].weight - recent[0].weight;
    const days = Math.max(1, recent.length - 1);
    const weeklyChange = (delta / days) * 7;

    if (profile.goal === 'lose') {
      if (weeklyChange > 0.1) return { type: 'warning' as const, icon: '⚠️', text: 'Ton poids augmente malgré un objectif de perte. Vérifie ton apport calorique.' };
      if (weeklyChange < -1) return { type: 'warning' as const, icon: '⚡', text: 'Perte rapide (> 1 kg/semaine). Réduis le déficit pour plus de durabilité.' };
      if (weeklyChange < -0.1) return { type: 'success' as const, icon: '✅', text: 'Bonne trajectoire : perte de poids régulière.' };
      return { type: 'info' as const, icon: '💡', text: 'Poids stable. Réduis légèrement les calories ou augmente l\'activité.' };
    }
    if (profile.goal === 'gain') {
      if (weeklyChange < -0.1) return { type: 'warning' as const, icon: '⚠️', text: 'Le poids baisse malgré l\'objectif de prise. Ajoute ~200 kcal/jour.' };
      if (weeklyChange > 1) return { type: 'warning' as const, icon: '⚡', text: 'Prise rapide (> 1 kg/semaine). Ralentis les apports.' };
      if (weeklyChange > 0.1) return { type: 'success' as const, icon: '✅', text: 'Progression cohérente pour la prise de poids.' };
      return { type: 'info' as const, icon: '💡', text: 'Poids stable. Augmente légèrement les apports.' };
    }
    if (Math.abs(weeklyChange) > 0.5) return { type: 'info' as const, icon: '💡', text: `Variation notable (${weeklyChange > 0 ? '+' : ''}${weeklyChange.toFixed(1)} kg/sem). Ajuste les apports.` };
    return { type: 'success' as const, icon: '✅', text: 'Poids globalement stable, bon maintien.' };
  }, [profile, sortedWeightLogsAsc]);

  const trend = useMemo(() => {
    if (sortedWeightLogsAsc.length < 2) return null;
    const last = sortedWeightLogsAsc[sortedWeightLogsAsc.length - 1].weight;
    const prev = sortedWeightLogsAsc[sortedWeightLogsAsc.length - 2].weight;
    const diff = last - prev;
    if (Math.abs(diff) < 0.05) return { direction: 'stable' as const, diff: 0 };
    return { direction: diff > 0 ? 'up' as const : 'down' as const, diff };
  }, [sortedWeightLogsAsc]);

  const chartData = useMemo(() => {
    return sortedWeightLogsAsc.slice(-30).map(log => ({ date: log.date.slice(5), poids: log.weight }));
  }, [sortedWeightLogsAsc]);

  const [detailsOpen, setDetailsOpen] = useState(false);

  const cardVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.35 } }),
  };

  const gapColor = (val: number) =>
    val > 0 ? 'text-secondary' : val < 0 ? 'text-destructive' : 'text-muted-foreground';
  const gapBg = (val: number) =>
    val > 0 ? 'bg-secondary/10' : val < 0 ? 'bg-destructive/10' : 'bg-muted';

  return (
    <AppLayout>
      <div className="space-y-5">
        <h1 className="text-2xl font-display font-bold">Suivi</h1>

        {/* ═══ NIVEAU 1 — 4 indicateurs principaux ═══ */}
        <motion.div custom={0} variants={cardVariants} initial="hidden" animate="visible" className="card-elevated p-4">
          <div className="grid grid-cols-4 gap-2 text-center">
            {/* Cible */}
            <div>
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-1.5">
                <Target className="w-4 h-4 text-primary" />
              </div>
              <p className="font-display font-bold text-base leading-tight">{dailyTarget || '—'}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Cible</p>
            </div>
            {/* Prévues */}
            <div>
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center mx-auto mb-1.5">
                <CalendarCheck className="w-4 h-4 text-muted-foreground" />
              </div>
              <p className="font-display font-bold text-base leading-tight">{plannedCalories}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Prévues</p>
            </div>
            {/* Net consommé */}
            <div>
              <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center mx-auto mb-1.5">
                <Utensils className="w-4 h-4 text-accent" />
              </div>
              <p className="font-display font-bold text-base leading-tight">{netConsumed}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Net conso.</p>
            </div>
            {/* Écart vs cible */}
            <div>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-1.5 ${gapBg(ecartConsomme)}`}>
                <Target className={`w-4 h-4 ${gapColor(ecartConsomme)}`} />
              </div>
              <p className={`font-display font-bold text-base leading-tight ${gapColor(ecartConsomme)}`}>
                {ecartConsomme > 0 ? '+' : ''}{ecartConsomme}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Écart</p>
            </div>
          </div>
        </motion.div>

        {/* ═══ NIVEAU 2 — Détails complémentaires (collapsible) ═══ */}
        <motion.div custom={1} variants={cardVariants} initial="hidden" animate="visible">
          <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
            <CollapsibleTrigger asChild>
              <button className="card-elevated p-3 w-full flex items-center justify-between text-sm font-medium hover:bg-muted/50 transition-colors rounded-xl">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <span>Détail du jour</span>
                  {(consumedFromMeals > 0 || manualConsumed > 0 || extraBurned > 0) && (
                    <span className="text-[10px] font-normal">
                      {consumed} conso. {extraBurned > 0 && `· −${extraBurned} extra`}
                    </span>
                  )}
                </span>
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${detailsOpen ? 'rotate-180' : ''}`} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="card-elevated mt-1 p-4 rounded-xl space-y-3">
                {/* Secondary metrics row */}
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-2 rounded-lg bg-muted/40">
                    <p className="font-display font-semibold text-sm">{consumedFromMeals}</p>
                    <p className="text-[10px] text-muted-foreground">Repas</p>
                  </div>
                  <div className="p-2 rounded-lg bg-muted/40">
                    <p className="font-display font-semibold text-sm">{manualConsumed}</p>
                    <p className="text-[10px] text-muted-foreground">Manuelles</p>
                  </div>
                  <div className="p-2 rounded-lg bg-destructive/5">
                    <p className="font-display font-semibold text-sm text-destructive">{extraBurned > 0 ? `−${extraBurned}` : '0'}</p>
                    <p className="text-[10px] text-muted-foreground">Extra brûlées</p>
                  </div>
                </div>

                {/* Full recap table */}
                <div className="space-y-1 text-sm border-t border-border pt-3">
                  <div className="flex justify-between"><span className="text-muted-foreground">Cible</span><span>{dailyTarget} kcal</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Prévues (planning)</span><span>{plannedCalories} kcal</span></div>
                  <div className={`flex justify-between text-xs ${gapColor(ecartPlanifie)}`}>
                    <span className="pl-2">↳ Écart planifié</span>
                    <span>{ecartPlanifie > 0 ? '+' : ''}{ecartPlanifie} kcal</span>
                  </div>
                  <div className="border-t border-border my-1" />
                  <div className="flex justify-between"><span className="text-muted-foreground">Consommées repas</span><span>{consumedFromMeals} kcal</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Consommées manuelles</span><span>{manualConsumed} kcal</span></div>
                  <div className="flex justify-between font-medium"><span>Total consommées</span><span>{consumed} kcal</span></div>
                  {extraBurned > 0 && (
                    <div className="flex justify-between text-destructive"><span>− Dépensées extra</span><span>−{extraBurned} kcal</span></div>
                  )}
                  <div className="border-t border-border my-1" />
                  <div className="flex justify-between font-semibold">
                    <span>Net consommé</span><span>{netConsumed} kcal</span>
                  </div>
                  <div className={`flex justify-between font-semibold ${gapColor(ecartConsomme)}`}>
                    <span>Écart vs cible</span>
                    <span>{ecartConsomme > 0 ? '+' : ''}{ecartConsomme} kcal</span>
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </motion.div>

        {/* ═══ Repas du jour ═══ */}
        {todayMealDetails.length > 0 && (
          <motion.div custom={2} variants={cardVariants} initial="hidden" animate="visible" className="card-elevated p-4">
            <h2 className="font-display font-semibold text-sm mb-2">Repas du jour</h2>
            <p className="text-[10px] text-muted-foreground mb-2">Marque tes repas comme consommés depuis le planning.</p>
            <div className="space-y-0.5">
              {todayMealDetails.map((meal, i) => (
                <div key={`${meal.name}-${i}`} className="flex justify-between text-sm py-1.5 border-b border-border last:border-0">
                  <span className="flex items-center gap-1.5">
                    {meal.consumed && <CheckCircle2 className="w-3.5 h-3.5 text-secondary" />}
                    <span className={meal.consumed ? '' : 'text-muted-foreground'}>{meal.name}</span>
                  </span>
                  <span className="text-muted-foreground">{meal.calories} kcal</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {plannedCalories === 0 && (
          <motion.div custom={2} variants={cardVariants} initial="hidden" animate="visible" className="card-elevated p-4 text-center text-sm text-muted-foreground">
            Aucun repas planifié aujourd'hui.
          </motion.div>
        )}

        {/* ═══ Tendance + Conseil ═══ */}
        {(trend || advice) && (
          <motion.div custom={3} variants={cardVariants} initial="hidden" animate="visible" className="space-y-3">
            {trend && (
              <div className="card-elevated p-3 flex items-center gap-3">
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
              </div>
            )}
            {advice && (
              <div className={`card-elevated p-3 border-l-4 ${
                advice.type === 'warning' ? 'border-l-accent' : advice.type === 'success' ? 'border-l-secondary' : 'border-l-primary'
              }`}>
                <div className="flex gap-3">
                  <Lightbulb className={`w-4 h-4 shrink-0 mt-0.5 ${
                    advice.type === 'warning' ? 'text-accent' : advice.type === 'success' ? 'text-secondary' : 'text-primary'
                  }`} />
                  <div>
                    <h3 className="font-display font-semibold text-xs">Conseil {advice.icon}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{advice.text}</p>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* ═══ Saisies ═══ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Poids */}
          <motion.div custom={4} variants={cardVariants} initial="hidden" animate="visible" className="card-elevated p-4 space-y-3">
            <h2 className="font-display font-semibold text-sm flex items-center gap-2">
              <Scale className="w-4 h-4 text-primary" /> Poids
            </h2>
            <div className="flex gap-2">
              <Input type="number" step="0.1" placeholder="Ex: 72.5" value={newWeight} onChange={e => setNewWeight(e.target.value)} className="flex-1" />
              <Button className="gap-1.5 tap-scale" onClick={addWeight}>
                <Plus className="w-4 h-4" /> {todayWeightLog ? 'MAJ' : 'OK'}
              </Button>
            </div>
            {todayWeightLog && (
              <p className="text-xs text-muted-foreground">
                Aujourd'hui : <span className="font-medium text-foreground">{todayWeightLog.weight} kg</span>
                {todayWeightLog.updatedAt && (
                  <span> — {format(new Date(todayWeightLog.updatedAt), 'HH:mm')}</span>
                )}
              </p>
            )}
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Une pesée par jour. Pèse-toi le matin à jeun.
            </p>
          </motion.div>

          {/* Calories manuelles */}
          <motion.div custom={5} variants={cardVariants} initial="hidden" animate="visible" className="card-elevated p-4 space-y-3">
            <h2 className="font-display font-semibold text-sm flex items-center gap-2">
              <Flame className="w-4 h-4 text-accent" /> Calories extra
            </h2>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Consommées</Label>
                <Input type="number" placeholder="kcal" value={newCalConsumed} onChange={e => setNewCalConsumed(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Dépensées</Label>
                <Input type="number" placeholder="kcal" value={newCalBurned} onChange={e => setNewCalBurned(e.target.value)} />
              </div>
            </div>
            <Button className="w-full gap-1.5 tap-scale" variant="outline" onClick={addCalories}>
              <Plus className="w-4 h-4" /> Ajouter
            </Button>
            {(manualConsumed > 0 || extraBurned > 0) && (
              <p className="text-[10px] text-muted-foreground text-center">
                {manualConsumed > 0 && `+${manualConsumed} conso.`}{manualConsumed > 0 && extraBurned > 0 && ' · '}{extraBurned > 0 && `−${extraBurned} dép.`}
              </p>
            )}
          </motion.div>
        </div>

        {/* ═══ Graphique poids ═══ */}
        {chartData.length >= 1 && (
          <motion.div custom={6} variants={cardVariants} initial="hidden" animate="visible" className="card-elevated p-4">
            <h2 className="font-display font-semibold text-sm mb-3">📈 Évolution du poids</h2>
            {chartData.length < 2 ? (
              <p className="text-xs text-muted-foreground">Ajoute une pesée un autre jour pour voir le graphique.</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis
                    domain={[(min: number) => Math.floor(min - 1), (max: number) => Math.ceil(max + 1)]}
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    unit=" kg"
                  />
                  <RechartsTooltip
                    contentStyle={{ borderRadius: '0.75rem', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}
                    formatter={(value: number) => [`${value} kg`, 'Poids']}
                    labelFormatter={(label) => `Date : ${label}`}
                  />
                  <Line type="monotone" dataKey="poids" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4, fill: 'hsl(var(--primary))' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </motion.div>
        )}

        {/* ═══ Historique pesées ═══ */}
        {recentWeightLogsDesc.length > 0 && (
          <motion.div custom={7} variants={cardVariants} initial="hidden" animate="visible" className="card-elevated p-4">
            <h2 className="font-display font-semibold text-sm mb-3">Historique des pesées</h2>
            <div className="space-y-0.5">
              {recentWeightLogsDesc.map(log => {
                const diff = weightDiffByLogId[log.id];
                return (
                  <div key={log.id} className="flex justify-between items-center text-sm py-1.5 border-b border-border last:border-0">
                    <span className="text-muted-foreground">
                      {format(new Date(`${log.date}T12:00:00`), 'd MMM yyyy', { locale: fr })}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{log.weight} kg</span>
                      {diff !== null && Math.abs(diff) >= 0.05 && (
                        <span className={`text-xs ${diff > 0 ? 'text-destructive' : 'text-secondary'}`}>
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
