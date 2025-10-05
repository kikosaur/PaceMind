import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { DatabaseService, Profile } from '@/lib/database';
import UserProfileForm from '@/components/UserProfileForm';
import { NotificationService, NotificationPreferences } from '../../services/notification-service';

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileFormVisible, setProfileFormVisible] = useState(false);
  const [goalsModalVisible, setGoalsModalVisible] = useState(false);
  const [notificationPrefsVisible, setNotificationPrefsVisible] = useState(false);
  const [tempStepGoal, setTempStepGoal] = useState('');
  const [tempWalkDuration, setTempWalkDuration] = useState('');
  const [stepGoalError, setStepGoalError] = useState('');
  const [walkDurationError, setWalkDurationError] = useState('');
  const [autoTrackingEnabled, setAutoTrackingEnabled] = useState(false);
  const [howToUseModalVisible, setHowToUseModalVisible] = useState(false);
  
  // Notification preferences state
  const [notificationPrefs, setNotificationPrefs] = useState({
    enabled: true,
    frequency: 'medium' as 'low' | 'medium' | 'high',
    inactivityReminders: true,
    motivationalMessages: true,
    achievementAlerts: true,
    walkingReminders: true,
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '06:00',
    allowDuringWalks: false,
    vibrationEnabled: true,
    soundEnabled: true
  });

  const loadProfile = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      let profile = await DatabaseService.getProfile(user.id);
      
      if (!profile) {
        // Create default profile if none exists
        const defaultProfile = {
          id: user.id,
          email: user.email || '',
          full_name: user.user_metadata?.full_name || '',
          preferred_walk_duration: 30,
          daily_step_goal: 10000,
          notification_enabled: true,
          biometric_enabled: false,
          auto_tracking: false,
          total_walks: 0,
          total_distance: 0,
          total_steps: 0,
          current_streak: 0,
          longest_streak: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        
        await DatabaseService.createProfile(defaultProfile);
        profile = defaultProfile;
      }
      
      setProfile(profile);
      if (profile) {
        setTempStepGoal(profile.daily_step_goal.toString());
        setTempWalkDuration(profile.preferred_walk_duration.toString());
        setAutoTrackingEnabled(profile.auto_tracking);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Load profile data on component mount
  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleProfileUpdate = () => {
    loadProfile(); // Reload profile data after update
  };
  const validateStepGoal = (value: string): boolean => {
    const num = parseInt(value, 10);
    return !isNaN(num) && num >= 1000 && num <= 50000;
  };

  const validateWalkDuration = (value: string): boolean => {
    const num = parseInt(value, 10);
    return !isNaN(num) && num >= 5 && num <= 180;
  };

  // Handle saving goals
  const handleSaveGoals = async () => {
    try {
      // Reset error states
      setStepGoalError('');
      setWalkDurationError('');
      
      let hasErrors = false;
      
      // Validate step goal
      if (!validateStepGoal(tempStepGoal)) {
        setStepGoalError('Step goal must be between 1,000 and 50,000 steps');
        hasErrors = true;
      }
      
      // Validate walk duration
      if (!validateWalkDuration(tempWalkDuration)) {
        setWalkDurationError('Walk duration must be between 5 and 180 minutes');
        hasErrors = true;
      }
      
      if (hasErrors) {
        return;
      }

      const stepGoal = parseInt(tempStepGoal);
      const walkDuration = parseInt(tempWalkDuration);

      if (!user?.id) {
        Alert.alert('Error', 'User not authenticated');
        return;
      }

      await DatabaseService.updateProfile(user.id, {
        daily_step_goal: stepGoal,
        preferred_walk_duration: walkDuration,
        auto_tracking: autoTrackingEnabled,
      });

      setProfile(prev => prev ? {
        ...prev,
        daily_step_goal: stepGoal,
        preferred_walk_duration: walkDuration,
        auto_tracking: autoTrackingEnabled,
      } : null);

      setGoalsModalVisible(false);
      Alert.alert('Success', 'Your goals have been updated successfully!');
    } catch (error) {
      console.error('Error updating goals:', error);
      Alert.alert('Error', 'Failed to update goals. Please try again.');
    }
  };

  // Open goals modal with current values
  const openGoalsModal = () => {
    setTempStepGoal((profile?.daily_step_goal || 10000).toString());
    setTempWalkDuration((profile?.preferred_walk_duration || 30).toString());
    setStepGoalError('');
    setWalkDurationError('');
    setGoalsModalVisible(true);
  };

  // Navigate to onboarding tutorial
  const handleOpenTutorial = () => {
    setHowToUseModalVisible(false);
    router.push('/(onboarding)/tutorial');
  };

  // Navigate to full onboarding flow
  const handleOpenOnboarding = () => {
    setHowToUseModalVisible(false);
    router.push('/(onboarding)');
  };

  const displayName = (user?.user_metadata as any)?.name
    ?? (user?.user_metadata as any)?.full_name
    ?? user?.email
    ?? 'Walker';

  const handleNotificationToggle = async (type: 'notification_enabled' | 'biometric_enabled', value: boolean) => {
    if (!profile || !user) {
      Alert.alert('Error', 'Profile not loaded. Please try again.');
      return;
    }

    try {
      const updates = { [type]: value };
      await DatabaseService.updateProfile(user.id, updates);
      
      // Update local profile state
      setProfile({ ...profile, [type]: value });
    } catch (error) {
      console.error('Error updating notification settings:', error);
      
      // Provide more specific error messages
      const errorMessage = error instanceof Error 
        ? `Failed to update settings: ${error.message}`
        : 'Failed to update notification settings. Please check your connection and try again.';
      
      Alert.alert('Error', errorMessage);
      
      // Optionally revert the UI state if needed
      // The Switch component will automatically revert since we didn't update the state
    }
  };

  const handleSignOut = async () => {
    try {
      console.log('Signing out...');
      await logout();
    } catch (error) {
      console.error('Sign out error:', error);
      Alert.alert('Error', 'Failed to sign out. Please try again.');
    }
  };

  // Notification preferences handlers
  const loadNotificationPreferences = useCallback(async () => {
    if (!user) return;
    
    try {
      const notificationService = NotificationService.getInstance();
      const prefs = await notificationService.getUserPreferences(user.id);
      if (prefs) {
        setNotificationPrefs({
          enabled: prefs.enabled,
          frequency: prefs.frequency,
          inactivityReminders: prefs.inactivityReminders,
          motivationalMessages: prefs.motivationalMessages,
          achievementAlerts: prefs.achievementAlerts,
          walkingReminders: prefs.walkingReminders,
          quietHoursEnabled: prefs.quietHoursEnabled,
          quietHoursStart: prefs.quietHoursStart,
          quietHoursEnd: prefs.quietHoursEnd,
          allowDuringWalks: prefs.allowDuringWalks,
          vibrationEnabled: prefs.vibrationEnabled,
          soundEnabled: prefs.soundEnabled
        });
      }
    } catch (error) {
      console.warn('Failed to load notification preferences:', error);
    }
  }, [user]);

  const saveNotificationPreferences = async () => {
    if (!user) return;
    
    try {
      const notificationService = NotificationService.getInstance();
      
      // Convert local preferences to match NotificationPreferences interface
      const preferencesToSave: NotificationPreferences = {
        enabled: notificationPrefs.enabled,
        frequency: notificationPrefs.frequency,
        activeHours: {
          morning: true,
          afternoon: true,
          evening: true
        },
        categories: {
          motivational: notificationPrefs.motivationalMessages,
          progress: true,
          reminders: notificationPrefs.inactivityReminders,
          achievements: notificationPrefs.achievementAlerts
        },
        inactivityReminders: notificationPrefs.inactivityReminders,
        motivationalMessages: notificationPrefs.motivationalMessages,
        achievementAlerts: notificationPrefs.achievementAlerts,
        walkingReminders: notificationPrefs.walkingReminders,
        quietHoursEnabled: notificationPrefs.quietHoursEnabled,
        quietHoursStart: notificationPrefs.quietHoursStart,
        quietHoursEnd: notificationPrefs.quietHoursEnd,
        allowDuringWalks: notificationPrefs.allowDuringWalks,
        vibrationEnabled: notificationPrefs.vibrationEnabled,
        soundEnabled: notificationPrefs.soundEnabled
      };
      
      await notificationService.updateUserPreferences(user.id, preferencesToSave);
      Alert.alert('Success', 'Notification preferences saved successfully');
      setNotificationPrefsVisible(false);
    } catch (error) {
      console.error('Failed to save notification preferences:', error);
      Alert.alert('Error', 'Failed to save notification preferences');
    }
  };

  const updateNotificationPref = (key: string, value: any) => {
    setNotificationPrefs(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Load notification preferences on component mount
  useEffect(() => {
    loadNotificationPreferences();
  }, [loadNotificationPreferences]);

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  const settingsGroups = [
    {
      title: 'Profile',
      items: [
        {
          icon: Ionicons,
          iconName: 'person',
          title: 'Personal Information',
          subtitle: profile?.full_name || 'Complete your profile',
          onPress: () => setProfileFormVisible(true),
        },
        {
          icon: Ionicons,
          iconName: 'flag',
          title: 'Goals & Targets',
          subtitle: `${(profile?.daily_step_goal || 10000).toLocaleString()} steps • ${profile?.preferred_walk_duration || 30} min walks`,
          onPress: openGoalsModal,
        },
      ],
    },
    {
      title: 'Notifications',
      items: [
        {
          icon: Ionicons,
          iconName: 'notifications',
          title: 'Smart Notifications',
          subtitle: 'AI-powered motivational messages',
          onPress: () => setNotificationPrefsVisible(true),
        },
        {
          icon: Ionicons,
          iconName: 'notifications',
          title: 'Walking Reminders',
          subtitle: 'Get motivated to walk',
          toggle: true,
          value: profile?.notification_enabled || false,
          onToggle: (value: boolean) => handleNotificationToggle('notification_enabled', value),
        },
        {
          icon: Ionicons,
          iconName: 'fitness',
          title: 'Biometric Tracking',
          subtitle: 'Track health metrics',
          toggle: true,
          value: profile?.biometric_enabled || false,
          onToggle: (value: boolean) => handleNotificationToggle('biometric_enabled', value),
        },
      ],
    },
    {
      title: 'Privacy & Security',
      items: [
        {
          icon: Ionicons,
          iconName: 'shield',
          title: 'Data Privacy',
          subtitle: 'Manage your data',
          onPress: () => {},
        },
      ],
    },
    {
      title: 'Support',
      items: [
        {
          icon: Ionicons,
          iconName: 'help-circle',
          title: 'Help & Support',
          subtitle: 'Get help with the app',
          onPress: () => {},
        },
        {
          icon: Ionicons,
          iconName: 'book',
          title: 'How to Use AmiOkiks',
          subtitle: 'Complete guide and tutorial',
          onPress: () => setHowToUseModalVisible(true),
        },
      ],
    },
  ];

  const renderSettingItem = (item: any, key: string) => (
    <TouchableOpacity
      key={key}
      style={styles.settingItem}
      onPress={() => {
        if (item.onPress && typeof item.onPress === 'function') {
          item.onPress();
        }
      }}
      disabled={item.toggle}
    >
      <View style={styles.settingLeft}>
        <View style={styles.settingIcon}>
          <item.icon name={item.iconName} color="#4CAF50" size={20} />
        </View>
        <View style={styles.settingContent}>
          <Text style={styles.settingTitle}>{item.title}</Text>
          <Text style={styles.settingSubtitle}>{item.subtitle}</Text>
        </View>
      </View>
      <View style={styles.settingRight}>
        {item.toggle ? (
          <Switch
            value={item.value}
            onValueChange={item.onToggle}
            trackColor={{ false: '#E5E5E5', true: '#4CAF50' }}
            thumbColor={item.value ? 'white' : '#f4f3f4'}
          />
        ) : (
          <Ionicons name="chevron-forward" color="#666" size={20} />
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
        <Text style={styles.headerSubtitle}>Customize your experience</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* User Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileAvatar}>
            <Ionicons name="person" color="white" size={32} />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{displayName}</Text>
            <Text style={styles.profileEmail}>{user?.email}</Text>
          </View>
        </View>

        {/* Settings Groups */}
        {settingsGroups.map((group: any, groupIndex: number) => (
          <View key={`group-${group.title}-${groupIndex}`} style={styles.settingsGroup}>
            <Text style={styles.groupTitle}>{group.title}</Text>
            <View style={styles.groupItems}>
              {group.items.map((item: any, itemIndex: number) => renderSettingItem(item, `${group.title}-${itemIndex}`))}
            </View>
          </View>
        ))}

        {/* Sign Out Button */}
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Ionicons name="log-out" color="white" size={20} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        {/* App Version */}
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>PaceMind v1.0.0</Text>
          <Text style={styles.versionSubtext}>AI-Powered Walking Companion</Text>
        </View>
      </ScrollView>

      {/* User Profile Form Modal */}
      <UserProfileForm
        visible={profileFormVisible}
        onClose={() => setProfileFormVisible(false)}
        onSuccess={handleProfileUpdate}
        initialData={profile || undefined}
        mode="edit"
      />

      {/* Goals & Targets Modal */}
      <Modal
        visible={goalsModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setGoalsModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setGoalsModalVisible(false)}>
              <Text style={styles.modalCancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Goals & Targets</Text>
            <TouchableOpacity onPress={handleSaveGoals}>
              <Text style={styles.modalSaveButton}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Daily Step Goal</Text>
              <Text style={styles.inputDescription}>Set your daily step target (1,000 - 50,000 steps)</Text>
              <TextInput
                style={[
                  styles.textInput,
                  stepGoalError !== '' && styles.textInputError
                ]}
                value={tempStepGoal}
                onChangeText={setTempStepGoal}
                placeholder="Enter your daily step goal"
                keyboardType="numeric"
                maxLength={5}
              />
              {stepGoalError !== '' && (
                <Text style={styles.errorText}>{stepGoalError}</Text>
              )}
            </View>
      
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Preferred Walk Duration</Text>
              <Text style={styles.inputDescription}>Set your preferred walk length (5 - 180 minutes)</Text>
              <TextInput
                style={[
                  styles.textInput,
                  walkDurationError !== '' && styles.textInputError
                ]}
                value={tempWalkDuration}
                onChangeText={setTempWalkDuration}
                placeholder="Enter duration in minutes"
                keyboardType="numeric"
                maxLength={3}
              />
              {walkDurationError !== '' && (
                <Text style={styles.errorText}>{walkDurationError}</Text>
              )}
            </View>
      
            <View style={styles.inputSection}>
              <View style={styles.toggleSection}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.inputLabel}>Auto Tracking</Text>
                  <Text style={styles.inputDescription}>Automatically detect and track walks</Text>
                </View>
                <Switch
                  value={autoTrackingEnabled}
                  onValueChange={setAutoTrackingEnabled}
                  trackColor={{ false: '#E5E5E5', true: '#4CAF50' }}
                  thumbColor={autoTrackingEnabled ? 'white' : '#f4f3f4'}
                />
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Notification Preferences Modal */}
      <Modal
        visible={notificationPrefsVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setNotificationPrefsVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setNotificationPrefsVisible(false)}>
              <Text style={styles.modalCancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Smart Notifications</Text>
            <TouchableOpacity onPress={saveNotificationPreferences}>
              <Text style={styles.modalSaveButton}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Enable Notifications */}
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>General Settings</Text>
              
              <View style={styles.modalSettingItem}>
                <View style={styles.modalSettingLeft}>
                  <Text style={styles.modalSettingTitle}>Enable Notifications</Text>
                  <Text style={styles.modalSettingSubtitle}>Receive AI-powered motivational messages</Text>
                </View>
                <Switch
                  value={notificationPrefs.enabled}
                  onValueChange={(value) => updateNotificationPref('enabled', value)}
                  trackColor={{ false: '#E5E5E5', true: '#4CAF50' }}
                  thumbColor={notificationPrefs.enabled ? 'white' : '#f4f3f4'}
                />
              </View>

              {/* Frequency Setting */}
              <View style={styles.modalSettingItem}>
                <Text style={styles.modalSettingTitle}>Notification Frequency</Text>
                <View style={styles.frequencyContainer}>
                  {['low', 'medium', 'high'].map((freq) => (
                    <TouchableOpacity
                      key={freq}
                      style={[
                        styles.frequencyButton,
                        notificationPrefs.frequency === freq && styles.frequencyButtonActive
                      ]}
                      onPress={() => updateNotificationPref('frequency', freq)}
                    >
                      <Text style={[
                        styles.frequencyButtonText,
                        notificationPrefs.frequency === freq && styles.frequencyButtonTextActive
                      ]}>
                        {freq.charAt(0).toUpperCase() + freq.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.frequencyDescription}>
                  {notificationPrefs.frequency === 'low' && 'Few notifications, only important ones'}
                  {notificationPrefs.frequency === 'medium' && 'Balanced notifications throughout the day'}
                  {notificationPrefs.frequency === 'high' && 'More frequent motivational messages'}
                </Text>
              </View>
            </View>

            {/* Notification Types */}
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Notification Types</Text>
              
              <View style={styles.modalSettingItem}>
                <View style={styles.modalSettingLeft}>
                  <Text style={styles.modalSettingTitle}>Inactivity Reminders</Text>
                  <Text style={styles.modalSettingSubtitle}>Get reminded when you&apos;ve been inactive</Text>
                </View>
                <Switch
                  value={notificationPrefs.inactivityReminders}
                  onValueChange={(value) => updateNotificationPref('inactivityReminders', value)}
                  trackColor={{ false: '#E5E5E5', true: '#4CAF50' }}
                  thumbColor={notificationPrefs.inactivityReminders ? 'white' : '#f4f3f4'}
                />
              </View>

              <View style={styles.modalSettingItem}>
                <View style={styles.modalSettingLeft}>
                  <Text style={styles.modalSettingTitle}>Motivational Messages</Text>
                  <Text style={styles.modalSettingSubtitle}>Receive personalized encouragement</Text>
                </View>
                <Switch
                  value={notificationPrefs.motivationalMessages}
                  onValueChange={(value) => updateNotificationPref('motivationalMessages', value)}
                  trackColor={{ false: '#E5E5E5', true: '#4CAF50' }}
                  thumbColor={notificationPrefs.motivationalMessages ? 'white' : '#f4f3f4'}
                />
              </View>

              <View style={styles.modalSettingItem}>
                <View style={styles.modalSettingLeft}>
                  <Text style={styles.modalSettingTitle}>Achievement Alerts</Text>
                  <Text style={styles.modalSettingSubtitle}>Celebrate your accomplishments</Text>
                </View>
                <Switch
                  value={notificationPrefs.achievementAlerts}
                  onValueChange={(value) => updateNotificationPref('achievementAlerts', value)}
                  trackColor={{ false: '#E5E5E5', true: '#4CAF50' }}
                  thumbColor={notificationPrefs.achievementAlerts ? 'white' : '#f4f3f4'}
                />
              </View>

              <View style={styles.modalSettingItem}>
                <View style={styles.modalSettingLeft}>
                  <Text style={styles.modalSettingTitle}>Walking Reminders</Text>
                  <Text style={styles.modalSettingSubtitle}>Gentle nudges to start walking</Text>
                </View>
                <Switch
                  value={notificationPrefs.walkingReminders}
                  onValueChange={(value) => updateNotificationPref('walkingReminders', value)}
                  trackColor={{ false: '#E5E5E5', true: '#4CAF50' }}
                  thumbColor={notificationPrefs.walkingReminders ? 'white' : '#f4f3f4'}
                />
              </View>
            </View>

            {/* Quiet Hours */}
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Quiet Hours</Text>
              
              <View style={styles.modalSettingItem}>
                <View style={styles.modalSettingLeft}>
                  <Text style={styles.modalSettingTitle}>Enable Quiet Hours</Text>
                  <Text style={styles.modalSettingSubtitle}>Pause notifications during specific times</Text>
                </View>
                <Switch
                  value={notificationPrefs.quietHoursEnabled}
                  onValueChange={(value) => updateNotificationPref('quietHoursEnabled', value)}
                  trackColor={{ false: '#E5E5E5', true: '#4CAF50' }}
                  thumbColor={notificationPrefs.quietHoursEnabled ? 'white' : '#f4f3f4'}
                />
              </View>

              {notificationPrefs.quietHoursEnabled && (
                <>
                  <View style={styles.timePickerContainer}>
                    <View style={styles.timePickerItem}>
                      <Text style={styles.timePickerLabel}>Start Time</Text>
                      <TouchableOpacity style={styles.timePickerButton}>
                        <Text style={styles.timePickerText}>{notificationPrefs.quietHoursStart}</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.timePickerItem}>
                      <Text style={styles.timePickerLabel}>End Time</Text>
                      <TouchableOpacity style={styles.timePickerButton}>
                        <Text style={styles.timePickerText}>{notificationPrefs.quietHoursEnd}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </>
              )}
            </View>

            {/* Additional Settings */}
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Additional Settings</Text>
              
              <View style={styles.modalSettingItem}>
                <View style={styles.modalSettingLeft}>
                  <Text style={styles.modalSettingTitle}>Allow During Walks</Text>
                  <Text style={styles.modalSettingSubtitle}>Receive notifications while walking</Text>
                </View>
                <Switch
                  value={notificationPrefs.allowDuringWalks}
                  onValueChange={(value) => updateNotificationPref('allowDuringWalks', value)}
                  trackColor={{ false: '#E5E5E5', true: '#4CAF50' }}
                  thumbColor={notificationPrefs.allowDuringWalks ? 'white' : '#f4f3f4'}
                />
              </View>

              <View style={styles.modalSettingItem}>
                <View style={styles.modalSettingLeft}>
                  <Text style={styles.modalSettingTitle}>Vibration</Text>
                  <Text style={styles.modalSettingSubtitle}>Vibrate for notifications</Text>
                </View>
                <Switch
                  value={notificationPrefs.vibrationEnabled}
                  onValueChange={(value) => updateNotificationPref('vibrationEnabled', value)}
                  trackColor={{ false: '#E5E5E5', true: '#4CAF50' }}
                  thumbColor={notificationPrefs.vibrationEnabled ? 'white' : '#f4f3f4'}
                />
              </View>

              <View style={styles.modalSettingItem}>
                <View style={styles.modalSettingLeft}>
                  <Text style={styles.modalSettingTitle}>Sound</Text>
                  <Text style={styles.modalSettingSubtitle}>Play sound for notifications</Text>
                </View>
                <Switch
                  value={notificationPrefs.soundEnabled}
                  onValueChange={(value) => updateNotificationPref('soundEnabled', value)}
                  trackColor={{ false: '#E5E5E5', true: '#4CAF50' }}
                  thumbColor={notificationPrefs.soundEnabled ? 'white' : '#f4f3f4'}
                />
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* How to Use Guide Modal */}
      <Modal
        visible={howToUseModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setHowToUseModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setHowToUseModalVisible(false)}>
              <Text style={styles.modalCancelButton}>Close</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>How to Use AmiOkiks</Text>
            <View style={{ width: 50 }} />
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Welcome Section */}
            <View style={styles.guideSection}>
              <View style={styles.guideSectionHeader}>
                <Text style={styles.guideSectionIcon}>🚶‍♂️</Text>
                <Text style={styles.guideSectionTitle}>Welcome to Your Walking Journey</Text>
              </View>
              <Text style={styles.guideSectionDescription}>
                AmiOkiks is your personal walking companion designed to help you stay active, motivated, and healthy. 
                This guide will help you make the most of all the features available.
              </Text>
            </View>

            {/* Getting Started */}
            <View style={styles.guideSection}>
              <View style={styles.guideSectionHeader}>
                <Text style={styles.guideSectionIcon}>🎯</Text>
                <Text style={styles.guideSectionTitle}>Getting Started</Text>
              </View>
              <Text style={styles.guideSectionDescription}>
                New to AmiOkiks? Start with our interactive tutorial to learn the basics:
              </Text>
              <TouchableOpacity style={styles.guideActionButton} onPress={handleOpenTutorial}>
                <Ionicons name="play-circle" size={20} color="#4CAF50" />
                <Text style={styles.guideActionButtonText}>Start Interactive Tutorial</Text>
                <Ionicons name="chevron-forward" size={16} color="#666" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.guideActionButtonSecondary} onPress={handleOpenOnboarding}>
                <Ionicons name="refresh" size={20} color="#666" />
                <Text style={styles.guideActionButtonSecondaryText}>Complete Onboarding Again</Text>
                <Ionicons name="chevron-forward" size={16} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Core Features */}
            <View style={styles.guideSection}>
              <View style={styles.guideSectionHeader}>
                <Text style={styles.guideSectionIcon}>📱</Text>
                <Text style={styles.guideSectionTitle}>Core Features</Text>
              </View>
              
              <View style={styles.featureGuideItem}>
                <View style={styles.featureGuideHeader}>
                  <Text style={styles.featureGuideIcon}>👟</Text>
                  <Text style={styles.featureGuideTitle}>Step Tracking</Text>
                </View>
                <Text style={styles.featureGuideDescription}>
                  • Real-time step counting throughout the day{'\n'}
                  • Daily, weekly, and monthly progress views{'\n'}
                  • Distance and calorie calculations{'\n'}
                  • Activity history and trends
                </Text>
                <Text style={styles.featureGuideTip}>
                  💡 Tip: Keep your phone with you for accurate step tracking
                </Text>
              </View>

              <View style={styles.featureGuideItem}>
                <View style={styles.featureGuideHeader}>
                  <Text style={styles.featureGuideIcon}>🎯</Text>
                  <Text style={styles.featureGuideTitle}>Goal Setting</Text>
                </View>
                <Text style={styles.featureGuideDescription}>
                  • Set personalized daily step goals{'\n'}
                  • Track walking duration preferences{'\n'}
                  • Monitor progress streaks{'\n'}
                  • Celebrate achievements and milestones
                </Text>
                <Text style={styles.featureGuideTip}>
                  💡 Tip: Start with achievable goals and gradually increase them
                </Text>
              </View>

              <View style={styles.featureGuideItem}>
                <View style={styles.featureGuideHeader}>
                  <Text style={styles.featureGuideIcon}>🧠</Text>
                  <Text style={styles.featureGuideTitle}>AI-Powered Insights</Text>
                </View>
                <Text style={styles.featureGuideDescription}>
                  • Personalized walking recommendations{'\n'}
                  • Health insights and activity trends{'\n'}
                  • Optimal walking time suggestions{'\n'}
                  • Weather-based activity tips
                </Text>
                <Text style={styles.featureGuideTip}>
                  💡 Tip: Check insights regularly to optimize your walking routine
                </Text>
              </View>

              <View style={styles.featureGuideItem}>
                <View style={styles.featureGuideHeader}>
                  <Text style={styles.featureGuideIcon}>🌱</Text>
                  <Text style={styles.featureGuideTitle}>Personal Growth</Text>
                </View>
                <Text style={styles.featureGuideDescription}>
                  • Mindful walking exercises{'\n'}
                  • Personal reflection and journaling{'\n'}
                  • Mood and energy tracking{'\n'}
                  • Self-motivation techniques
                </Text>
                <Text style={styles.featureGuideTip}>
                  💡 Tip: Use walking time for mindfulness and self-reflection
                </Text>
              </View>
            </View>

            {/* Navigation Guide */}
            <View style={styles.guideSection}>
              <View style={styles.guideSectionHeader}>
                <Text style={styles.guideSectionIcon}>🧭</Text>
                <Text style={styles.guideSectionTitle}>App Navigation</Text>
              </View>
              
              <View style={styles.navigationGuideItem}>
                <View style={styles.navigationGuideHeader}>
                  <Ionicons name="home" size={20} color="#4CAF50" />
                  <Text style={styles.navigationGuideTitle}>Home</Text>
                </View>
                <Text style={styles.navigationGuideDescription}>
                  Your dashboard with daily progress, motivation insights, and quick actions
                </Text>
              </View>

              <View style={styles.navigationGuideItem}>
                <View style={styles.navigationGuideHeader}>
                  <Ionicons name="walk" size={20} color="#4CAF50" />
                  <Text style={styles.navigationGuideTitle}>Walk</Text>
                </View>
                <Text style={styles.navigationGuideDescription}>
                  Start and track your walking sessions with real-time metrics
                </Text>
              </View>

              <View style={styles.navigationGuideItem}>
                <View style={styles.navigationGuideHeader}>
                  <Ionicons name="journal" size={20} color="#4CAF50" />
                  <Text style={styles.navigationGuideTitle}>Journal</Text>
                </View>
                <Text style={styles.navigationGuideDescription}>
                  Record your thoughts, mood, and reflections from your walks
                </Text>
              </View>

              <View style={styles.navigationGuideItem}>
                <View style={styles.navigationGuideHeader}>
                  <Ionicons name="trending-up" size={20} color="#4CAF50" />
                  <Text style={styles.navigationGuideTitle}>Progress</Text>
                </View>
                <Text style={styles.navigationGuideDescription}>
                  View detailed statistics, trends, and achievements over time
                </Text>
              </View>

              <View style={styles.navigationGuideItem}>
                <View style={styles.navigationGuideHeader}>
                  <Ionicons name="settings" size={20} color="#4CAF50" />
                  <Text style={styles.navigationGuideTitle}>Settings</Text>
                </View>
                <Text style={styles.navigationGuideDescription}>
                  Customize your profile, goals, notifications, and app preferences
                </Text>
              </View>
            </View>

            {/* Quick Tips */}
            <View style={styles.guideSection}>
              <View style={styles.guideSectionHeader}>
                <Text style={styles.guideSectionIcon}>💡</Text>
                <Text style={styles.guideSectionTitle}>Quick Tips for Success</Text>
              </View>
              
              <View style={styles.tipsList}>
                <View style={styles.tipItem}>
                  <Text style={styles.tipBullet}>•</Text>
                  <Text style={styles.tipText}>
                    <Text style={styles.tipTextBold}>Start Small:</Text> Begin with achievable daily goals and gradually increase them
                  </Text>
                </View>
                <View style={styles.tipItem}>
                  <Text style={styles.tipBullet}>•</Text>
                  <Text style={styles.tipText}>
                    <Text style={styles.tipTextBold}>Stay Consistent:</Text> Regular short walks are better than occasional long ones
                  </Text>
                </View>
                <View style={styles.tipItem}>
                  <Text style={styles.tipBullet}>•</Text>
                  <Text style={styles.tipText}>
                    <Text style={styles.tipTextBold}>Use Reminders:</Text> Enable notifications to stay motivated throughout the day
                  </Text>
                </View>
                <View style={styles.tipItem}>
                  <Text style={styles.tipBullet}>•</Text>
                  <Text style={styles.tipText}>
                    <Text style={styles.tipTextBold}>Track Progress:</Text> Regularly check your statistics to see improvements
                  </Text>
                </View>
                <View style={styles.tipItem}>
                  <Text style={styles.tipBullet}>•</Text>
                  <Text style={styles.tipText}>
                    <Text style={styles.tipTextBold}>Reflect & Journal:</Text> Use the journal feature to track your mental well-being
                  </Text>
                </View>
              </View>
            </View>

            {/* Support Section */}
            <View style={styles.guideSection}>
              <View style={styles.guideSectionHeader}>
                <Text style={styles.guideSectionIcon}>🤝</Text>
                <Text style={styles.guideSectionTitle}>Need More Help?</Text>
              </View>
              <Text style={styles.guideSectionDescription}>
                If you need additional assistance or have questions about using AmiOkiks:
              </Text>
              <View style={styles.supportOptions}>
                <TouchableOpacity style={styles.supportOption}>
                  <Ionicons name="refresh-circle" size={24} color="#4CAF50" />
                  <View style={styles.supportOptionContent}>
                    <Text style={styles.supportOptionTitle}>Restart Tutorial</Text>
                    <Text style={styles.supportOptionDescription}>Go through the interactive guide again</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity style={styles.supportOption}>
                  <Ionicons name="mail" size={24} color="#4CAF50" />
                  <View style={styles.supportOptionContent}>
                    <Text style={styles.supportOptionTitle}>Contact Support</Text>
                    <Text style={styles.supportOptionDescription}>Get help from our team</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#f8f9fa',
    paddingTop: 20,
    paddingBottom: 30,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E8F5E8',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
  },
  content: {
    flex: 1,
  },
  profileCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#666',
  },
  settingsGroup: {
    marginTop: 32,
  },
  groupTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    marginHorizontal: 20,
  },
  groupItems: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  settingRight: {
    marginLeft: 16,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F44336',
    marginHorizontal: 20,
    marginTop: 30,
    paddingVertical: 18,
    paddingHorizontal: 40,
    borderRadius: 30,
    gap: 12,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  versionContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  versionText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  versionSubtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E8F5E8',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalCancelButton: {
    fontSize: 16,
    color: '#666',
  },
  modalSaveButton: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  inputSection: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  inputDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  textInput: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  textInputError: {
    borderColor: '#F44336',
  },
  errorText: {
    fontSize: 12,
    color: '#F44336',
    marginTop: 4,
  },
  toggleSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  toggleInfo: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
  },
  // Guide Modal Styles
  guideSection: {
    marginBottom: 32,
  },
  guideSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  guideSectionIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  guideSectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  guideSectionDescription: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    marginBottom: 16,
  },
  guideActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  guideActionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
    flex: 1,
    marginLeft: 12,
  },
  guideActionButtonSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  guideActionButtonSecondaryText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
    flex: 1,
    marginLeft: 12,
  },
  featureGuideItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  featureGuideHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureGuideIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  featureGuideTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  featureGuideDescription: {
    fontSize: 15,
    color: '#555',
    lineHeight: 22,
    marginBottom: 12,
  },
  featureGuideTip: {
    fontSize: 14,
    color: '#4CAF50',
    fontStyle: 'italic',
    backgroundColor: '#F0F8F0',
    padding: 8,
    borderRadius: 8,
  },
  navigationGuideItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  navigationGuideHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    minWidth: 80,
  },
  navigationGuideTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  navigationGuideDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    flex: 1,
  },
  tipsList: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  tipBullet: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: 'bold',
    marginRight: 12,
    marginTop: 2,
  },
  tipText: {
    fontSize: 15,
    color: '#555',
    lineHeight: 22,
    flex: 1,
  },
  tipTextBold: {
    fontWeight: 'bold',
    color: '#333',
  },
  supportOptions: {
    gap: 12,
  },
  supportOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  supportOptionContent: {
    marginLeft: 16,
    flex: 1,
  },
  supportOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  supportOptionDescription: {
    fontSize: 14,
    color: '#666',
  },
  // Notification Preferences Modal Styles
  modalSection: {
    marginBottom: 32,
  },
  modalSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  modalSettingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  modalSettingLeft: {
    flex: 1,
    marginRight: 16,
  },
  modalSettingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  modalSettingSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  frequencyContainer: {
    flexDirection: 'row',
    marginTop: 12,
    marginBottom: 8,
    gap: 8,
  },
  frequencyButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    backgroundColor: 'white',
    alignItems: 'center',
  },
  frequencyButtonActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  frequencyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  frequencyButtonTextActive: {
    color: 'white',
  },
  frequencyDescription: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  timePickerContainer: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 12,
  },
  timePickerItem: {
    flex: 1,
  },
  timePickerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  timePickerButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  timePickerText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
});