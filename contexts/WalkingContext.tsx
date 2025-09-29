import React, { createContext, useContext, useMemo, useState, useCallback } from 'react';

// Types used across the app screens
export type BasicStats = {
  steps: number;
  distance: number; // km
  duration: number; // minutes
  calories: number;
};

export type ExtendedStats = BasicStats & {
  walks: number;
};

export type Achievement = {
  title: string;
  description: string;
  date: string | number | Date;
  color: string;
};

export type MotivationPoint = {
  day: string; // e.g., Mon, Tue
  value: number; // 0-100
};

export type CurrentWalk = {
  startTime: number; // epoch ms
  distance: number; // km
  steps: number;
  calories: number;
  isPaused: boolean;
};

// New types for Strava-like tracking
export type RoutePoint = { lat: number; lon: number; timestamp: number };
export type Split = { kmIndex: number; durationSec: number };

// Snapshot of a completed walk for saving
export type CompletedWalk = {
  startTime: number;
  endTime: number;
  durationSec: number;
  distanceKm: number;
  calories: number;
  steps: number;
};

// Journal types to support Journal screen
export type JournalEntry = {
  timestamp: number;
  mood: 'happy' | 'neutral' | 'sad';
  energyLevel: 1 | 2 | 3 | 4 | 5;
  motivation: number; // 0-100
  notes: string;
};

export type WalkingContextType = {
  // Walking session controls
  isWalking: boolean;
  currentWalk: CurrentWalk | null;
  startWalk: () => void;
  pauseWalk: () => void;
  resumeWalk: () => void;
  stopWalk: () => void;

  // Strava-like live tracking
  routePoints: RoutePoint[];
  splits: Split[];
  addRoutePoint: (point: RoutePoint) => void;
  resetRoute: () => void;
  saveCurrentWalk: () => Promise<boolean>;

  // Snapshot of last completed walk for UI (e.g., modal summary)
  lastCompletedWalk: CompletedWalk | null;

  // Stats consumed by Home and Progress screens
  todayStats: BasicStats;
  weeklyGoal: { dailySteps: number };
  motivationLevel: number; // 0-100

  weeklyStats: ExtendedStats;
  monthlyStats: ExtendedStats;
  achievements: Achievement[];
  motivationTrend: MotivationPoint[];

  // Journal
  journalEntries: JournalEntry[];
  addJournalEntry: (entry: JournalEntry) => Promise<void>;

  // Live tracking updates
  updateDistance: (meters: number) => void;
  updateSteps: (deltaSteps: number) => void;
};

const WalkingContext = createContext<WalkingContextType | undefined>(undefined);

export const useWalking = () => {
  const ctx = useContext(WalkingContext);
  if (!ctx) {
    throw new Error('useWalking must be used within a WalkingProvider');
  }
  return ctx;
};

