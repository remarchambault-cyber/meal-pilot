import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/hooks/useProfile';

export interface CalorieLogEntry {
  id: string;
  date: string;
  consumedManual: number;
  burnedExtra: number;
}

export function useCalorieLogs() {
  const { dbProfile } = useProfile();
  const [calorieLogs, setCalorieLogs] = useState<CalorieLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    if (!dbProfile) { setLoading(false); return; }
    const { data, error } = await supabase
      .from('manual_calorie_logs')
      .select('*')
      .eq('profile_id', dbProfile.id)
      .order('date', { ascending: true });

    if (error) {
      console.error('Error fetching calorie logs:', error);
      setCalorieLogs([]);
    } else {
      setCalorieLogs((data || []).map(r => ({
        id: r.id,
        date: r.date,
        consumedManual: r.consumed_manual_kcal,
        burnedExtra: r.burned_extra_kcal,
      })));
    }
    setLoading(false);
  }, [dbProfile]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const upsertCalories = useCallback(async (date: string, consumed: number, burned: number) => {
    if (!dbProfile) throw new Error('No profile');

    const existing = calorieLogs.find(l => l.date === date);
    if (existing) {
      const { error } = await supabase
        .from('manual_calorie_logs')
        .update({ consumed_manual_kcal: consumed, burned_extra_kcal: burned })
        .eq('id', existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('manual_calorie_logs')
        .insert({ profile_id: dbProfile.id, date, consumed_manual_kcal: consumed, burned_extra_kcal: burned });
      if (error) throw error;
    }
    await fetchLogs();
    return !!existing;
  }, [dbProfile, calorieLogs, fetchLogs]);

  const deleteCalories = useCallback(async (date: string) => {
    const existing = calorieLogs.find(l => l.date === date);
    if (!existing) return;
    const { error } = await supabase
      .from('manual_calorie_logs')
      .delete()
      .eq('id', existing.id);
    if (error) throw error;
    await fetchLogs();
  }, [calorieLogs, fetchLogs]);

  return { calorieLogs, loading, upsertCalories, deleteCalories, refetch: fetchLogs };
}
