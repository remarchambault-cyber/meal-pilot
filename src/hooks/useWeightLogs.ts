import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/hooks/useProfile';

export interface WeightLogEntry {
  id: string;
  date: string;
  weight: number;
  updatedAt: string;
}

export function useWeightLogs() {
  const { dbProfile } = useProfile();
  const [weightLogs, setWeightLogs] = useState<WeightLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    if (!dbProfile) { setLoading(false); return; }
    const { data, error } = await supabase
      .from('weight_logs')
      .select('*')
      .eq('profile_id', dbProfile.id)
      .order('date', { ascending: true });

    if (error) {
      console.error('Error fetching weight logs:', error);
      setWeightLogs([]);
    } else {
      setWeightLogs((data || []).map(r => ({
        id: r.id,
        date: r.date,
        weight: Number(r.weight_kg),
        updatedAt: r.updated_at,
      })));
    }
    setLoading(false);
  }, [dbProfile]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const upsertWeight = useCallback(async (date: string, weight: number) => {
    if (!dbProfile) throw new Error('No profile');

    // Check if entry exists for this date
    const existing = weightLogs.find(l => l.date === date);
    if (existing) {
      const { error } = await supabase
        .from('weight_logs')
        .update({ weight_kg: weight })
        .eq('id', existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('weight_logs')
        .insert({ profile_id: dbProfile.id, date, weight_kg: weight });
      if (error) throw error;
    }
    await fetchLogs();
    return !!existing;
  }, [dbProfile, weightLogs, fetchLogs]);

  return { weightLogs, loading, upsertWeight, refetch: fetchLogs };
}
