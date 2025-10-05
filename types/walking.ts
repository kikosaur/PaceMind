// Type definitions for walking-related interfaces
export type JournalEntry = {
  timestamp: number;
  mood: 'happy' | 'neutral' | 'sad';
  energyLevel: number; // 1-5
  motivation: number; // 1-100
  notes?: string;
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