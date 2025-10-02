import { supabase } from './supabase';

// Type definitions for database tables
export interface Profile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
  preferred_walk_duration: number;
  daily_step_goal: number;
  notification_enabled: boolean;
  biometric_enabled: boolean;
  total_walks: number;
  total_distance: number;
  total_steps: number;
  current_streak: number;
  longest_streak: number;
}

export interface WalkingSession {
  id: string;
  user_id: string;
  created_at: string;
  start_time: string;
  end_time?: string;
  duration?: number;
  steps: number;
  distance: number;
  average_pace?: number;
  calories_burned?: number;
  route_coordinates?: {lat: number; lng: number; timestamp: string}[];
  start_location?: {lat: number; lng: number; address?: string};
  end_location?: {lat: number; lng: number; address?: string};
  status: 'active' | 'completed' | 'paused' | 'cancelled';
  weather_condition?: string;
  temperature?: number;
  humidity?: number;
  pre_walk_mood?: number;
  post_walk_mood?: number;
  motivation_level?: number;
  predicted_motivation?: number;
  intervention_applied?: string;
  intervention_effective?: boolean;
}

export interface MotivationJournal {
  id: string;
  user_id: string;
  created_at: string;
  date: string;
  mood_rating: number;
  energy_level: number;
  motivation_level: number;
  weather_rating: number;
  sleep_quality: number;
  stress_level: number;
  notes?: string;
  goals_for_day?: string;
  walked_today: boolean;
  met_step_goal: boolean;
}

export interface UserGoal {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  type: 'daily_steps' | 'weekly_walks' | 'monthly_distance' | 'streak' | 'weight_loss' | 'custom';
  title: string;
  description?: string;
  target_value: number;
  current_value: number;
  unit?: string;
  start_date: string;
  target_date: string;
  status: 'active' | 'completed' | 'paused' | 'cancelled';
  completed_at?: string;
  progress_percentage: number;
  milestones?: any[];
}

// Custom error types for better error handling
export class DatabaseError extends Error {
  constructor(message: string, public code?: string, public details?: any) {
    super(message);
    this.name = 'DatabaseError';
  }
}

// Result type for consistent return values
export type DatabaseResult<T> = {
  success: true;
  data: T;
} | {
  success: false;
  error: string;
  code?: string;
};

// Utility functions for validation
const validateUserId = (userId: string): boolean => {
  return typeof userId === 'string' && userId.trim().length > 0;
};

const validateDateString = (date: string): boolean => {
  return !isNaN(Date.parse(date));
};

const ensureSupabaseClient = () => {
  if (!supabase) {
    throw new DatabaseError('Supabase client not initialized', 'CLIENT_NOT_INITIALIZED');
  }
  return supabase;
};

