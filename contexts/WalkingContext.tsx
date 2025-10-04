import 'react-native-get-random-values';
import React, { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { startWalkingSync, updateWalkingSession, completeWalkingSession } from '../lib/realtime-sync';
import { DataCleanupManager, CLEANUP_CONFIGS, createArrayCleanupCallback } from '../utils/dataCleanup';
import { v4 as uuidv4 } from 'uuid';
import { 
  getEnhancedWalkingManager, 
  EnhancedWalkingSession, 
  EnhancedMetrics,
  EnhancedWalkingContextManager 
} from '../lib/enhanced-walking-context';
import { QualityReport } from '../lib/data-quality-monitor';
import { MotivationService, MotivationPredictionResponse, MotivationTrendData } from '../lib/motivation-service';

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
  
  // Enhanced metrics state
  enhancedMetrics: EnhancedMetrics | null;
  qualityReport: QualityReport | null;
  dataQualityScore: number;
  isEnhancedMode: boolean;
  
  // ML Motivation Prediction state
  motivationPrediction: MotivationPredictionResponse | null;
  motivationTrendData: MotivationTrendData[] | null;
  isLoadingPrediction: boolean;
  predictionError: string | null;
  lastPredictionUpdate: number | null;
  
  // Additional motivation properties
  motivationPredictionLoading: boolean;
  motivationPredictionError: string | null;
  motivationTrendLoading: boolean;
  motivationTrendError: string | null;
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
  | { type: 'SET_SPLITS'; payload: Split[] }
  | { type: 'SET_ENHANCED_METRICS'; payload: { metrics: EnhancedMetrics } }
  | { type: 'SET_QUALITY_REPORT'; payload: { report: QualityReport } }
  | { type: 'TOGGLE_ENHANCED_MODE' }
  | { type: 'UPDATE_DATA_QUALITY_SCORE'; payload: { score: number } }
  | { type: 'SET_MOTIVATION_PREDICTION'; payload: { prediction: MotivationPredictionResponse } }
  | { type: 'SET_MOTIVATION_TREND_DATA'; payload: { trendData: MotivationTrendData[] } }
  | { type: 'SET_PREDICTION_LOADING'; payload: { isLoading: boolean } }
  | { type: 'SET_PREDICTION_ERROR'; payload: { error: string | null } }
  | { type: 'UPDATE_PREDICTION_TIMESTAMP'; payload: { timestamp: number } };

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
  
  // Enhanced metrics properties
  enhancedMetrics: EnhancedMetrics | null;
  qualityReport: QualityReport | null;
  dataQualityScore: number;
  isEnhancedMode: boolean;
  
  // ML Motivation Prediction properties
  motivationPrediction: MotivationPredictionResponse | null;
  motivationTrendData: MotivationTrendData[] | null;
  isLoadingPrediction: boolean;
  predictionError: string | null;
  lastPredictionUpdate: number | null;
  
  // Additional motivation properties
  motivationPredictionLoading: boolean;
  motivationPredictionError: string | null;
  motivationTrendLoading: boolean;
  motivationTrendError: string | null;
  
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
  
  // Enhanced methods
  toggleEnhancedMode: () => void;
  performCalibration: () => Promise<void>;
  getQualityReport: () => QualityReport | null;
  getMetricsHistory: () => EnhancedMetrics[];
  
  // ML Motivation Prediction methods
  predictMotivation: (forceRefresh?: boolean) => Promise<void>;
  getMotivationInsights: () => string[];
  getMotivationRecommendations: () => string[];
  refreshMotivationTrend: () => Promise<void>;
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
  journalEntries: [],
  
  // Enhanced metrics
  enhancedMetrics: null,
  qualityReport: null,
  dataQualityScore: 0.8, // Default quality score
  isEnhancedMode: false,
  
  // ML Motivation Prediction state
  motivationPrediction: null,
  motivationTrendData: null,
  isLoadingPrediction: false,
  predictionError: null,
  lastPredictionUpdate: null,
  
  // Additional motivation properties
  motivationPredictionLoading: false,
  motivationPredictionError: null,
  motivationTrendLoading: false,
  motivationTrendError: null
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

    case 'SET_ENHANCED_METRICS': {
      return {
        ...state,
        enhancedMetrics: action.payload.metrics
      };
    }

    case 'SET_QUALITY_REPORT': {
      return {
        ...state,
        qualityReport: action.payload.report
      };
    }

    case 'TOGGLE_ENHANCED_MODE': {
      return {
        ...state,
        isEnhancedMode: !state.isEnhancedMode
      };
    }

    case 'UPDATE_DATA_QUALITY_SCORE': {
      return {
        ...state,
        dataQualityScore: action.payload.score
      };
    }

    case 'SET_MOTIVATION_PREDICTION': {
      return {
        ...state,
        motivationPrediction: action.payload.prediction,
        predictionError: null,
        lastPredictionUpdate: Date.now()
      };
    }

    case 'SET_MOTIVATION_TREND_DATA': {
      return {
        ...state,
        motivationTrendData: action.payload.trendData
      };
    }

    case 'SET_PREDICTION_LOADING': {
      return {
        ...state,
        isLoadingPrediction: action.payload.isLoading
      };
    }

    case 'SET_PREDICTION_ERROR': {
      return {
        ...state,
        predictionError: action.payload.error,
        isLoadingPrediction: false
      };
    }

    case 'UPDATE_PREDICTION_TIMESTAMP': {
      return {
        ...state,
        lastPredictionUpdate: action.payload.timestamp
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
  const { user } = useAuth();
  const [state, dispatch] = useReducer(walkingReducer, initialState);
  
  // Enhanced walking manager
  const enhancedManagerRef = useRef<EnhancedWalkingContextManager | null>(null);
  
  // Motivation service
  const motivationServiceRef = useRef<MotivationService | null>(null);
  
  // Initialize enhanced manager
  useEffect(() => {
    if (user && !enhancedManagerRef.current) {
      enhancedManagerRef.current = getEnhancedWalkingManager();
    }
  }, [user]);
  
  // Initialize motivation service
  useEffect(() => {
    if (user && !motivationServiceRef.current) {
      motivationServiceRef.current = new MotivationService({
        apiBaseUrl: 'http://localhost:8000', // TODO: Make this configurable
        cacheExpiry: 30 * 60 * 1000, // 30 minutes
        retryAttempts: 3,
        timeout: 10000 // 10 seconds
      });
    }
  }, [user]);
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

  // Enhanced methods
  const toggleEnhancedMode = useCallback(() => {
    dispatch({ type: 'TOGGLE_ENHANCED_MODE' });
  }, []);

  const performCalibration = useCallback(async () => {
    if (!enhancedManagerRef.current) return;
    
    try {
      await enhancedManagerRef.current.performManualCalibration();
      // Update quality report after calibration
      const report = enhancedManagerRef.current.getLatestQualityReport();
      if (report) {
        dispatch({ type: 'SET_QUALITY_REPORT', payload: { report } });
        dispatch({ type: 'UPDATE_DATA_QUALITY_SCORE', payload: { score: report.overallScore } });
      }
    } catch (error) {
      console.error('Calibration failed:', error);
    }
  }, []);

  const getQualityReport = useCallback(() => {
    return state.qualityReport;
  }, [state.qualityReport]);

  const getMetricsHistory = useCallback(() => {
    if (!enhancedManagerRef.current) return [];
    return enhancedManagerRef.current.getMetricsHistory();
  }, []);

  // Enhanced metrics processing
  useEffect(() => {
    if (!state.isEnhancedMode || !enhancedManagerRef.current || !state.currentSession) return;

    const processEnhancedMetrics = async () => {
      try {
        const enhancedSession = await enhancedManagerRef.current!.enhanceWalkingSession(state.currentSession!, state.routePoints);
        const metrics = enhancedSession.enhancedMetrics;
        const report = enhancedManagerRef.current!.getLatestQualityReport();

        if (metrics) {
          dispatch({ type: 'SET_ENHANCED_METRICS', payload: { metrics } });
        }
        if (report) {
          dispatch({ type: 'SET_QUALITY_REPORT', payload: { report } });
          dispatch({ type: 'UPDATE_DATA_QUALITY_SCORE', payload: { score: report.overallScore } });
        }
      } catch (error) {
        console.error('Enhanced metrics processing failed:', error);
      }
    };

    processEnhancedMetrics();
  }, [state.currentSession, state.isEnhancedMode]);

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
      
      // Trigger motivation prediction update after journal entry
      if (motivationServiceRef.current) {
        await predictMotivation(true);
      }
    } catch (error) {
      console.warn('Failed to save journal entry:', error);
    }
  }, [user?.id]);

  // Motivation prediction methods
  const predictMotivation = useCallback(async (forceRefresh: boolean = false) => {
    if (!motivationServiceRef.current || !user?.id) return;
    
    // Check if we need to refresh
    const now = Date.now();
    const lastUpdate = state.lastPredictionUpdate;
    const cacheExpired = !lastUpdate || (now - lastUpdate) > (30 * 60 * 1000); // 30 minutes
    
    if (!forceRefresh && !cacheExpired && state.motivationPrediction) {
      return;
    }
    
    dispatch({ type: 'SET_PREDICTION_LOADING', payload: { isLoading: true } });
    dispatch({ type: 'SET_PREDICTION_ERROR', payload: { error: null } });
    
    try {
      const prediction = await motivationServiceRef.current.predictMotivation(
        state.currentSession,
        state.journalEntries,
        {
          todayStats: state.todayStats,
          weeklyStats: state.weeklyStats,
          monthlyStats: state.monthlyStats
        },
        user?.id
      );
      
      dispatch({ type: 'SET_MOTIVATION_PREDICTION', payload: { prediction } });
      dispatch({ type: 'UPDATE_PREDICTION_TIMESTAMP', payload: { timestamp: now } });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to predict motivation';
      dispatch({ type: 'SET_PREDICTION_ERROR', payload: { error: errorMessage } });
      console.error('Motivation prediction failed:', error);
    } finally {
      dispatch({ type: 'SET_PREDICTION_LOADING', payload: { isLoading: false } });
    }
  }, [state.currentSession, state.journalEntries, state.todayStats, state.weeklyStats, state.monthlyStats, state.lastPredictionUpdate, state.motivationPrediction, user?.id]);

  const getMotivationInsights = useCallback((): string[] => {
    if (!state.motivationPrediction) return [];
    
    const insights: string[] = [];
    const prediction = state.motivationPrediction;
    
    // Convert motivation_state to numeric value for display
    const motivationLevel = prediction.motivation_state === 'high' ? 80 : 
                           prediction.motivation_state === 'medium' ? 60 : 40;
    
    // Add insights based on prediction confidence
    if (prediction.confidence > 0.8) {
      insights.push(`High confidence prediction: ${motivationLevel}% motivation level (${prediction.motivation_state})`);
    } else if (prediction.confidence > 0.6) {
      insights.push(`Moderate confidence prediction: ${motivationLevel}% motivation level (${prediction.motivation_state})`);
    } else {
      insights.push(`Low confidence prediction: ${motivationLevel}% motivation level (${prediction.motivation_state})`);
    }
    
    // Add insights from the prediction's insights
    if (prediction.insights?.primaryFactors) {
      prediction.insights.primaryFactors.forEach(factor => {
        insights.push(`Key factor: ${factor}`);
      });
    }
    
    // Add trend analysis if available
    if (prediction.insights?.trendAnalysis) {
      insights.push(prediction.insights.trendAnalysis);
    }
    
    return insights;
  }, [state.motivationPrediction]);

  const getMotivationRecommendations = useCallback((): string[] => {
    if (!state.motivationPrediction) return [];
    
    const recommendations: string[] = [];
    const prediction = state.motivationPrediction;
    
    // Add the main suggestion
    if (prediction.suggestion) {
      recommendations.push(prediction.suggestion);
    }
    
    // Add recommendations from insights
    if (prediction.insights?.recommendations) {
      recommendations.push(...prediction.insights.recommendations);
    }
    
    // Add additional recommendations from the top-level recommendations array
    if (prediction.recommendations) {
      recommendations.push(...prediction.recommendations);
    }
    
    // Recommendations based on motivation state
    if (prediction.motivation_state === 'low') {
      recommendations.push('Consider a shorter, easier walk today');
      recommendations.push('Try walking with a friend or listening to upbeat music');
      recommendations.push('Set a small, achievable goal for today');
    } else if (prediction.motivation_state === 'medium') {
      recommendations.push('A moderate walk would be perfect today');
      recommendations.push('Try exploring a new route to keep things interesting');
      recommendations.push('Focus on enjoying the journey rather than distance');
    } else {
      recommendations.push('Great day for a longer or more challenging walk!');
      recommendations.push('Consider setting a new personal record');
      recommendations.push('This is a perfect time to push your limits');
    }
    
    return recommendations;
  }, [state.motivationPrediction]);

  const refreshMotivationTrend = useCallback(async () => {
    if (!motivationServiceRef.current || !user?.id) return;
    
    dispatch({ type: 'SET_PREDICTION_LOADING', payload: { isLoading: true } });
    
    try {
      // Get recent predictions to generate trend data
      const predictions: MotivationPredictionResponse[] = []; // This would come from stored predictions
      const trendData = await motivationServiceRef.current.getMotivationTrend(predictions, user.id);
      dispatch({ type: 'SET_MOTIVATION_TREND_DATA', payload: { trendData } });
    } catch (error) {
      console.error('Failed to refresh motivation trend:', error);
      dispatch({ type: 'SET_PREDICTION_ERROR', payload: { error: 'Failed to refresh motivation trend' } });
    } finally {
      dispatch({ type: 'SET_PREDICTION_LOADING', payload: { isLoading: false } });
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
    
    // Enhanced metrics properties
    enhancedMetrics: state.enhancedMetrics,
    qualityReport: state.qualityReport,
    dataQualityScore: state.dataQualityScore,
    isEnhancedMode: state.isEnhancedMode,
    
    // ML Motivation prediction properties
    motivationPrediction: state.motivationPrediction,
    motivationTrendData: state.motivationTrendData,
    isLoadingPrediction: state.isLoadingPrediction,
    predictionError: state.predictionError,
    lastPredictionUpdate: state.lastPredictionUpdate,
    
    // Additional motivation properties
    motivationPredictionLoading: state.motivationPredictionLoading,
    motivationPredictionError: state.motivationPredictionError,
    motivationTrendLoading: state.motivationTrendLoading,
    motivationTrendError: state.motivationTrendError,
    
    // Existing methods
    startWalk,
    pauseWalk,
    resumeWalk,
    stopWalk,
    updateSteps,
    updateDistance,
    addRoutePoint,
    resetRoute,
    saveCurrentWalk,
    addJournalEntry,
    
    // Enhanced methods
    toggleEnhancedMode,
    performCalibration,
    getQualityReport,
    getMetricsHistory,
    
    // ML Motivation prediction methods
    predictMotivation,
    getMotivationInsights,
    getMotivationRecommendations,
    refreshMotivationTrend
  };

  return (
    <WalkingContext.Provider value={contextValue}>
      {children}
    </WalkingContext.Provider>
  );
};