export const WalkingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isWalking, setIsWalking] = useState(false);
  const [currentWalk, setCurrentWalk] = useState<CurrentWalk | null>(null);

  // Strava-like tracking state
  const [routePoints, setRoutePoints] = useState<RoutePoint[]>([]);
  const [splits, setSplits] = useState<Split[]>([]);
  const [lastSplitTimestamp, setLastSplitTimestamp] = useState<number | null>(null);
  const [lastCompletedWalk, setLastCompletedWalk] = useState<CompletedWalk | null>(null);

  // Mocked data to satisfy UI until real sensors/storage are wired in
  const [todayStats, _setTodayStats] = useState<BasicStats>({
    steps: 3421,
    distance: 2.6,
    duration: 38,
    calories: 185,
  });

  const weeklyGoal = useMemo(() => ({ dailySteps: 10000 }), []);
  const [motivationLevel] = useState<number>(72);

  const [weeklyStats] = useState<ExtendedStats>({
    steps: 24567,
    distance: 17.8,
    duration: 260,
    calories: 980,
    walks: 9,
  });

  const [monthlyStats] = useState<ExtendedStats>({
    steps: 98210,
    distance: 71.3,
    duration: 1120,
    calories: 3890,
    walks: 36,
  });

  const [achievements] = useState<Achievement[]>([
    { title: '5k Steps', description: 'You hit 5,000 steps in a day', date: new Date(), color: '#4CAF50' },
    { title: 'Streak 7', description: '7-day walking streak', date: new Date(Date.now() - 86400000 * 2), color: '#2196F3' },
    { title: 'Early Bird', description: 'Morning walk 5 times', date: new Date(Date.now() - 86400000 * 5), color: '#FF9800' },
  ]);

  const [motivationTrend] = useState<MotivationPoint[]>([
    { day: 'Mon', value: 60 },
    { day: 'Tue', value: 75 },
    { day: 'Wed', value: 55 },
    { day: 'Thu', value: 80 },
    { day: 'Fri', value: 65 },
    { day: 'Sat', value: 85 },
    { day: 'Sun', value: 70 },
  ]);

  // Journal state
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const addJournalEntry = useCallback(async (entry: JournalEntry) => {
    // In a real app, persist this to storage or backend; for now, just update local state
    setJournalEntries((prev) => [entry, ...prev]);
  }, []);

  // Update current walk distance (meters -> km) and calories estimation
  const updateDistance = useCallback((meters: number) => {
    if (!meters || meters <= 0) return;
    const km = meters / 1000;
    const kcalPerKm = 60; // approximate kcal burned per km (assuming ~70-75kg)
    setCurrentWalk((prev) => (
      prev ? { 
        ...prev, 
        distance: prev.distance + km, 
        calories: prev.calories + km * kcalPerKm 
      } : prev
    ));
  }, []);

  // Update steps (delta from pedometer)
  const updateSteps = useCallback((deltaSteps: number) => {
    if (!deltaSteps || deltaSteps <= 0) return;
    setCurrentWalk((prev) => (prev ? { ...prev, steps: prev.steps + deltaSteps } : prev));
  }, []);

  // Add a new route point and compute splits when crossing each km
  const addRoutePoint = useCallback((point: RoutePoint) => {
    setRoutePoints((prev) => [...prev, point]);
    setSplits((prev) => {
      if (!currentWalk) return prev;
      const kmCompleted = Math.floor(currentWalk.distance);
      // If we just completed a new km, add a split
      if (kmCompleted > prev.length) {
        const lastTs = lastSplitTimestamp ?? currentWalk.startTime;
        const durationSec = Math.max(1, Math.round((point.timestamp - lastTs) / 1000));
        setLastSplitTimestamp(point.timestamp);
        return [...prev, { kmIndex: kmCompleted, durationSec }];
      }
      return prev;
    });
  }, [currentWalk, lastSplitTimestamp]);

  const resetRoute = useCallback(() => {
    setRoutePoints([]);
    setSplits([]);
    setLastSplitTimestamp(null);
    setLastCompletedWalk(null);
  }, []);
  
  // Session control handlers
  const startWalk = useCallback(() => {
    setIsWalking(true);
    setCurrentWalk({
      startTime: Date.now(),
      distance: 0,
      steps: 0,
      calories: 0,
      isPaused: false,
    });
    // Reset tracking
    resetRoute();
    setLastSplitTimestamp(Date.now());
  }, [resetRoute]);
  
  const pauseWalk = useCallback(() => {
    setCurrentWalk((prev) => (prev ? { ...prev, isPaused: true } : prev));
  }, []);
  
  const resumeWalk = useCallback(() => {
    setCurrentWalk((prev) => (prev ? { ...prev, isPaused: false } : prev));
  }, []);
  
  const stopWalk = useCallback(() => {
    setIsWalking(false);
    // Snapshot completed walk for saving later
    setCurrentWalk((prev) => {
      if (prev) {
        const end = Date.now();
        setLastCompletedWalk({
          startTime: prev.startTime,
          endTime: end,
          durationSec: Math.max(1, Math.round((end - prev.startTime) / 1000)),
          distanceKm: prev.distance,
          calories: prev.calories,
          steps: prev.steps,
        });
      }
      return null;
    });
    // Do not reset route here; allow user to save or discard
  }, []);

  // Persist the last completed walk (if Supabase configured)
  const saveCurrentWalk = useCallback(async (): Promise<boolean> => {
    try {
      const { supabase, isSupabaseConfigured } = await import('@/lib/supabase');
      if (!isSupabaseConfigured || !supabase) {
        console.warn('Supabase not configured; skipping remote save');
        resetRoute();
        return true; // consider local clear as success
      }

      if (!lastCompletedWalk) {
        console.warn('No completed walk snapshot to save');
        return false;
      }

      const { data: walkInsert, error: walkErr } = await supabase
        .from('walks')
        .insert({
          start_time: new Date(lastCompletedWalk.startTime).toISOString(),
          end_time: new Date(lastCompletedWalk.endTime).toISOString(),
          duration_sec: lastCompletedWalk.durationSec,
          distance_km: lastCompletedWalk.distanceKm,
          calories: lastCompletedWalk.calories,
          steps: lastCompletedWalk.steps,
        })
        .select()
        .single();

      if (walkErr) throw walkErr;
      const walkId = walkInsert?.id;

      if (routePoints.length > 0 && walkId) {
        const pointsPayload = routePoints.map((p, idx) => ({
          walk_id: walkId,
          seq: idx + 1,
          lat: p.lat,
          lon: p.lon,
          timestamp: new Date(p.timestamp).toISOString(),
        }));
        const { error: pointsErr } = await supabase.from('walk_points').insert(pointsPayload);
        if (pointsErr) throw pointsErr;
      }

      if (splits.length > 0 && walkId) {
        const splitsPayload = splits.map((s) => ({
          walk_id: walkId,
          km_index: s.kmIndex,
          duration_sec: s.durationSec,
        }));
        const { error: splitsErr } = await supabase.from('walk_splits').insert(splitsPayload);
        if (splitsErr) throw splitsErr;
      }

      resetRoute();
      return true;
    } catch (e: any) {
      console.warn('Failed to save walk:', e?.message || String(e));
      return false;
    }
  }, [lastCompletedWalk, routePoints, splits, resetRoute]);

  const value = useMemo<WalkingContextType>(() => ({
    isWalking,
    currentWalk,
    startWalk,
    pauseWalk,
    resumeWalk,
    stopWalk,
    routePoints,
    splits,
    addRoutePoint,
    resetRoute,
    saveCurrentWalk,
    todayStats,
    weeklyGoal,
    motivationLevel,
    weeklyStats,
    monthlyStats,
    achievements,
    motivationTrend,
    journalEntries,
    addJournalEntry,
    updateDistance,
    updateSteps,
    lastCompletedWalk,
  }), [
    isWalking,
    currentWalk,
    startWalk,
    pauseWalk,
    resumeWalk,
    stopWalk,
    routePoints,
    splits,
    addRoutePoint,
    resetRoute,
    saveCurrentWalk,
    todayStats,
    weeklyGoal,
    motivationLevel,
    weeklyStats,
    monthlyStats,
    achievements,
    motivationTrend,
    journalEntries,
    addJournalEntry,
    updateDistance,
    updateSteps,
    lastCompletedWalk,
  ]);

  return <WalkingContext.Provider value={value}>{children}</WalkingContext.Provider>;
};

export default WalkingProvider;