// Database utility functions with improved error handling and type safety
export class DatabaseService {
  // Profile operations
  static async getProfile(userId: string): Promise<DatabaseResult<Profile>> {
    try {
      if (!validateUserId(userId)) {
        return { success: false, error: 'Invalid user ID provided' };
      }

      const client = ensureSupabaseClient();
      const { data, error } = await client
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return { 
          success: false, 
          error: 'Failed to fetch profile', 
          code: error.code 
        };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Unexpected error in getProfile:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  static async updateProfile(userId: string, updates: Partial<Profile>): Promise<DatabaseResult<Profile[]>> {
    try {
      if (!validateUserId(userId)) {
        return { success: false, error: 'Invalid user ID provided' };
      }

      if (!updates || Object.keys(updates).length === 0) {
        return { success: false, error: 'No updates provided' };
      }

      console.log('DatabaseService.updateProfile called with:', { userId, updates });
      
      const client = ensureSupabaseClient();
      const { data, error } = await client
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select();

      if (error) {
        console.error('Database update error:', error);
        return { 
          success: false, 
          error: 'Failed to update profile', 
          code: error.code 
        };
      }

      console.log('Profile updated successfully:', data);
      return { success: true, data };
    } catch (error) {
      console.error('Unexpected error in updateProfile:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  static async createProfile(profile: Omit<Profile, 'created_at' | 'updated_at'>): Promise<DatabaseResult<null>> {
    try {
      if (!validateUserId(profile.id)) {
        return { success: false, error: 'Invalid profile ID provided' };
      }

      const client = ensureSupabaseClient();
      const { error } = await client
        .from('profiles')
        .insert(profile);

      if (error) {
        console.error('Error creating profile:', error);
        return { 
          success: false, 
          error: 'Failed to create profile', 
          code: error.code 
        };
      }

      return { success: true, data: null };
    } catch (error) {
      console.error('Unexpected error in createProfile:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  // Walking session operations
  static async createWalkingSession(session: Omit<WalkingSession, 'id' | 'created_at'>): Promise<DatabaseResult<string>> {
    try {
      if (!validateUserId(session.user_id)) {
        return { success: false, error: 'Invalid user ID provided' };
      }

      const client = ensureSupabaseClient();
      const { data, error } = await client
        .from('walking_sessions')
        .insert([session])
        .select('id')
        .single();

      if (error) {
        console.error('Error creating walking session:', error);
        return { 
          success: false, 
          error: 'Failed to create walking session', 
          code: error.code 
        };
      }

      return { success: true, data: data.id };
    } catch (error) {
      console.error('Unexpected error in createWalkingSession:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  static async updateWalkingSession(sessionId: string, updates: Partial<WalkingSession>): Promise<DatabaseResult<null>> {
    try {
      if (!sessionId || sessionId.trim().length === 0) {
        return { success: false, error: 'Invalid session ID provided' };
      }

      if (!updates || Object.keys(updates).length === 0) {
        return { success: false, error: 'No updates provided' };
      }

      const client = ensureSupabaseClient();
      const { error } = await client
        .from('walking_sessions')
        .update(updates)
        .eq('id', sessionId);

      if (error) {
        console.error('Error updating walking session:', error);
        return { 
          success: false, 
          error: 'Failed to update walking session', 
          code: error.code 
        };
      }

      return { success: true, data: null };
    } catch (error) {
      console.error('Unexpected error in updateWalkingSession:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  static async getWalkingSessions(
    userId: string, 
    options: { limit?: number; offset?: number } = {}
  ): Promise<DatabaseResult<WalkingSession[]>> {
    try {
      if (!validateUserId(userId)) {
        return { success: false, error: 'Invalid user ID provided' };
      }

      const { limit = 10, offset = 0 } = options;
      
      if (limit < 1 || limit > 100) {
        return { success: false, error: 'Limit must be between 1 and 100' };
      }

      const client = ensureSupabaseClient();
      const { data, error } = await client
        .from('walking_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('start_time', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Error fetching walking sessions:', error);
        return { 
          success: false, 
          error: 'Failed to fetch walking sessions', 
          code: error.code 
        };
      }

      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Unexpected error in getWalkingSessions:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  static async getActiveWalkingSession(userId: string): Promise<DatabaseResult<WalkingSession | null>> {
    try {
      if (!validateUserId(userId)) {
        return { success: false, error: 'Invalid user ID provided' };
      }

      const client = ensureSupabaseClient();
      const { data, error } = await client
        .from('walking_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      if (error) {
        if (error.code === 'PGRST116') { // Not found error
          return { success: true, data: null };
        }
        console.error('Error fetching active walking session:', error);
        return { 
          success: false, 
          error: 'Failed to fetch active walking session', 
          code: error.code 
        };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Unexpected error in getActiveWalkingSession:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  // Statistics and analytics with improved date handling
  static async getDailyStats(userId: string, date: string): Promise<DatabaseResult<{steps: number; distance: number; duration: number; calories: number}>> {
    try {
      if (!validateUserId(userId)) {
        return { success: false, error: 'Invalid user ID provided' };
      }

      if (!validateDateString(date)) {
        return { success: false, error: 'Invalid date format provided' };
      }

      const client = ensureSupabaseClient();
      
      // Fix the date range query to properly handle the full day
      const startOfDay = `${date}T00:00:00.000Z`;
      const endOfDay = `${date}T23:59:59.999Z`;

      const { data, error } = await client
        .from('walking_sessions')
        .select('steps, distance, duration, calories_burned')
        .eq('user_id', userId)
        .gte('start_time', startOfDay)
        .lte('start_time', endOfDay)
        .eq('status', 'completed');

      if (error) {
        console.error('Error fetching daily stats:', error);
        return { 
          success: false, 
          error: 'Failed to fetch daily stats', 
          code: error.code 
        };
      }

      const totals = (data || []).reduce(
        (acc, session) => ({
          steps: acc.steps + (session.steps || 0),
          distance: acc.distance + (session.distance || 0),
          duration: acc.duration + (session.duration || 0),
          calories: acc.calories + (session.calories_burned || 0),
        }),
        { steps: 0, distance: 0, duration: 0, calories: 0 }
      );

      return { success: true, data: totals };
    } catch (error) {
      console.error('Unexpected error in getDailyStats:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  static async getWeeklyStats(userId: string, startDate: string): Promise<DatabaseResult<{steps: number; distance: number; duration: number; calories: number; sessions: number}>> {
    try {
      if (!validateUserId(userId)) {
        return { success: false, error: 'Invalid user ID provided' };
      }

      if (!validateDateString(startDate)) {
        return { success: false, error: 'Invalid start date format provided' };
      }

      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 7);

      const client = ensureSupabaseClient();
      const { data, error } = await client
        .from('walking_sessions')
        .select('steps, distance, duration, calories_burned, start_time')
        .eq('user_id', userId)
        .gte('start_time', startDate)
        .lt('start_time', endDate.toISOString())
        .eq('status', 'completed');

      if (error) {
        console.error('Error fetching weekly stats:', error);
        return { 
          success: false, 
          error: 'Failed to fetch weekly stats', 
          code: error.code 
        };
      }

      const totals = (data || []).reduce(
        (acc, session) => ({
          steps: acc.steps + (session.steps || 0),
          distance: acc.distance + (session.distance || 0),
          duration: acc.duration + (session.duration || 0),
          calories: acc.calories + (session.calories_burned || 0),
          sessions: acc.sessions + 1,
        }),
        { steps: 0, distance: 0, duration: 0, calories: 0, sessions: 0 }
      );

      return { success: true, data: totals };
    } catch (error) {
      console.error('Unexpected error in getWeeklyStats:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  // Motivation journal operations (simplified for brevity - same pattern applies)
  static async createJournalEntry(entry: Omit<MotivationJournal, 'id' | 'created_at'>): Promise<DatabaseResult<null>> {
    try {
      if (!validateUserId(entry.user_id)) {
        return { success: false, error: 'Invalid user ID provided' };
      }

      const client = ensureSupabaseClient();
      const { error } = await client
        .from('motivation_journal')
        .insert([entry]);

      if (error) {
        console.error('Error creating journal entry:', error);
        return { 
          success: false, 
          error: 'Failed to create journal entry', 
          code: error.code 
        };
      }

      return { success: true, data: null };
    } catch (error) {
      console.error('Unexpected error in createJournalEntry:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  // Additional utility methods for better performance
  static async batchUpdateProfiles(updates: {userId: string; data: Partial<Profile>}[]): Promise<DatabaseResult<null>> {
    try {
      const client = ensureSupabaseClient();
      
      // Validate all user IDs first
      for (const update of updates) {
        if (!validateUserId(update.userId)) {
          return { success: false, error: `Invalid user ID: ${update.userId}` };
        }
      }

      // Execute batch update
      const promises = updates.map(({ userId, data }) =>
        client.from('profiles').update(data).eq('id', userId)
      );

      const results = await Promise.allSettled(promises);
      
      // Check for any failures
      const failures = results.filter(result => result.status === 'rejected');
      if (failures.length > 0) {
        console.error('Batch update failures:', failures);
        return { success: false, error: 'Some profile updates failed' };
      }

      return { success: true, data: null };
    } catch (error) {
      console.error('Unexpected error in batchUpdateProfiles:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }
}

export default DatabaseService;