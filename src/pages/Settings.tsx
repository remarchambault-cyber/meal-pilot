import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { UserProfile, WeightLog, CalorieLog, MealPlanItem, Recipe } from '@/data/types';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, Trash2, RotateCcw, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from '@/hooks/use-toast';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { profile, saveProfile, loading: profileLoading } = useProfile();
  const [, setWeightLogs] = useLocalStorage<WeightLog[]>('mealpilot_weight', []);
  const [, setCalorieLogs] = useLocalStorage<CalorieLog[]>('mealpilot_calories', []);
  const [, setMealPlan] = useLocalStorage<MealPlanItem[]>('mealpilot_mealplan', []);
  const [, setCustomRecipes] = useLocalStorage<Recipe[]>('mealpilot_custom_recipes', []);

  const [form, setForm] = useState<UserProfile>({
    firstName: '', age: 25, sex: 'male', heightCm: 170, weightKg: 70,
    activityLevel: 'moderate', goal: 'maintain', targetRate: 'moderate',
    dietPreference: 'none', extraCaloriesBurned: 0,
  });

  useEffect(() => {
    if (profile) setForm(profile);
  }, [profile]);

  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveProfile(form);
      window.localStorage.setItem('mealpilot_profile', JSON.stringify(form));
      toast({ title: 'Profil enregistré' });
    } catch (error: any) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setWeightLogs([]);
    setCalorieLogs([]);
    setMealPlan([]);
    setCustomRecipes([]);
    toast({ title: 'Données réinitialisées' });
  };

  const handleReOnboard = () => {
    navigate('/onboarding');
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth', { replace: true });
  };

  if (profileLoading) return <AppLayout><div className="flex items-center justify-center py-12 text-muted-foreground text-sm">Chargement…</div></AppLayout>;

  return (
    <AppLayout>
      <div className="space-y-8">
        <h1 className="text-2xl font-display font-bold">Paramètres</h1>

        {user && (
          <p className="text-sm text-muted-foreground">{user.email}</p>
        )}

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card-elevated p-6 space-y-5">
          <p className="section-title">Mon profil</p>

          <div>
            <Label className="text-xs font-medium">Prénom</Label>
            <Input value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} className="mt-1" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-medium">Âge</Label>
              <Input type="number" value={form.age} onChange={e => setForm(f => ({ ...f, age: parseInt(e.target.value) || 0 }))} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs font-medium">Sexe</Label>
              <Select value={form.sex} onValueChange={(v) => setForm(f => ({ ...f, sex: v as 'male' | 'female' }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Homme</SelectItem>
                  <SelectItem value="female">Femme</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-medium">Taille (cm)</Label>
              <Input type="number" value={form.heightCm} onChange={e => setForm(f => ({ ...f, heightCm: parseInt(e.target.value) || 0 }))} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs font-medium">Poids (kg)</Label>
              <Input type="number" step="0.1" value={form.weightKg} onChange={e => setForm(f => ({ ...f, weightKg: parseFloat(e.target.value) || 0 }))} className="mt-1" />
            </div>
          </div>

          <div>
            <Label className="text-xs font-medium">Niveau d'activité</Label>
            <Select value={form.activityLevel} onValueChange={(v) => setForm(f => ({ ...f, activityLevel: v as UserProfile['activityLevel'] }))}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
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
            <Label className="text-xs font-medium">Objectif</Label>
            <Select value={form.goal} onValueChange={(v) => setForm(f => ({ ...f, goal: v as UserProfile['goal'] }))}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="lose">Perte de poids</SelectItem>
                <SelectItem value="maintain">Maintien</SelectItem>
                <SelectItem value="gain">Prise de poids</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs font-medium">Préférence alimentaire</Label>
            <Select value={form.dietPreference} onValueChange={(v) => setForm(f => ({ ...f, dietPreference: v as UserProfile['dietPreference'] }))}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
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
            <Label className="text-xs font-medium">Calories dépensées en plus</Label>
            <Input type="number" value={form.extraCaloriesBurned} onChange={e => setForm(f => ({ ...f, extraCaloriesBurned: parseInt(e.target.value) || 0 }))} className="mt-1" />
          </div>

          <Button className="w-full gap-2 tap-scale rounded-xl" onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4" /> {saving ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </motion.div>

        <div className="space-y-2.5">
          <Button variant="outline" className="w-full gap-2 tap-scale rounded-xl justify-start" onClick={handleReOnboard}>
            <RotateCcw className="w-4 h-4" /> Relancer l'onboarding
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="w-full gap-2 tap-scale rounded-xl justify-start text-destructive hover:text-destructive">
                <Trash2 className="w-4 h-4" /> Réinitialiser mes données
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Réinitialiser toutes les données ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Cette action supprimera ton historique de poids, calories, planning et recettes personnelles. Cette action est irréversible.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={handleReset}>Réinitialiser</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Button variant="outline" className="w-full gap-2 tap-scale rounded-xl justify-start" onClick={handleSignOut}>
            <LogOut className="w-4 h-4" /> Se déconnecter
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
