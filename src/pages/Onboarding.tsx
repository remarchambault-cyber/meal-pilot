import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/contexts/AuthContext';
import { UserProfile } from '@/data/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { motion } from 'framer-motion';
import { toast } from '@/hooks/use-toast';
import { useEffect } from 'react';

export default function Onboarding() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { saveProfile } = useProfile();

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth', { replace: true });
  }, [authLoading, user, navigate]);

  const [form, setForm] = useState({
    firstName: '',
    age: '',
    sex: 'male' as 'male' | 'female',
    heightCm: '',
    weightKg: '',
    activityLevel: 'moderate' as UserProfile['activityLevel'],
    goal: 'maintain' as UserProfile['goal'],
    targetRate: 'moderate' as UserProfile['targetRate'],
    dietPreference: 'none' as UserProfile['dietPreference'],
    extraCaloriesBurned: '',
  });

  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const profile: UserProfile = {
        firstName: form.firstName,
        age: parseInt(form.age) || 25,
        sex: form.sex,
        heightCm: parseInt(form.heightCm) || 170,
        weightKg: parseFloat(form.weightKg) || 70,
        activityLevel: form.activityLevel,
        goal: form.goal,
        targetRate: form.targetRate,
        dietPreference: form.dietPreference,
        extraCaloriesBurned: parseInt(form.extraCaloriesBurned) || 0,
      };
      await saveProfile(profile);
      // Also keep localStorage for pages that still read it
      window.localStorage.setItem('mealpilot_profile', JSON.stringify(profile));
      navigate('/dashboard');
    } catch (error: any) {
      toast({ title: '❌ Erreur', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-display font-extrabold text-primary">MealPilot</h1>
          <p className="text-muted-foreground mt-2">Configure ton profil pour commencer</p>
        </div>

        <form onSubmit={handleSubmit} className="card-elevated p-6 space-y-4">
          <div>
            <Label htmlFor="firstName">Prénom</Label>
            <Input id="firstName" value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} placeholder="Ton prénom" required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="age">Âge</Label>
              <Input id="age" type="number" value={form.age} onChange={e => setForm(f => ({ ...f, age: e.target.value }))} placeholder="25" required />
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
              <Label htmlFor="height">Taille (cm)</Label>
              <Input id="height" type="number" value={form.heightCm} onChange={e => setForm(f => ({ ...f, heightCm: e.target.value }))} placeholder="170" required />
            </div>
            <div>
              <Label htmlFor="weight">Poids (kg)</Label>
              <Input id="weight" type="number" step="0.1" value={form.weightKg} onChange={e => setForm(f => ({ ...f, weightKg: e.target.value }))} placeholder="70" required />
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

          {form.goal !== 'maintain' && (
            <div>
              <Label>Rythme cible</Label>
              <Select value={form.targetRate} onValueChange={(v) => setForm(f => ({ ...f, targetRate: v as UserProfile['targetRate'] }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="slow">Progressif</SelectItem>
                  <SelectItem value="moderate">Modéré</SelectItem>
                  <SelectItem value="fast">Rapide</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

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
            <Label htmlFor="extra">Calories dépensées en plus (optionnel)</Label>
            <Input id="extra" type="number" value={form.extraCaloriesBurned} onChange={e => setForm(f => ({ ...f, extraCaloriesBurned: e.target.value }))} placeholder="0" />
          </div>

          <Button type="submit" className="w-full tap-scale" size="lg" disabled={saving}>
            {saving ? 'Enregistrement...' : "C'est parti !"}
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
