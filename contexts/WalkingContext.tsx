import 'react-native-get-random-values';
import React, { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { startWalkingSync, updateWalkingSession, completeWalkingSession } from '../lib/realtime-sync';
import { DataCleanupManager, CLEANUP_CONFIGS, createArrayCleanupCallback } from '../utils/dataCleanup';
import { v4 as uuidv4 } from 'uuid';

// Re-export types from activity-tracking
export { ActivityMetrics, ActivitySplit } from '../lib/activity-tracking';

// Core types
export type BasicStats = {
  steps: number;
  distance: number; // km
  duration: number; // minutes
  calories: number;
  walks: number;
};

export type RoutePoint = {
  lat: number;
  lon: number;
  timestamp: number;
  accuracy?: number;
};

export type Split = {
  distance: number; // km
  time: number; // seconds
  pace: number; // min/km
};

export type CompletedWalk = {
  startTime: number;
  endTime: number;
  durationSec: number;
  distanceKm: number;
  calories: number;
  steps: number;
};

export type WalkingSession = {
  startTime: number;
  duration: number; // seconds
  distance: number; // km
  steps: number;
  calories: number;
  isPaused: boolean;
  pausedTime?: number;
  metrics: {
    averagePace: number; // min/km
    speed: number; // m/s
  };
};

export type JournalEntry = {
  timestamp: number;
  mood: 'happy' | 'neutral' | 'sad';
  energyLevel: number; // 1-5
  motivation: number; // 1-100
  notes?: string;
};

export type WalkingState = {
  isWalking: boolean;
  currentSession: WalkingSession | null;
  activeSessionId: string | null;
  routePoints: RoutePoint[];
  splits: Split[];
  lastCompletedWalk: CompletedWalk | null;
  
  // Stats
  todayStats: BasicStats;
  weeklyStats: BasicStats;
  monthlyStats: BasicStats;
  yearlyStats: BasicStats;
  weeklyGoal: number; // km
  motivationLevel: number; // 1-100
  motivationTrend: Array<{ day: string; value: number }>;
  
  // Journal
  journalEntries: JournalEntry[];
};

// Action types
type WalkingAction =
  | { type: 'START_WALK'; payload: { sessionId: string } }
  | { type: 'PAUSE_WALK'; payload: { pauseTime: number } }
  | { type: 'RESUME_WALK'; payload: { resumeTime: number } }
  | { type: 'STOP_WALK'; payload: { completedWalk: CompletedWalk } }
  | { type: 'UPDATE_STEPS'; payload: { deltaSteps: number } }
  | { type: 'UPDATE_DISTANCE'; payload: { deltaDistance: number } }
  | { type: 'ADD_ROUTE_POINT'; payload: { point: RoutePoint } }
  | { type: 'ADD_SPLIT'; payload: { split: Split } }
  | { type: 'RESET_ROUTE' }
  | { type: 'SET_STATS'; payload: Partial<Pick<WalkingState, 'todayStats' | 'weeklyStats' | 'monthlyStats' | 'yearlyStats' | 'weeklyGoal' | 'motivationLevel' | 'motivationTrend'>> }
  | { type: 'ADD_JOURNAL_ENTRY'; payload: { entry: JournalEntry } }
  | { type: 'SET_ROUTE_POINTS'; payload: RoutePoint[] }
  | { type: 'SET_JOURNAL_ENTRIES'; payload: JournalEntry[] }
  | { type: 'SET_SPLITS'; payload: Split[] };

// Context type
export type WalkingContextType = {
  // State
  isWalking: boolean;
  currentWalk: WalkingSession | null;
  routePoints: RoutePoint[];
  splits: Split[];
  lastCompletedWalk: CompletedWalk | null;
  
  // Stats
  todayStats: BasicStats;
  weeklyStats: BasicStats;
  monthlyStats: BasicStats;
  yearlyStats: BasicStats;
  weeklyGoal: number;
  motivationLevel: number;
  motivationTrend: Array<{ day: string; value: number }>;
  
  // Journal
  journalEntries: JournalEntry[];
  
  // Actions
  startWalk: () => void;
  pauseWalk: () => void;
  resumeWalk: () => void;
  stopWalk: () => Promise<void>;
  updateSteps: (deltaSteps: number) => void;
  updateDistance: (meters: number) => void;
  addRoutePoint: (point: RoutePoint) => void;
  resetRoute: () => void;
  saveCurrentWalk: () => Promise<boolean>;
  addJournalEntry: (entry: JournalEntry) => Promise<void>;
};

// Helper functions
const calculateCalories = (steps: number, weight: number = 70, duration: number = 0): number => {
  // Base MET values for walking
  const baseMET = 3.5; // Light walking
  const activeMET = 4.5; // Moderate walking
  
  // Calculate MET based on activity level (steps per minute)
  const stepsPerMinute = duration > 0 ? steps / (duration / 60) : 0;
  let met = baseMET;
  
  if (stepsPerMinute > 100) {
    met = activeMET + (stepsPerMinute - 100) * 0.01; // Increase MET for faster pace
  } else if (stepsPerMinute > 60) {
    met = baseMET + (stepsPerMinute - 60) * 0.025;
  }
  
  // Calories = MET × weight (kg) × time (hours)
  const durationHours = duration / 3600;
  
  if (durationHours === 0) {
    // Fallback: estimate based on steps only
    return Math.round(steps * 0.04 * (weight / 70));
  }
  
  const baseCalories = met * weight * durationHours;
  return Math.round(baseCalories);
};

const calculatePace = (distance: number, duration: number): number => {
  if (distance <= 0) return 0;
  return duration / 60 / distance; // min/km
};

const calculateSpeed = (distance: number, duration: number): number => {
  if (duration <= 0) return 0;
  return (distance * 1000) / duration; // m/s
};

// Enhanced pace calculation with smoothing
const calculateSmoothedPace = (
  currentPace: number,
  recentPaces: number[],
  distance: number,
  duration: number
): number => {
  const newPace = calculatePace(distance, duration);
  
  if (newPace <= 0 || !isFinite(newPace)) {
    return currentPace;
  }
  
  // Add new pace to recent paces (keep last 5)
  const updatedPaces = [...recentPaces, newPace].slice(-5);
  
  // Calculate weighted average (more recent paces have higher weight)
  if (updatedPaces.length > 0) {
    const weights = updatedPaces.map((_, index) => index + 1);
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    const weightedSum = updatedPaces.reduce((sum, pace, index) => sum + pace * weights[index], 0);
    
    return totalWeight > 0 ? weightedSum / totalWeight : currentPace;
  }
  
  return currentPace;
};

// Initial state
const initialState: WalkingState = {
  isWalking: false,
  currentSession: null,
  activeSessionId: null,
  routePoints: [],
  splits: [],
  lastCompletedWalk: null,
  
  // Stats
  todayStats: { steps: 0, distance: 0, duration: 0, calories: 0, walks: 0 },
  weeklyStats: { steps: 0, distance: 0, duration: 0, calories: 0, walks: 0 },
  monthlyStats: { steps: 0, distance: 0, duration: 0, calories: 0, walks: 0 },
  yearlyStats: { steps: 0, distance: 0, duration: 0, calories: 0, walks: 0 },
  weeklyGoal: 10, // km
  motivationLevel: 75,
  motivationTrend: [],
  
  // Journal
  journalEntries: []
};

// Reducer
const walkingReducer = (state: WalkingState, action: WalkingAction): WalkingState => {
  switch (action.type) {
    case 'START_WALK': {
      const startTime = Date.now();
      return {
        ...state,
        isWalking: true,
        activeSessionId: action.payload.sessionId,
        currentSession: {
          startTime,
          duration: 0,
          distance: 0,
          steps: 0,
          calories: 0,
          isPaused: false,
          metrics: {
            averagePace: 0,
            speed: 0
          }
        },
        routePoints: [],
        splits: []
      };
    }
    
    case 'PAUSE_WALK': {
      if (!state.currentSession) return state;
      
      return {
        ...state,
        currentSession: {
          ...state.currentSession,
          isPaused: true,
          pausedTime: action.payload.pauseTime
        }
      };
    }
    
    case 'RESUME_WALK': {
      if (!state.currentSession) return state;
      
      return {
        ...state,
        currentSession: {
          ...state.currentSession,
          isPaused: false,
          pausedTime: undefined
        }
      };
    }
    
    case 'STOP_WALK': {
      return {
        ...state,
        isWalking: false,
        currentSession: null,
        activeSessionId: null,
        lastCompletedWalk: action.payload.completedWalk,
        routePoints: [],
        splits: []
      };
    }
    
    case 'UPDATE_STEPS': {
      if (!state.currentSession) return state;
      
      const currentTime = Date.now();
      const newSteps = state.currentSession.steps + action.payload.deltaSteps;
      const duration = (currentTime - state.currentSession.startTime) / 1000;
      const newCalories = calculateCalories(newSteps, 70, duration);
      
      return {
        ...state,
        currentSession: {
          ...state.currentSession,
          steps: newSteps,
          duration,
          calories: newCalories,
          metrics: {
            ...state.currentSession.metrics,
            speed: calculateSpeed(state.currentSession.distance, duration)
          }
        }
      };
    }
    
    case 'UPDATE_DISTANCE': {
      if (!state.currentSession) return state;
      
      const newDistance = state.currentSession.distance + action.payload.deltaDistance;
      const currentTime = Date.now();
      const duration = (currentTime - state.currentSession.startTime) / 1000;
      const newCalories = calculateCalories(state.currentSession.steps, 70, duration);
      
      // Calculate new pace and speed
      const newPace = calculatePace(newDistance, duration);
      const newSpeed = calculateSpeed(newDistance, duration);
      
      return {
        ...state,
        currentSession: {
          ...state.currentSession,
          distance: newDistance,
          duration,
          calories: newCalories,
          metrics: {
            averagePace: newPace,
            speed: newSpeed
          }
        }
      };
    }
    
    case 'ADD_ROUTE_POINT': {
      const newRoutePoints = [...state.routePoints, action.payload.point];
      
      // Keep only last 1000 points for performance
      const trimmedPoints = newRoutePoints.slice(-1000);
      
      return {
        ...state,
        routePoints: trimmedPoints
      };
    }
    
    case 'ADD_SPLIT': {
      return {
        ...state,
        splits: [...state.splits, action.payload.split]
      };
    }
    
    case 'RESET_ROUTE': {
      return {
        ...state,
        routePoints: []
      };
    }
    
    case 'SET_STATS': {
      return {
        ...state,
        ...action.payload
      };
    }
    
    case 'ADD_JOURNAL_ENTRY': {
      return {
        ...state,
        journalEntries: [...state.journalEntries, action.payload.entry]
      };
    }
    
    case 'SET_ROUTE_POINTS': {
      return {
        ...state,
        routePoints: action.payload
      };
    }
    
    case 'SET_JOURNAL_ENTRIES': {
      return {
        ...state,
        journalEntries: action.payload
      };
    }
    
    case 'SET_SPLITS': {
      return {
        ...state,
        splits: action.payload
      };
    }
    
    default:
      return state;
  }
};

// Create context
const WalkingContext = createContext<WalkingContextType | undefined>(undefined);

// Hook to use walking context
export const useWalking = (): WalkingContextType => {
  const context = useContext(WalkingContext);
  if (!context) {
    throw new Error('useWalking must be used within a WalkingProvider');
  }
  return context;
};

// Provider component
export const WalkingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(walkingReducer, initialState);
  const { user } = useAuth();
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  
  // Data cleanup manager
  const cleanupManager = useRef<DataCleanupManager | undefined>(undefined);
  
  // Initialize cleanup manager
  useEffect(() => {
    cleanupManager.current = DataCleanupManager.getInstance();
    
    // Setup cleanup for route points
    cleanupManager.current.registerCleanupCallback(
      'routePoints',
      createArrayCleanupCallback(
        () => state.routePoints, 
        (array) => dispatch({ type: 'SET_ROUTE_POINTS', payload: array }),
        CLEANUP_CONFIGS.ROUTE_POINTS
      )
    );
    
    // Setup cleanup for journal entries
    cleanupManager.current.registerCleanupCallback(
      'journalEntries',
      createArrayCleanupCallback(
        () => state.journalEntries, 
        (array) => dispatch({ type: 'SET_JOURNAL_ENTRIES', payload: array }),
        CLEANUP_CONFIGS.SENSOR_DATA
      )
    );
    
    // Setup cleanup for splits
    cleanupManager.current.registerCleanupCallback(
      'splits',
      createArrayCleanupCallback(
        () => state.splits, 
        (array) => dispatch({ type: 'SET_SPLITS', payload: array }),
        CLEANUP_CONFIGS.SPLITS
      )
    );
    
    cleanupManager.current.startPeriodicCleanup();
    
    return () => {
      cleanupManager.current?.stopPeriodicCleanup();
    };
  }, []);
  
  // Debounced sync function
  const debouncedSync = useCallback((updates: Partial<WalkingSession>) => {
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }
    
    syncTimeoutRef.current = setTimeout(async () => {
      if (!state.activeSessionId) return;
      
      try {
        await updateWalkingSession(state.activeSessionId, {
          duration: updates.duration ? Math.round(updates.duration) : undefined,
          distance: updates.distance,
          steps: updates.steps ? Math.round(updates.steps) : undefined,
          calories_burned: updates.calories ? Math.round(updates.calories) : undefined
        });
      } catch (error) {
        console.warn('Failed to sync walking session:', error);
      }
    }, 2000); // Sync every 2 seconds
  }, [state.activeSessionId]);

  // Fetch stats from database
  const fetchStats = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const { supabase } = await import('../lib/supabase');
      if (!supabase) return;
      
      const today = new Date().toISOString().split('T')[0];
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const monthStart = new Date();
      monthStart.setDate(1);
      const yearStart = new Date();
      yearStart.setMonth(0, 1);
      
      // Fetch all stats in parallel
      const [todayData, weekData, monthData, yearData, trendData] = await Promise.all([
        supabase
          .from('walking_sessions')
          .select('duration, distance, steps, calories_burned')
          .eq('user_id', user.id)
          .gte('start_time', today)
          .eq('status', 'completed'),
        supabase
          .from('walking_sessions')
          .select('duration, distance, steps, calories_burned')
          .eq('user_id', user.id)
          .gte('start_time', weekStart.toISOString())
          .eq('status', 'completed'),
        supabase
          .from('walking_sessions')
          .select('duration, distance, steps, calories_burned')
          .eq('user_id', user.id)
          .gte('start_time', monthStart.toISOString())
          .eq('status', 'completed'),
        supabase
          .from('walking_sessions')
          .select('duration, distance, steps, calories_burned')
          .eq('user_id', user.id)
          .gte('start_time', yearStart.toISOString())
          .eq('status', 'completed'),
        supabase
          .from('walking_sessions')
          .select('distance')
          .eq('user_id', user.id)
          .order('start_time', { ascending: false })
          .limit(6)
      ]);
      
      const updates: Partial<Pick<WalkingState, 'todayStats' | 'weeklyStats' | 'monthlyStats' | 'yearlyStats' | 'weeklyGoal' | 'motivationLevel' | 'motivationTrend'>> = {};
      
      if (todayData.data) {
        const todayStats = todayData.data.reduce((acc, session) => ({
          steps: acc.steps + (session.steps || 0),
          distance: acc.distance + (session.distance || 0),
          duration: acc.duration + (session.duration || 0),
          calories: acc.calories + (session.calories_burned || 0),
          walks: acc.walks + 1
        }), { steps: 0, distance: 0, duration: 0, calories: 0, walks: 0 });
        updates.todayStats = todayStats;
      }
      
      if (weekData.data) {
        const weeklyStats = weekData.data.reduce((acc, session) => ({
          steps: acc.steps + (session.steps || 0),
          distance: acc.distance + (session.distance || 0),
          duration: acc.duration + (session.duration || 0),
          calories: acc.calories + (session.calories_burned || 0),
          walks: acc.walks + 1
        }), { steps: 0, distance: 0, duration: 0, calories: 0, walks: 0 });
        updates.weeklyStats = weeklyStats;
      }
      
      if (monthData.data) {
        const monthlyStats = monthData.data.reduce((acc, session) => ({
          steps: acc.steps + (session.steps || 0),
          distance: acc.distance + (session.distance || 0),
          duration: acc.duration + (session.duration || 0),
          calories: acc.calories + (session.calories_burned || 0),
          walks: acc.walks + 1
        }), { steps: 0, distance: 0, duration: 0, calories: 0, walks: 0 });
        updates.monthlyStats = monthlyStats;
      }
      
      if (yearData.data) {
        const yearlyStats = yearData.data.reduce((acc, session) => ({
          steps: acc.steps + (session.steps || 0),
          distance: acc.distance + (session.distance || 0),
          duration: acc.duration + (session.duration || 0),
          calories: acc.calories + (session.calories_burned || 0),
          walks: acc.walks + 1
        }), { steps: 0, distance: 0, duration: 0, calories: 0, walks: 0 });
        updates.yearlyStats = yearlyStats;
      }
      
      if (trendData.data && trendData.data.length > 0) {
        const recentAvg = trendData.data.slice(0, 3).reduce((sum, s) => sum + (s.distance || 0), 0) / 3;
        const olderAvg = trendData.data.slice(3, 6).reduce((sum, s) => sum + (s.distance || 0), 0) / 3;
        
        // Create motivation trend data array
        const motivationTrendData = trendData.data.slice(0, 7).map((session, index) => ({
          day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][index] || `Day ${index + 1}`,
          value: Math.min(100, Math.max(0, (session.distance || 0) * 20)) // Convert distance to percentage (0-100)
        }));
        
        updates.motivationTrend = motivationTrendData;
      }

      dispatch({ type: 'SET_STATS', payload: updates });
    } catch (error) {
      console.warn('Failed to fetch walking stats:', error);
    }
  }, [user?.id]);

  // Load stats on mount and user change
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Auto-refresh stats every 5 minutes
  useEffect(() => {
    const interval = setInterval(fetchStats, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  const startWalk = useCallback(async () => {
    try {
      const sessionId = uuidv4();
      
      // Create initial session in database (don't include id, let database generate it)
      const initialSession = {
        user_id: user?.id || '',
        start_time: new Date().toISOString(),
        steps: 0,
        distance: 0,
        status: 'active' as const,
      };
      
      // Import DatabaseService here to avoid circular imports
      const { DatabaseService } = await import('../lib/database');
      const createdSessionId = await DatabaseService.createWalkingSession(initialSession);
      
      if (!createdSessionId) {
        throw new Error('Failed to create session in database');
      }
      
      // Use the database-generated ID for syncing
      await startWalkingSync(createdSessionId);
      dispatch({ type: 'START_WALK', payload: { sessionId: createdSessionId } });
    } catch (error) {
      console.error('Failed to start walk:', error);
      // Fallback: start with local session
      const sessionId = `local_${Date.now()}`;
      dispatch({ type: 'START_WALK', payload: { sessionId } });
    }
  }, [user?.id]);

  const pauseWalk = useCallback(() => {
    dispatch({ type: 'PAUSE_WALK', payload: { pauseTime: Date.now() } });
  }, []);

  const resumeWalk = useCallback(() => {
    dispatch({ type: 'RESUME_WALK', payload: { resumeTime: Date.now() } });
  }, []);

  const stopWalk = useCallback(async () => {
    if (!state.currentSession || !state.activeSessionId) return;
    
    try {
      // Complete the walk session with enhanced data validation
      const completedWalk: CompletedWalk = {
        startTime: state.currentSession.startTime,
        endTime: Date.now(),
        durationSec: Math.max(0, state.currentSession.duration), // Ensure non-negative
        distanceKm: Math.max(0, state.currentSession.distance), // Ensure non-negative
        calories: Math.max(0, Math.round(state.currentSession.calories)), // Ensure non-negative integer
        steps: Math.max(0, state.currentSession.steps) // Ensure non-negative
      };
      
      // Enhanced data validation and formatting for secure transmission
      const dbUpdates = {
        start_time: new Date(completedWalk.startTime).toISOString(),
        end_time: new Date(completedWalk.endTime).toISOString(),
        duration: Math.round(completedWalk.durationSec), // Ensure integer
        distance: Number(completedWalk.distanceKm.toFixed(3)), // Limit to 3 decimal places
        calories_burned: completedWalk.calories,
        steps: completedWalk.steps,
        status: 'completed' as const,
        // Add route coordinates if available
        route_coordinates: state.routePoints.length > 0 ? state.routePoints.map(point => ({
          lat: Number(point.lat.toFixed(6)), // Limit precision for security
          lng: Number(point.lon.toFixed(6)),
          timestamp: new Date(point.timestamp).toISOString(),
          accuracy: point.accuracy ? Number(point.accuracy.toFixed(1)) : undefined
        })) : undefined,
        // Calculate and add average pace if distance > 0
        average_pace: completedWalk.distanceKm > 0 && completedWalk.durationSec > 0 
          ? Number((completedWalk.durationSec / 60 / completedWalk.distanceKm).toFixed(2))
          : undefined
      };

      // Validate required fields before transmission
      if (!dbUpdates.start_time || !dbUpdates.end_time) {
        throw new Error('Invalid session timestamps');
      }

      if (dbUpdates.duration < 0 || dbUpdates.distance < 0 || dbUpdates.calories_burned < 0 || dbUpdates.steps < 0) {
        throw new Error('Invalid session metrics - negative values detected');
      }

      // Attempt to save to database with retry logic
      let saveAttempts = 0;
      const maxRetries = 3;
      let saveSuccess = false;

      while (saveAttempts < maxRetries && !saveSuccess) {
        try {
          await completeWalkingSession(state.activeSessionId, dbUpdates);
          saveSuccess = true;
          console.log('Walk session saved successfully to database');
        } catch (saveError) {
          saveAttempts++;
          console.warn(`Save attempt ${saveAttempts} failed:`, saveError);
          
          if (saveAttempts < maxRetries) {
            // Wait before retry (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, saveAttempts) * 1000));
          }
        }
      }

      if (!saveSuccess) {
        // If all save attempts failed, still update local state but notify user
        console.error('Failed to save walk session to database after all retry attempts');
        // You could show a toast notification here
        throw new Error('Failed to save walk session to database. Please check your internet connection.');
      }

      // Update local state only after successful database save
      dispatch({ type: 'STOP_WALK', payload: { completedWalk } });
      
      // Refresh stats to reflect the new completed walk
      await fetchStats();
      
    } catch (error) {
      console.error('Failed to stop walk:', error);
      
      // Enhanced error handling with user-friendly messages
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      if (errorMessage.includes('network') || errorMessage.includes('connection')) {
        console.error('Network error - walk data may not be saved:', errorMessage);
        // You could show a specific network error message to the user
      } else if (errorMessage.includes('Invalid')) {
        console.error('Data validation error:', errorMessage);
        // You could show a data validation error message
      } else {
        console.error('Unexpected error during walk completion:', errorMessage);
      }
      
      // Re-throw error so calling code can handle it appropriately
      throw error;
    }
  }, [state.currentSession, state.activeSessionId, state.routePoints, fetchStats]);

  const updateSteps = useCallback((deltaSteps: number) => {
    if (deltaSteps <= 0) return;
    
    dispatch({ type: 'UPDATE_STEPS', payload: { deltaSteps } });
    
    if (state.currentSession) {
      debouncedSync({ 
        steps: state.currentSession.steps + deltaSteps,
        calories: state.currentSession.calories,
        duration: state.currentSession.duration
      });
    }
  }, [state.currentSession, debouncedSync]);

  const updateDistance = useCallback((meters: number) => {
    if (meters <= 0) return;
    
    const deltaDistance = meters / 1000; // convert to km
    dispatch({ type: 'UPDATE_DISTANCE', payload: { deltaDistance } });
    
    if (state.currentSession) {
      debouncedSync({
        distance: state.currentSession.distance + deltaDistance,
        calories: state.currentSession.calories,
        duration: state.currentSession.duration
      });
    }
  }, [state.currentSession, debouncedSync]);

  const addRoutePoint = useCallback((point: RoutePoint) => {
    dispatch({ type: 'ADD_ROUTE_POINT', payload: { point } });
  }, []);

  const resetRoute = useCallback(() => {
    dispatch({ type: 'RESET_ROUTE' });
  }, []);

  const saveCurrentWalk = useCallback(async (): Promise<boolean> => {
    if (!state.currentSession) return false;
    
    try {
      await stopWalk();
      return true;
    } catch (error) {
      console.error('Failed to save walk:', error);
      return false;
    }
  }, [state.currentSession, stopWalk]);

  const addJournalEntry = useCallback(async (entry: JournalEntry) => {
    dispatch({ type: 'ADD_JOURNAL_ENTRY', payload: { entry } });
    
    if (!user?.id) return;
    
    try {
      const { supabase } = await import('../lib/supabase');
      if (!supabase) return;
      
      const moodMap = { happy: 4, neutral: 3, sad: 2 };
      await supabase.from('motivation_journal').insert({
        user_id: user.id,
        date: new Date(entry.timestamp).toISOString().split('T')[0],
        mood_rating: moodMap[entry.mood],
        energy_level: entry.energyLevel,
        motivation_level: Math.round(entry.motivation / 20),
        notes: entry.notes || null
      });
    } catch (error) {
      console.warn('Failed to save journal entry:', error);
    }
  }, [user?.id]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, []);

  const contextValue: WalkingContextType = {
    // State
    isWalking: state.isWalking,
    currentWalk: state.currentSession,
    routePoints: state.routePoints,
    splits: state.splits,
    lastCompletedWalk: state.lastCompletedWalk,
    
    // Stats
    todayStats: state.todayStats,
    weeklyStats: state.weeklyStats,
    monthlyStats: state.monthlyStats,
    yearlyStats: state.yearlyStats,
    weeklyGoal: state.weeklyGoal,
    motivationLevel: state.motivationLevel,
    motivationTrend: state.motivationTrend,
    
    // Journal
    journalEntries: state.journalEntries,
    
    // Actions
    startWalk,
    pauseWalk,
    resumeWalk,
    stopWalk,
    updateSteps,
    updateDistance,
    addRoutePoint,
    resetRoute,
    saveCurrentWalk,
    addJournalEntry
  };

  return (
    <WalkingContext.Provider value={contextValue}>
      {children}
    </WalkingContext.Provider>
  );
};