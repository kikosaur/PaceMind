import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DatabaseService } from '../lib/database';
import { useAuth } from './AuthContext';

// Settings interface
export interface UserSettings {
  // Notification preferences
  walkingRemindersEnabled: boolean;
  motivationNotificationsEnabled: boolean;
  achievementNotificationsEnabled: boolean;
  
  // Walking preferences
  dailyStepGoal: number;
  preferredWalkDuration: number; // in minutes
  autoTrackingEnabled: boolean;
  
  // Privacy preferences
  shareDataForResearch: boolean;
  biometricAuthEnabled: boolean;
  locationTrackingEnabled: boolean;
  
  // Display preferences
  distanceUnit: 'km' | 'miles';
  temperatureUnit: 'celsius' | 'fahrenheit';
  darkModeEnabled: boolean;
  
  // AI preferences
  aiInsightsEnabled: boolean;
  personalizedRecommendations: boolean;
}

// Default settings
const defaultSettings: UserSettings = {
  walkingRemindersEnabled: true,
  motivationNotificationsEnabled: true,
  achievementNotificationsEnabled: true,
  dailyStepGoal: 8000,
  preferredWalkDuration: 30,
  autoTrackingEnabled: true,
  shareDataForResearch: false,
  biometricAuthEnabled: false,
  locationTrackingEnabled: true,
  distanceUnit: 'km',
  temperatureUnit: 'celsius',
  darkModeEnabled: false,
  aiInsightsEnabled: true,
  personalizedRecommendations: true,
};

interface SettingsContextType {
  settings: UserSettings;
  updateSetting: <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => Promise<void>;
  updateSettings: (newSettings: Partial<UserSettings>) => Promise<void>;
  resetSettings: () => Promise<void>;
  isLoading: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

interface SettingsProviderProps {
  children: ReactNode;
}

export function SettingsProvider({ children }: SettingsProviderProps) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);

  // Load settings on mount and when user changes
  const loadSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      
      if (user) {
        // Load from database for authenticated users
        const profile = await DatabaseService.getProfile(user.id);
        if (profile) {
          const dbSettings: Partial<UserSettings> = {
            dailyStepGoal: profile.daily_step_goal,
            preferredWalkDuration: profile.preferred_walk_duration,
            walkingRemindersEnabled: profile.notification_enabled,
            biometricAuthEnabled: profile.biometric_enabled,
          };
          
          // Merge with local storage settings for other preferences
          const localSettings = await loadLocalSettings();
          setSettings({ ...defaultSettings, ...localSettings, ...dbSettings });
        } else {
          // Fallback to local storage
          const localSettings = await loadLocalSettings();
          setSettings({ ...defaultSettings, ...localSettings });
        }
      } else {
        // Load from local storage for unauthenticated users
        const localSettings = await loadLocalSettings();
        setSettings({ ...defaultSettings, ...localSettings });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      setSettings(defaultSettings);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const loadLocalSettings = async (): Promise<Partial<UserSettings>> => {
    try {
      const stored = await AsyncStorage.getItem('userSettings');
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('Error loading local settings:', error);
      return {};
    }
  };

  const saveLocalSettings = async (newSettings: UserSettings) => {
    try {
      await AsyncStorage.setItem('userSettings', JSON.stringify(newSettings));
    } catch (error) {
      console.error('Error saving local settings:', error);
    }
  };

  const saveDatabaseSettings = async (newSettings: UserSettings) => {
    if (!user) {
      console.log('No user found, skipping database save');
      return;
    }

    try {
      console.log('Saving to database:', {
        daily_step_goal: newSettings.dailyStepGoal,
        preferred_walk_duration: newSettings.preferredWalkDuration,
        notification_enabled: newSettings.walkingRemindersEnabled,
        biometric_enabled: newSettings.biometricAuthEnabled,
      });

      const profileUpdates = {
        daily_step_goal: newSettings.dailyStepGoal,
        preferred_walk_duration: newSettings.preferredWalkDuration,
        notification_enabled: newSettings.walkingRemindersEnabled,
        biometric_enabled: newSettings.biometricAuthEnabled,
      };

      const result = await DatabaseService.updateProfile(user.id, profileUpdates);
      console.log('Database save result:', result);
    } catch (error) {
      console.error('Error saving database settings:', error);
      throw error; // Re-throw to be caught by the calling function
    }
  };

  const updateSetting = async <K extends keyof UserSettings>(
    key: K,
    value: UserSettings[K]
  ) => {
    console.log(`Updating setting: ${key} = ${value}`);
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    
    // Save to both local storage and database
    try {
      await Promise.all([
        saveLocalSettings(newSettings),
        saveDatabaseSettings(newSettings),
      ]);
      console.log(`Successfully saved setting: ${key} = ${value}`);
    } catch (error) {
      console.error(`Error saving setting ${key}:`, error);
    }
  };

  const updateSettings = async (newSettings: Partial<UserSettings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);
    
    // Save to both local storage and database
    await Promise.all([
      saveLocalSettings(updatedSettings),
      saveDatabaseSettings(updatedSettings),
    ]);
  };

  const resetSettings = async () => {
    setSettings(defaultSettings);
    
    // Clear local storage and reset database settings
    await Promise.all([
      AsyncStorage.removeItem('userSettings'),
      saveDatabaseSettings(defaultSettings),
    ]);
  };

  const contextValue: SettingsContextType = {
    settings,
    updateSetting,
    updateSettings,
    resetSettings,
    isLoading,
  };

  return (
    <SettingsContext.Provider value={contextValue}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}

