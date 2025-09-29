import 'react-native-url-polyfill/auto';
import 'react-native-get-random-values';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const extra = (Constants?.expoConfig?.extra || {}) as any;
const SUPABASE_URL = (process.env.EXPO_PUBLIC_SUPABASE_URL as string) || extra?.supabaseUrl;
const SUPABASE_ANON_KEY = (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string) || extra?.supabaseAnonKey;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('Supabase env vars missing: set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY or app.json extra.supabaseUrl/extra.supabaseAnonKey');
}

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export let supabase: SupabaseClient | null = null;

if (isSupabaseConfigured) {
  const authOptions: any = {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  };
  // Use AsyncStorage only on native; let Supabase use browser storage on web
  if (Platform.OS !== 'web') {
    authOptions.storage = AsyncStorage as any;
  }

  supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    auth: authOptions,
  });
}