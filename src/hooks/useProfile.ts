import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { UserProfile } from '@/data/types';
import { calculateCalorieTarget } from '@/lib/calories';

const PROFILE_CACHE_KEY = 'mealpilot_profile_cache_v2';
const profileCacheByUserId = new Map<string, UserProfile>();

interface PersistedProfileCache {
  userId: string;
  profile: UserProfile;
}

function readPersistedProfile(userId: string): UserProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(PROFILE_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedProfileCache;
    if (parsed?.userId === userId && parsed?.profile?.firstName !== undefined) {
      return parsed.profile;
    }
    return null;
  } catch {
    return null;
  }
}

function persistProfile(userId: string, profile: UserProfile) {
  if (typeof window === 'undefined') return;
  const payload: PersistedProfileCache = { userId, profile };
  window.localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(payload));
}

function clearPersistedProfile(userId: string) {
  if (typeof window === 'undefined') return;
  const raw = window.localStorage.getItem(PROFILE_CACHE_KEY);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw) as PersistedProfileCache;
    if (parsed?.userId === userId) {
      window.localStorage.removeItem(PROFILE_CACHE_KEY);
    }
  } catch {
    window.localStorage.removeItem(PROFILE_CACHE_KEY);
  }
}

/** Convert DB row to app-side UserProfile */
export function dbToUserProfile(db: DbProfile): UserProfile {
  return {
    firstName: db.first_name,
    age: db.age,
    sex: db.sex as UserProfile['sex'],
    heightCm: db.height_cm,
    weightKg: db.current_weight_kg,
    activityLevel: db.activity_level as UserProfile['activityLevel'],
    goal: db.goal_type as UserProfile['goal'],
    targetRate: (db.target_rate || 'moderate') as UserProfile['targetRate'],
    dietPreference: db.diet_preference as UserProfile['dietPreference'],
    extraCaloriesBurned: db.extra_calories_burned,
  };
}

export interface DbProfile {
  id: string;
  user_id: string;
  first_name: string;
  age: number;
  sex: string;
  height_cm: number;
  current_weight_kg: number;
  activity_level: string;
  goal_type: string;
  target_rate: string | null;
  diet_preference: string;
  extra_calories_burned: number;
  target_calories: number | null;
  preferences_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/** Convert app-side UserProfile to DB update payload */
function userProfileToDb(profile: UserProfile) {
  const target = calculateCalorieTarget(profile);
  return {
    first_name: profile.firstName,
    age: profile.age,
    sex: profile.sex,
    height_cm: profile.heightCm,
    current_weight_kg: profile.weightKg,
    activity_level: profile.activityLevel,
    goal_type: profile.goal,
    target_rate: profile.targetRate || 'moderate',
    diet_preference: profile.dietPreference,
    extra_calories_burned: profile.extraCaloriesBurned,
    target_calories: target.target,
  };
}

export function useProfile() {
  const { user } = useAuth();
  const initialCachedProfile = user?.id
    ? profileCacheByUserId.get(user.id) ?? readPersistedProfile(user.id)
    : null;

  const [profile, setProfile] = useState<UserProfile | null>(initialCachedProfile ?? null);
  const [dbProfile, setDbProfile] = useState<DbProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setDbProfile(null);
      setLoading(false);
      return;
    }

    const cachedProfile = profileCacheByUserId.get(user.id) ?? readPersistedProfile(user.id);
    if (cachedProfile) {
      setProfile((prev) => prev ?? cachedProfile);
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error || !data) {
      profileCacheByUserId.delete(user.id);
      clearPersistedProfile(user.id);
      setProfile(null);
      setDbProfile(null);
    } else {
      const normalizedProfile = dbToUserProfile(data as DbProfile);
      profileCacheByUserId.set(user.id, normalizedProfile);
      persistProfile(user.id, normalizedProfile);
      setDbProfile(data as DbProfile);
      setProfile(normalizedProfile);
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const saveProfile = useCallback(async (userProfile: UserProfile) => {
    if (!user) return;

    const payload = { ...userProfileToDb(userProfile), user_id: user.id };
    const { error } = await supabase
      .from('profiles')
      .upsert(payload, { onConflict: 'user_id' });

    if (error) throw error;

    profileCacheByUserId.set(user.id, userProfile);
    persistProfile(user.id, userProfile);
    setProfile(userProfile);
    await fetchProfile();
  }, [user, fetchProfile]);

  /** True if the profile has been filled (first_name set) */
  const isOnboarded = !!profile?.firstName?.trim();

  return { profile, dbProfile, loading, saveProfile, isOnboarded, refetch: fetchProfile };
}