// Utility hooks for specific settings
export function useNotificationSettings() {
  const { settings, updateSetting } = useSettings();
  
  return {
    walkingRemindersEnabled: settings.walkingRemindersEnabled,
    motivationNotificationsEnabled: settings.motivationNotificationsEnabled,
    achievementNotificationsEnabled: settings.achievementNotificationsEnabled,
    setWalkingReminders: (enabled: boolean) => updateSetting('walkingRemindersEnabled', enabled),
    setMotivationNotifications: (enabled: boolean) => updateSetting('motivationNotificationsEnabled', enabled),
    setAchievementNotifications: (enabled: boolean) => updateSetting('achievementNotificationsEnabled', enabled),
  };
}

export function useWalkingSettings() {
  const { settings, updateSetting } = useSettings();
  
  return {
    dailyStepGoal: settings.dailyStepGoal,
    preferredWalkDuration: settings.preferredWalkDuration,
    autoTrackingEnabled: settings.autoTrackingEnabled,
    setDailyStepGoal: (goal: number) => updateSetting('dailyStepGoal', goal),
    setPreferredWalkDuration: (duration: number) => updateSetting('preferredWalkDuration', duration),
    setAutoTracking: (enabled: boolean) => updateSetting('autoTrackingEnabled', enabled),
  };
}

export function usePrivacySettings() {
  const { settings, updateSetting } = useSettings();
  
  return {
    shareDataForResearch: settings.shareDataForResearch,
    biometricAuthEnabled: settings.biometricAuthEnabled,
    locationTrackingEnabled: settings.locationTrackingEnabled,
    setDataSharing: (enabled: boolean) => updateSetting('shareDataForResearch', enabled),
    setBiometricAuth: (enabled: boolean) => updateSetting('biometricAuthEnabled', enabled),
    setLocationTracking: (enabled: boolean) => updateSetting('locationTrackingEnabled', enabled),
  };
}

export function useDisplaySettings() {
  const { settings, updateSetting } = useSettings();
  
  return {
    distanceUnit: settings.distanceUnit,
    temperatureUnit: settings.temperatureUnit,
    darkModeEnabled: settings.darkModeEnabled,
    setDistanceUnit: (unit: 'km' | 'miles') => updateSetting('distanceUnit', unit),
    setTemperatureUnit: (unit: 'celsius' | 'fahrenheit') => updateSetting('temperatureUnit', unit),
    setDarkMode: (enabled: boolean) => updateSetting('darkModeEnabled', enabled),
  };
}