import { useState, useMemo } from 'react';
import { useProfile } from '@/hooks/useProfile';
import { useRecipes } from '@/hooks/useRecipes';
import { useMealPlan } from '@/hooks/useMealPlan';
import { useWeightLogs } from '@/hooks/useWeightLogs';
import { useCalorieLogs } from '@/hooks/useCalorieLogs';
import { calculateCalorieTarget } from '@/lib/calories';
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
  const { profile } = useProfile();
  const { allRecipes } = useRecipes();
  const { mealPlan } = useMealPlan();
  const { weightLogs, upsertWeight } = useWeightLogs();
  const { calorieLogs, upsertCalories, deleteCalories } = useCalorieLogs();

  const [newWeight, setNewWeight] = useState('');
  const [newCalConsumed, setNewCalConsumed] = useState('');
  const [newCalBurned, setNewCalBurned] = useState('');

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
      .filter(Boolean) as { name: string; calories: number; mealType: string; consumed: boolean }[];
  }, [mealPlan, today, allRecipes]);

  const todayCalorieLog = calorieLogs.find(l => l.date === today);
  const manualConsumed = todayCalorieLog?.consumedManual || 0;
  const extraBurned = todayCalorieLog?.burnedExtra || 0;
  const consumed = consumedFromMeals + manualConsumed;
  const netConsumed = consumed - extraBurned;
  const dailyTarget = target?.target || 0;

  const ecartPlanifie = plannedCalories - dailyTarget;
  const ecartConsomme = netConsumed - dailyTarget;

  const todayWeightLog = weightLogs.find(l => l.date === today);

  const addWeight = async () => {
    if (!newWeight) return;
    try {
      const isUpdate = await upsertWeight(today, parseFloat(newWeight));
      setNewWeight('');
      toast({
        title: isUpdate ? 'Pesée mise à jour' : 'Poids enregistré',
        description: `${parseFloat(newWeight)} kg`,
      });
    } catch (err) {
      console.error(err);
      toast({ title: 'Erreur', description: 'Impossible d\'enregistrer le poids.', variant: 'destructive' });
    }
  };

  const handleCalorieAction = async (field: 'consumed' | 'burned', mode: 'add' | 'replace') => {
    const raw = field === 'consumed' ? newCalConsumed : newCalBurned;
    if (!raw) return;
    const value = parseInt(raw, 10);
    if (isNaN(value) || value < 0) return;

    try {
      const existing = calorieLogs.find(l => l.date === today);
      const currentConsumed = existing?.consumedManual ?? 0;
      const currentBurned = existing?.burnedExtra ?? 0;

      let finalConsumed = currentConsumed;
      let finalBurned = currentBurned;

      if (field === 'consumed') {
        finalConsumed = mode === 'add' ? currentConsumed + value : value;
      } else {
        finalBurned = mode === 'add' ? currentBurned + value : value;
      }

      await upsertCalories(today, finalConsumed, finalBurned);

      if (field === 'consumed') setNewCalConsumed('');
      else setNewCalBurned('');

      const label = field === 'consumed' ? 'Consommées' : 'Dépensées';
      toast({ title: mode === 'add' ? `${label} : +${value} kcal` : `${label} → ${value} kcal` });
    } catch (err) {
      console.error(err);
      toast({ title: 'Erreur', description: 'Impossible d\'enregistrer les calories.', variant: 'destructive' });
    }
  };

  const resetCalories = async () => {
    try {
      await deleteCalories(today);
      setNewCalConsumed('');
      setNewCalBurned('');
      toast({ title: 'Calories du jour réinitialisées' });
    } catch (err) {
      console.error(err);
    }
  };

  const advice = useMemo(() => {
    if (!profile || sortedWeightLogsAsc.length < 2) return null;
    const recent = sortedWeightLogsAsc.slice(-7);
    if (recent.length < 2) return null;
    const delta = recent[recent.length - 1].weight - recent[0].weight;
    const days = Math.max(1, recent.length - 1);
    const weeklyChange = (delta / days) * 7;

    if (profile.goal === 'lose') {
      if (weeklyChange > 0.1) return { type: 'warning' as const, text: 'Ton poids augmente malgré un objectif de perte. Vérifie ton apport calorique.' };
      if (weeklyChange < -1) return { type: 'warning' as const, text: 'Perte rapide (> 1 kg/semaine). Réduis le déficit pour plus de durabilité.' };
      if (weeklyChange < -0.1) return { type: 'success' as const, text: 'Bonne trajectoire : perte de poids régulière.' };
      return { type: 'info' as const, text: 'Poids stable. Réduis légèrement les calories ou augmente l\'activité.' };
    }
    if (profile.goal === 'gain') {
      if (weeklyChange < -0.1) return { type: 'warning' as const, text: 'Le poids baisse malgré l\'objectif de prise. Ajoute ~200 kcal/jour.' };
      if (weeklyChange > 1) return { type: 'warning' as const, text: 'Prise rapide (> 1 kg/semaine). Ralentis les apports.' };
      if (weeklyChange > 0.1) return { type: 'success' as const, text: 'Progression cohérente pour la prise de poids.' };
      return { type: 'info' as const, text: 'Poids stable. Augmente légèrement les apports.' };
    }
    if (Math.abs(weeklyChange) > 0.5) return { type: 'info' as const, text: `Variation notable (${weeklyChange > 0 ? '+' : ''}${weeklyChange.toFixed(1)} kg/sem). Ajuste les apports.` };
    return { type: 'success' as const, text: 'Poids globalement stable, bon maintien.' };
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
    hidden: { opacity: 0, y: 10 },
    visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.35 } }),
  };

  const gapColor = (val: number) =>
    val > 0 ? 'text-primary' : val < 0 ? 'text-destructive' : 'text-muted-foreground';
  const gapBg = (val: number) =>
    val > 0 ? 'bg-primary/8' : val < 0 ? 'bg-destructive/10' : 'bg-muted';

  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-display font-bold">Suivi</h1>

        {/* KPI row */}
        <motion.div custom={0} variants={cardVariants} initial="hidden" animate="visible" className="card-elevated p-5">
          <div className="grid grid-cols-4 gap-3 text-center">
            <div>
              <div className="w-9 h-9 rounded-xl bg-primary/8 flex items-center justify-center mx-auto mb-2">
                <Target className="w-4 h-4 text-primary" />
              </div>
              <p className="font-display font-bold text-base leading-tight">{dailyTarget || '—'}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Cible</p>
            </div>
            <div>
              <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center mx-auto mb-2">
                <CalendarCheck className="w-4 h-4 text-muted-foreground" />
              </div>
              <p className="font-display font-bold text-base leading-tight">{plannedCalories}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Prévues</p>
            </div>
            <div>
              <div className="w-9 h-9 rounded-xl bg-accent/40 flex items-center justify-center mx-auto mb-2">
                <Utensils className="w-4 h-4 text-accent-foreground" />
              </div>
              <p className="font-display font-bold text-base leading-tight">{netConsumed}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Net consommé</p>
            </div>
            <div>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center mx-auto mb-2 ${gapBg(ecartConsomme)}`}>
                <Target className={`w-4 h-4 ${gapColor(ecartConsomme)}`} />
              </div>
              <p className={`font-display font-bold text-base leading-tight ${gapColor(ecartConsomme)}`}>
                {ecartConsomme > 0 ? '+' : ''}{ecartConsomme}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Écart</p>
            </div>
          </div>
        </motion.div>

        {/* Collapsible details */}
        <motion.div custom={1} variants={cardVariants} initial="hidden" animate="visible">
          <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
            <CollapsibleTrigger asChild>
              <button className="card-elevated p-4 w-full flex items-center justify-between text-sm font-medium hover:bg-muted/30 transition-colors rounded-2xl">
                <span className="text-muted-foreground">Détail du jour</span>
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${detailsOpen ? 'rotate-180' : ''}`} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="card-elevated mt-1.5 p-5 rounded-2xl space-y-3">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 rounded-xl bg-muted/40">
                    <p className="font-display font-semibold text-sm">{consumedFromMeals}</p>
                    <p className="text-[10px] text-muted-foreground">Repas</p>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/40">
                    <p className="font-display font-semibold text-sm">{manualConsumed}</p>
                    <p className="text-[10px] text-muted-foreground">Manuelles</p>
                  </div>
                  <div className="p-3 rounded-xl bg-destructive/5">
                    <p className="font-display font-semibold text-sm text-destructive">{extraBurned > 0 ? `−${extraBurned}` : '0'}</p>
                    <p className="text-[10px] text-muted-foreground">Brûlées</p>
                  </div>
                </div>

                <div className="space-y-1 text-sm border-t border-border/50 pt-3">
                  <div className="flex justify-between"><span className="text-muted-foreground">Cible</span><span>{dailyTarget} kcal</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Prévues</span><span>{plannedCalories} kcal</span></div>
                  <div className={`flex justify-between text-xs ${gapColor(ecartPlanifie)}`}>
                    <span className="pl-2">Écart planifié</span>
                    <span>{ecartPlanifie > 0 ? '+' : ''}{ecartPlanifie} kcal</span>
                  </div>
                  <div className="border-t border-border/50 my-1.5" />
                  <div className="flex justify-between"><span className="text-muted-foreground">Consommées repas</span><span>{consumedFromMeals} kcal</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Consommées manuelles</span><span>{manualConsumed} kcal</span></div>
                  <div className="flex justify-between font-medium"><span>Total consommées</span><span>{consumed} kcal</span></div>
                  {extraBurned > 0 && (
                    <div className="flex justify-between text-destructive"><span>Dépensées extra</span><span>−{extraBurned} kcal</span></div>
                  )}
                  <div className="border-t border-border/50 my-1.5" />
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

        {/* Today meals */}
        {todayMealDetails.length > 0 && (
          <motion.div custom={2} variants={cardVariants} initial="hidden" animate="visible" className="card-elevated p-5">
            <p className="section-title mb-3">Repas du jour</p>
            <div className="space-y-0.5">
              {todayMealDetails.map((meal, i) => (
                <div key={`${meal.name}-${i}`} className="flex justify-between text-sm py-2 border-b border-border/30 last:border-0">
                  <span className="flex items-center gap-2">
                    {meal.consumed && <CheckCircle2 className="w-3.5 h-3.5 text-primary" />}
                    <span className={meal.consumed ? 'text-foreground' : 'text-muted-foreground'}>{meal.name}</span>
                  </span>
                  <span className="text-muted-foreground font-medium">{meal.calories} kcal</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {plannedCalories === 0 && (
          <motion.div custom={2} variants={cardVariants} initial="hidden" animate="visible" className="card-elevated p-6 text-center">
            <p className="text-sm text-body-text">Aucun repas planifié aujourd'hui</p>
            <p className="text-xs text-muted-foreground mt-1">Ajoute des repas depuis le planning.</p>
          </motion.div>
        )}

        {/* Trend + Advice */}
        {(trend || advice) && (
          <motion.div custom={3} variants={cardVariants} initial="hidden" animate="visible" className="space-y-3">
            {trend && (
              <div className="card-elevated p-4 flex items-center gap-3">
                {trend.direction === 'up' && <TrendingUp className="w-5 h-5 text-foreground" />}
                {trend.direction === 'down' && <TrendingDown className="w-5 h-5 text-primary" />}
                {trend.direction === 'stable' && <Minus className="w-5 h-5 text-muted-foreground" />}
                <div>
                  <p className="text-sm font-medium">
                    {trend.direction === 'up' && `En hausse (+${Math.abs(trend.diff).toFixed(1)} kg)`}
                    {trend.direction === 'down' && `En baisse (${trend.diff.toFixed(1)} kg)`}
                    {trend.direction === 'stable' && 'Poids stable'}
                  </p>
                  <p className="text-[11px] text-muted-foreground">Tendance récente</p>
                </div>
              </div>
            )}
            {advice && (
              <div className={`card-elevated p-4 border-l-[3px] ${
                advice.type === 'warning' ? 'border-l-foreground/20' : advice.type === 'success' ? 'border-l-primary' : 'border-l-muted-foreground/40'
              }`}>
                <div className="flex gap-3">
                  <Lightbulb className={`w-4 h-4 shrink-0 mt-0.5 ${
                    advice.type === 'warning' ? 'text-foreground' : advice.type === 'success' ? 'text-primary' : 'text-muted-foreground'
                  }`} />
                  <div>
                    <h3 className="font-display font-semibold text-xs">Conseil</h3>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{advice.text}</p>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Input forms */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <motion.div custom={4} variants={cardVariants} initial="hidden" animate="visible" className="card-elevated p-5 space-y-3">
            <p className="section-title flex items-center gap-2">
              <Scale className="w-3.5 h-3.5 text-primary" /> Poids
            </p>
            <div className="flex gap-2">
              <Input type="number" step="0.1" placeholder="Ex: 72.5" value={newWeight} onChange={e => setNewWeight(e.target.value)} className="flex-1" />
              <Button className="gap-1.5 tap-scale rounded-lg" onClick={addWeight}>
                <Plus className="w-4 h-4" /> {todayWeightLog ? 'Mettre à jour' : 'Enregistrer'}
              </Button>
            </div>
            {todayWeightLog && (
              <p className="text-[11px] text-muted-foreground">
                Aujourd'hui : <span className="font-medium text-foreground">{todayWeightLog.weight} kg</span>
                {todayWeightLog.updatedAt && (
                  <span> — {format(new Date(todayWeightLog.updatedAt), 'HH:mm')}</span>
                )}
              </p>
            )}
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Pèse-toi le matin à jeun pour un suivi fiable.
            </p>
          </motion.div>

          <motion.div custom={5} variants={cardVariants} initial="hidden" animate="visible" className="card-elevated p-5 space-y-3">
            <p className="section-title flex items-center gap-2">
              <Flame className="w-3.5 h-3.5 text-foreground" /> Calories extra
            </p>
            {todayCalorieLog && (
              <div className="p-3 rounded-xl bg-muted/40 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Consommées manuelles</span>
                  <span className="font-medium">{manualConsumed} kcal</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Dépensées extra</span>
                  <span className="font-medium">{extraBurned} kcal</span>
                </div>
              </div>
            )}
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Consommées manuelles (kcal)</Label>
                <div className="flex gap-1.5 mt-1">
                  <Input type="number" min="0" placeholder="kcal" value={newCalConsumed} onChange={e => setNewCalConsumed(e.target.value)} className="flex-1" />
                  <Button size="sm" className="gap-1 tap-scale rounded-lg" onClick={() => handleCalorieAction('consumed', 'add')} disabled={!newCalConsumed}>
                    <Plus className="w-3.5 h-3.5" /> Ajouter
                  </Button>
                  {todayCalorieLog && (
                    <Button size="sm" variant="outline" className="gap-1 tap-scale rounded-lg" onClick={() => handleCalorieAction('consumed', 'replace')} disabled={!newCalConsumed}>
                      Remplacer
                    </Button>
                  )}
                </div>
              </div>
              <div>
                <Label className="text-xs">Dépensées extra (kcal)</Label>
                <div className="flex gap-1.5 mt-1">
                  <Input type="number" min="0" placeholder="kcal" value={newCalBurned} onChange={e => setNewCalBurned(e.target.value)} className="flex-1" />
                  <Button size="sm" className="gap-1 tap-scale rounded-lg" onClick={() => handleCalorieAction('burned', 'add')} disabled={!newCalBurned}>
                    <Plus className="w-3.5 h-3.5" /> Ajouter
                  </Button>
                  {todayCalorieLog && (
                    <Button size="sm" variant="outline" className="gap-1 tap-scale rounded-lg" onClick={() => handleCalorieAction('burned', 'replace')} disabled={!newCalBurned}>
                      Remplacer
                    </Button>
                  )}
                </div>
              </div>
            </div>
            {todayCalorieLog && (
              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive gap-1 w-full text-xs" onClick={resetCalories}>
                Réinitialiser le jour
              </Button>
            )}
          </motion.div>
        </div>

        {/* Weight chart */}
        {chartData.length >= 1 && (
          <motion.div custom={6} variants={cardVariants} initial="hidden" animate="visible" className="card-elevated p-5">
            <p className="section-title mb-4">Évolution du poids</p>
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
                    contentStyle={{ borderRadius: '0.875rem', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}
                    formatter={(value: number) => [`${value} kg`, 'Poids']}
                    labelFormatter={(label) => `Date : ${label}`}
                  />
                  <Line type="monotone" dataKey="poids" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3, fill: 'hsl(var(--primary))' }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </motion.div>
        )}

        {/* Weight history */}
        {recentWeightLogsDesc.length > 0 && (
          <motion.div custom={7} variants={cardVariants} initial="hidden" animate="visible" className="card-elevated p-5">
            <p className="section-title mb-3">Historique des pesées</p>
            <div className="space-y-0.5">
              {recentWeightLogsDesc.map(log => {
                const diff = weightDiffByLogId[log.id];
                return (
                  <div key={log.id} className="flex justify-between items-center text-sm py-2 border-b border-border/30 last:border-0">
                    <span className="text-muted-foreground">
                      {format(new Date(`${log.date}T12:00:00`), 'd MMM yyyy', { locale: fr })}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{log.weight} kg</span>
                      {diff !== null && Math.abs(diff) >= 0.05 && (
                        <span className={`text-xs ${diff > 0 ? 'text-destructive' : 'text-primary'}`}>
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
