import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { UserProfile, WeightLog, CalorieLog, MealPlanItem } from '@/data/types';
import { getGoalLabel, getActivityLabel, getDietLabel } from '@/lib/calories';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, Trash2, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';

export default function SettingsPage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useLocalStorage<UserProfile | null>('mealpilot_profile', null);
  const [, setAuth] = useLocalStorage('mealpilot_auth', false);
  const [, setWeightLogs] = useLocalStorage<WeightLog[]>('mealpilot_weight', []);
  const [, setCalorieLogs] = useLocalStorage<CalorieLog[]>('mealpilot_calories', []);
  const [, setMealPlan] = useLocalStorage<MealPlanItem[]>('mealpilot_mealplan', []);

  const [form, setForm] = useState<UserProfile>(profile || {
    firstName: '', age: 25, sex: 'male', heightCm: 170, weightKg: 70,
    activityLevel: 'moderate', goal: 'maintain', targetRate: 'moderate',
    dietPreference: 'none', extraCaloriesBurned: 0,
  });

  const handleSave = () => {
    setProfile(form);
  };

  const handleReset = () => {
    if (confirm('Es-tu sûr de vouloir réinitialiser toutes tes données ?')) {
      setWeightLogs([]);
      setCalorieLogs([]);
      setMealPlan([]);
    }
  };

  const handleLogout = () => {
    setAuth(false);
    setProfile(null);
    navigate('/');
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-display font-bold">Paramètres</h1>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card-elevated p-5 space-y-4">
          <h2 className="font-display font-semibold">Mon profil</h2>

          <div>
            <Label>Prénom</Label>
            <Input value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Âge</Label>
              <Input type="number" value={form.age} onChange={e => setForm(f => ({ ...f, age: parseInt(e.target.value) || 0 }))} />
            </div>
            <div>
              <Label>Sexe</Label>
              <Select value={form.sex} onValueChange={(v) => setForm(f => ({ ...f, sex: v as 'male' | 'female' }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Homme</SelectItem>
                  <SelectItem value="female">Femme</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Taille (cm)</Label>
              <Input type="number" value={form.heightCm} onChange={e => setForm(f => ({ ...f, heightCm: parseInt(e.target.value) || 0 }))} />
            </div>
            <div>
              <Label>Poids (kg)</Label>
              <Input type="number" step="0.1" value={form.weightKg} onChange={e => setForm(f => ({ ...f, weightKg: parseFloat(e.target.value) || 0 }))} />
            </div>
          </div>

          <div>
            <Label>Niveau d'activité</Label>
            <Select value={form.activityLevel} onValueChange={(v) => setForm(f => ({ ...f, activityLevel: v as UserProfile['activityLevel'] }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="sedentary">Sédentaire</SelectItem>
                <SelectItem value="light">Légèrement actif</SelectItem>
                <SelectItem value="moderate">Modérément actif</SelectItem>
                <SelectItem value="active">Actif</SelectItem>
                <SelectItem value="very_active">Très actif</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Objectif</Label>
            <Select value={form.goal} onValueChange={(v) => setForm(f => ({ ...f, goal: v as UserProfile['goal'] }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="lose">Perte de poids</SelectItem>
                <SelectItem value="maintain">Maintien</SelectItem>
                <SelectItem value="gain">Prise de poids</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Préférence alimentaire</Label>
            <Select value={form.dietPreference} onValueChange={(v) => setForm(f => ({ ...f, dietPreference: v as UserProfile['dietPreference'] }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sans restriction</SelectItem>
                <SelectItem value="vegetarian">Végétarien</SelectItem>
                <SelectItem value="vegan">Végan</SelectItem>
                <SelectItem value="pescatarian">Pescatarien</SelectItem>
                <SelectItem value="gluten_free">Sans gluten</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Calories dépensées en plus</Label>
            <Input type="number" value={form.extraCaloriesBurned} onChange={e => setForm(f => ({ ...f, extraCaloriesBurned: parseInt(e.target.value) || 0 }))} />
          </div>

          <Button className="w-full gap-2 tap-scale" onClick={handleSave}>
            <Save className="w-4 h-4" /> Sauvegarder
          </Button>
        </motion.div>

        <div className="space-y-2">
          <Button variant="outline" className="w-full gap-2 tap-scale text-destructive" onClick={handleReset}>
            <Trash2 className="w-4 h-4" /> Réinitialiser mes données
          </Button>
          <Button variant="outline" className="w-full gap-2 tap-scale" onClick={handleLogout}>
            <LogOut className="w-4 h-4" /> Se déconnecter
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
