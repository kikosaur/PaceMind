import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useNotificationSettings, useWalkingSettings } from '@/contexts/SettingsContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { walkingRemindersEnabled, motivationNotificationsEnabled, setWalkingReminders, setMotivationNotifications } = useNotificationSettings();
  const { dailyStepGoal, preferredWalkDuration, autoTrackingEnabled, setDailyStepGoal, setPreferredWalkDuration, setAutoTracking } = useWalkingSettings();

  // Modal state for Goals & Targets
  const [goalsModalVisible, setGoalsModalVisible] = useState(false);
  const [tempStepGoal, setTempStepGoal] = useState(dailyStepGoal.toString());
  const [tempWalkDuration, setTempWalkDuration] = useState(preferredWalkDuration.toString());

  // Validation functions
  const validateStepGoal = (value: string): boolean => {
    const num = parseInt(value, 10);
    return !isNaN(num) && num >= 1000 && num <= 50000;
  };

  const validateWalkDuration = (value: string): boolean => {
    const num = parseInt(value, 10);
    return !isNaN(num) && num >= 5 && num <= 180;
  };

  // Handle saving goals
  const handleSaveGoals = () => {
    if (!validateStepGoal(tempStepGoal)) {
      Alert.alert('Invalid Step Goal', 'Please enter a step goal between 1,000 and 50,000 steps.');
      return;
    }

    if (!validateWalkDuration(tempWalkDuration)) {
      Alert.alert('Invalid Walk Duration', 'Please enter a walk duration between 5 and 180 minutes.');
      return;
    }

    setDailyStepGoal(parseInt(tempStepGoal, 10));
    setPreferredWalkDuration(parseInt(tempWalkDuration, 10));
    setGoalsModalVisible(false);
    Alert.alert('Success', 'Your goals have been updated successfully!');
  };

  // Handle opening goals modal
  const openGoalsModal = () => {
    setTempStepGoal(dailyStepGoal.toString());
    setTempWalkDuration(preferredWalkDuration.toString());
    setGoalsModalVisible(true);
  };

  const displayName = (user?.user_metadata as any)?.name
    ?? (user?.user_metadata as any)?.full_name
    ?? user?.email
    ?? 'Walker';

  const handleSignOut = async () => {
    try {
      console.log('Signing out...');
      await logout();
      // Let the app's natural auth flow handle navigation
      // The index.tsx will automatically redirect to login when user becomes null
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const settingsGroups = [
    {
      title: 'Profile',
      items: [
        {
          icon: Ionicons,
          iconName: 'person',
          title: 'Personal Information',
          subtitle: user?.email || 'Update your profile',
          onPress: () => {},
        },
        {
          icon: Ionicons,
          iconName: 'flag',
          title: 'Goals & Targets',
          subtitle: `${dailyStepGoal.toLocaleString()} steps • ${preferredWalkDuration} min walks`,
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
          title: 'Walking Reminders',
          subtitle: 'Get motivated to walk',
          toggle: true,
          value: walkingRemindersEnabled,
          onToggle: setWalkingReminders,
        },
        {
          icon: Ionicons,
          iconName: 'heart',
          title: 'Motivation Notifications',
          subtitle: 'Daily motivation messages',
          toggle: true,
          value: motivationNotificationsEnabled,
          onToggle: setMotivationNotifications,
        },
        {
          icon: Ionicons,
          iconName: 'locate',
          title: 'Auto Tracking',
          subtitle: 'Automatically track walks',
          toggle: true,
          value: autoTrackingEnabled,
          onToggle: setAutoTracking,
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
        {settingsGroups.map((group, groupIndex) => (
          <View key={`group-${group.title}-${groupIndex}`} style={styles.settingsGroup}>
            <Text style={styles.groupTitle}>{group.title}</Text>
            <View style={styles.groupItems}>
              {group.items.map((item, itemIndex) => renderSettingItem(item, `${group.title}-${itemIndex}`))}
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
      
          <ScrollView style={styles.modalContent}>
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Daily Step Goal</Text>
              <Text style={styles.inputDescription}>Set your daily step target (1,000 - 50,000 steps)</Text>
              <TextInput
                style={[
                  styles.textInput,
                  !validateStepGoal(tempStepGoal) && tempStepGoal !== '' && styles.textInputError
                ]}
                value={tempStepGoal}
                onChangeText={setTempStepGoal}
                placeholder="Enter step goal"
                keyboardType="numeric"
                maxLength={5}
              />
              {!validateStepGoal(tempStepGoal) && tempStepGoal !== '' && (
                <Text style={styles.errorText}>Please enter a value between 1,000 and 50,000</Text>
              )}
            </View>
      
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Preferred Walk Duration</Text>
              <Text style={styles.inputDescription}>Set your preferred walk length (5 - 180 minutes)</Text>
              <TextInput
                style={[
                  styles.textInput,
                  !validateWalkDuration(tempWalkDuration) && tempWalkDuration !== '' && styles.textInputError
                ]}
                value={tempWalkDuration}
                onChangeText={setTempWalkDuration}
                placeholder="Enter duration in minutes"
                keyboardType="numeric"
                maxLength={3}
              />
              {!validateWalkDuration(tempWalkDuration) && tempWalkDuration !== '' && (
                <Text style={styles.errorText}>Please enter a value between 5 and 180 minutes</Text>
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
                  onValueChange={setAutoTracking}
                  trackColor={{ false: '#E5E5E5', true: '#4CAF50' }}
                  thumbColor={autoTrackingEnabled ? 'white' : '#f4f3f4'}
                />
              </View>
            </View>
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
});