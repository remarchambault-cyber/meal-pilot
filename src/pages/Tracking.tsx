import { useState, useMemo } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { UserProfile, WeightLog, CalorieLog } from '@/data/types';
import { calculateCalorieTarget } from '@/lib/calories';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';
import { Plus, TrendingUp, TrendingDown, Minus, Lightbulb } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Tracking() {
  const [profile] = useLocalStorage<UserProfile | null>('mealpilot_profile', null);
  const [weightLogs, setWeightLogs] = useLocalStorage<WeightLog[]>('mealpilot_weight', []);
  const [calorieLogs, setCalorieLogs] = useLocalStorage<CalorieLog[]>('mealpilot_calories', []);

  const [newWeight, setNewWeight] = useState('');
  const [newCalConsumed, setNewCalConsumed] = useState('');
  const [newCalBurned, setNewCalBurned] = useState('');

  const target = useMemo(() => profile ? calculateCalorieTarget(profile) : null, [profile]);

  const today = new Date().toISOString().slice(0, 10);

  const addWeight = () => {
    if (!newWeight) return;
    const log: WeightLog = { id: `w_${Date.now()}`, date: today, weight: parseFloat(newWeight) };
    setWeightLogs(prev => [...prev.filter(l => l.date !== today), log]);
    setNewWeight('');
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
  };

  // Advice logic
  const advice = useMemo(() => {
    if (!profile || weightLogs.length < 3) return null;
    const sorted = [...weightLogs].sort((a, b) => a.date.localeCompare(b.date));
    const recent = sorted.slice(-7);
    if (recent.length < 2) return null;
    const delta = recent[recent.length - 1].weight - recent[0].weight;
    const weeklyChange = (delta / recent.length) * 7;

    if (profile.goal === 'lose') {
      if (weeklyChange > 0.1) return { type: 'warning', text: 'Ton poids augmente. Vérifie ton apport calorique et essaie de rester proche de ta cible.' };
      if (weeklyChange < -1) return { type: 'warning', text: 'Ta perte est rapide ! Pense à ne pas descendre trop bas pour préserver ta santé.' };
      if (Math.abs(weeklyChange) < 0.1) return { type: 'info', text: 'Ton poids est stable. Si tu veux relancer la perte, essaie de légèrement réduire tes calories ou augmenter ton activité.' };
    }
    if (profile.goal === 'gain') {
      if (weeklyChange < -0.1) return { type: 'warning', text: 'Ton poids baisse. Pense à augmenter légèrement tes calories.' };
      if (weeklyChange > 1) return { type: 'warning', text: 'Ta prise est rapide ! Ralentis un peu pour privilégier le muscle.' };
      if (Math.abs(weeklyChange) < 0.1) return { type: 'info', text: 'Ton poids stagne. Ajoute 100-200 kcal par jour pour relancer la prise.' };
    }
    return null;
  }, [profile, weightLogs]);

  const chartData = useMemo(() => {
    return [...weightLogs]
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30)
      .map(l => ({ date: l.date.slice(5), poids: l.weight }));
  }, [weightLogs]);

  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-display font-bold">Suivi</h1>

        {/* Weight entry */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card-elevated p-4 space-y-3">
          <h2 className="font-display font-semibold text-sm">Enregistrer le poids</h2>
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
          <div className="card-elevated p-4">
            <h2 className="font-display font-semibold text-sm mb-3">Évolution du poids</h2>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 20% 90%)" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="poids" stroke="hsl(217 91% 60%)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Calories entry */}
        <div className="card-elevated p-4 space-y-3">
          <h2 className="font-display font-semibold text-sm">Calories du jour</h2>
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
        </div>

        {/* Advice */}
        {advice && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`card-elevated p-4 border-l-4 ${
              advice.type === 'warning' ? 'border-l-accent' : 'border-l-primary'
            }`}
          >
            <div className="flex gap-3">
              <Lightbulb className={`w-5 h-5 shrink-0 mt-0.5 ${advice.type === 'warning' ? 'text-accent' : 'text-primary'}`} />
              <div>
                <h3 className="font-display font-semibold text-sm">Conseil</h3>
                <p className="text-sm text-body-text mt-1">{advice.text}</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* History */}
        {weightLogs.length > 0 && (
          <div className="card-elevated p-4">
            <h2 className="font-display font-semibold text-sm mb-3">Historique récent</h2>
            <div className="space-y-1">
              {[...weightLogs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10).map(log => (
                <div key={log.id} className="flex justify-between text-sm py-1.5 border-b border-border last:border-0">
                  <span className="text-muted-foreground">{log.date}</span>
                  <span className="font-medium">{log.weight} kg</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
