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

// Database utility functions
export class DatabaseService {
  // Profile operations
  static async getProfile(userId: string): Promise<Profile | null> {
    if (!supabase) {
      console.error('Supabase client not initialized');
      return null;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }

    return data;
  }

  static async updateProfile(userId: string, updates: Partial<Profile>) {
    console.log('DatabaseService.updateProfile called with:', { userId, updates });
    
    if (!supabase) {
      throw new Error('Supabase is not configured');
    }
    
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select();

    if (error) {
      console.error('Database update error:', error);
      throw error;
    }

    console.log('Profile updated successfully:', data);
    return data;
  }

  static async createProfile(profile: Omit<Profile, 'created_at' | 'updated_at'>): Promise<boolean> {
    if (!supabase) {
      console.error('Supabase client not initialized');
      return false;
    }

    const { error } = await supabase
      .from('profiles')
      .insert(profile);

    if (error) {
      console.error('Error creating profile:', error);
      return false;
    }

    return true;
  }

  // Walking session operations
  static async createWalkingSession(session: Omit<WalkingSession, 'id' | 'created_at'>): Promise<string | null> {
    if (!supabase) {
      console.error('Supabase client not initialized');
      return null;
    }

    const { data, error } = await supabase
      .from('walking_sessions')
      .insert([session])
      .select('id')
      .single();

    if (error) {
      console.error('Error creating walking session:', error);
      return null;
    }

    return data.id;
  }

  static async updateWalkingSession(sessionId: string, updates: Partial<WalkingSession>): Promise<boolean> {
    if (!supabase) {
      console.error('Supabase client not initialized');
      return false;
    }

    const { error } = await supabase
      .from('walking_sessions')
      .update(updates)
      .eq('id', sessionId);

    if (error) {
      console.error('Error updating walking session:', error);
      return false;
    }

    return true;
  }

  static async getWalkingSessions(userId: string, limit = 10): Promise<WalkingSession[]> {
    if (!supabase) {
      console.error('Supabase client not initialized');
      return [];
    }

    const { data, error } = await supabase
      .from('walking_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('start_time', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching walking sessions:', error);
      return [];
    }

    return data || [];
  }

  static async getActiveWalkingSession(userId: string): Promise<WalkingSession | null> {
    if (!supabase) {
      console.error('Supabase client not initialized');
      return null;
    }

    const { data, error } = await supabase
      .from('walking_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (error) {
      if (error.code !== 'PGRST116') { // Not found error
        console.error('Error fetching active walking session:', error);
      }
      return null;
    }

    return data;
  }

  // Motivation journal operations
  static async createJournalEntry(entry: Omit<MotivationJournal, 'id' | 'created_at'>): Promise<boolean> {
    if (!supabase) {
      console.error('Supabase client not initialized');
      return false;
    }

    const { error } = await supabase
      .from('motivation_journal')
      .insert([entry]);

    if (error) {
      console.error('Error creating journal entry:', error);
      return false;
    }

    return true;
  }

  static async getJournalEntries(userId: string, limit = 30): Promise<MotivationJournal[]> {
    if (!supabase) {
      console.error('Supabase client not initialized');
      return [];
    }

    const { data, error } = await supabase
      .from('motivation_journal')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching journal entries:', error);
      return [];
    }

    return data || [];
  }

  static async getJournalEntry(userId: string, date: string): Promise<MotivationJournal | null> {
    if (!supabase) {
      console.error('Supabase client not initialized');
      return null;
    }

    const { data, error } = await supabase
      .from('motivation_journal')
      .select('*')
      .eq('user_id', userId)
      .eq('date', date)
      .single();

    if (error) {
      if (error.code !== 'PGRST116') { // Not found error
        console.error('Error fetching journal entry:', error);
      }
      return null;
    }

    return data;
  }

  // User goals operations
  static async createUserGoal(goal: Omit<UserGoal, 'id' | 'created_at' | 'updated_at'>): Promise<boolean> {
    if (!supabase) {
      console.error('Supabase client not initialized');
      return false;
    }

    const { error } = await supabase
      .from('user_goals')
      .insert([goal]);

    if (error) {
      console.error('Error creating user goal:', error);
      return false;
    }

    return true;
  }

  static async getUserGoals(userId: string): Promise<UserGoal[]> {
    if (!supabase) {
      console.error('Supabase client not initialized');
      return [];
    }

    const { data, error } = await supabase
      .from('user_goals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user goals:', error);
      return [];
    }

    return data || [];
  }

  static async updateUserGoal(goalId: string, updates: Partial<UserGoal>): Promise<boolean> {
    if (!supabase) {
      console.error('Supabase client not initialized');
      return false;
    }

    const { error } = await supabase
      .from('user_goals')
      .update(updates)
      .eq('id', goalId);

    if (error) {
      console.error('Error updating user goal:', error);
      return false;
    }

    return true;
  }

  // Statistics and analytics
  static async getDailyStats(userId: string, date: string) {
    if (!supabase) {
      console.error('Supabase client not initialized');
      return { steps: 0, distance: 0, duration: 0, calories: 0 };
    }

    const { data, error } = await supabase
      .from('walking_sessions')
      .select('steps, distance, duration, calories_burned')
      .eq('user_id', userId)
      .gte('start_time', `${date}T00:00:00`)
      .lt('start_time', `${date}T23:59:59`)
      .eq('status', 'completed');

    if (error) {
      console.error('Error fetching daily stats:', error);
      return { steps: 0, distance: 0, duration: 0, calories: 0 };
    }

    const totals = data.reduce(
      (acc, session) => ({
        steps: acc.steps + (session.steps || 0),
        distance: acc.distance + (session.distance || 0),
        duration: acc.duration + (session.duration || 0),
        calories: acc.calories + (session.calories_burned || 0),
      }),
      { steps: 0, distance: 0, duration: 0, calories: 0 }
    );

    return totals;
  }

  static async getWeeklyStats(userId: string, startDate: string) {
    if (!supabase) {
      console.error('Supabase client not initialized');
      return { steps: 0, distance: 0, duration: 0, calories: 0, sessions: 0 };
    }

    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 7);

    const { data, error } = await supabase
      .from('walking_sessions')
      .select('steps, distance, duration, calories_burned, start_time')
      .eq('user_id', userId)
      .gte('start_time', startDate)
      .lt('start_time', endDate.toISOString())
      .eq('status', 'completed');

    if (error) {
      console.error('Error fetching weekly stats:', error);
      return { steps: 0, distance: 0, duration: 0, calories: 0, sessions: 0 };
    }

    const totals = data.reduce(
      (acc, session) => ({
        steps: acc.steps + (session.steps || 0),
        distance: acc.distance + (session.distance || 0),
        duration: acc.duration + (session.duration || 0),
        calories: acc.calories + (session.calories_burned || 0),
        sessions: acc.sessions + 1,
      }),
      { steps: 0, distance: 0, duration: 0, calories: 0, sessions: 0 }
    );

    return totals;
  }
}

export default DatabaseService;