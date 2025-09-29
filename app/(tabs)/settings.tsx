import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { User, Target, Bell, Volume2, Shield, Smartphone, Moon, HelpCircle, ChevronRight, LogOut } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useWalking } from '@/contexts/WalkingContext';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const { weeklyGoal } = useWalking();
  const insets = useSafeAreaInsets();

  // Local UI state for settings toggles (placeholders until real settings are wired)
  const [walkingRemindersEnabled, setWalkingRemindersEnabled] = useState(true);
  const [achievementAlertsEnabled, setAchievementAlertsEnabled] = useState(true);
  const [biometricLoginEnabled, setBiometricLoginEnabled] = useState(false);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);

  const displayName = (user?.user_metadata as any)?.name
    ?? (user?.user_metadata as any)?.full_name
    ?? user?.email
    ?? 'Walker';

  const handleSignOut = async () => {
    console.log('Signing out...');
    await logout();
    router.replace('/(auth)/login');
  };

  // (removed icon wrappers, using lucide components directly)
  // const IconUser = (props: any) => <MaterialCommunityIcons name="account-outline" {...props} />;
  // const IconTarget = (props: any) => <MaterialCommunityIcons name="target" {...props} />;
  // const IconBell = (props: any) => <Ionicons name="notifications-outline" {...props} />;
  // const IconShield = (props: any) => <Ionicons name="shield-outline" {...props} />;
  // const IconHelp = (props: any) => <Ionicons name="help-circle-outline" {...props} />;
  // const IconLogOut = (props: any) => <Ionicons name="log-out-outline" {...props} />;
  // const IconChevronRight = (props: any) => <Ionicons name="chevron-forward-outline" {...props} />;
  // const IconSmartphone = (props: any) => <Ionicons name="phone-portrait-outline" {...props} />;
  // const IconMoon = (props: any) => <Ionicons name="moon-outline" {...props} />;
  // const IconVolume = (props: any) => <Ionicons name="volume-medium-outline" {...props} />;
  const settingsGroups = [
    {
      title: 'Profile',
      items: [
        {
          icon: User,
          title: 'Personal Information',
          subtitle: user?.email || 'Update your profile',
          onPress: () => {},
        },
        {
          icon: Target,
          title: 'Goals & Targets',
          subtitle: `Daily goal: ${String(weeklyGoal.dailySteps)} steps`,
          onPress: () => {},
        },
      ],
    },
    {
      title: 'Notifications',
      items: [
        {
          icon: Bell,
          title: 'Walking Reminders',
          subtitle: 'Get motivated to walk',
          toggle: true,
          value: walkingRemindersEnabled,
          onToggle: (value: boolean) => setWalkingRemindersEnabled(value),
        },
        {
          icon: Volume2,
          title: 'Achievement Alerts',
          subtitle: 'Celebrate your progress',
          toggle: true,
          value: achievementAlertsEnabled,
          onToggle: (value: boolean) => setAchievementAlertsEnabled(value),
        },
      ],
    },
    {
      title: 'Privacy & Security',
      items: [
        {
          icon: Shield,
          title: 'Data Privacy',
          subtitle: 'Manage your data',
          onPress: () => {},
        },
        {
          icon: Smartphone,
          title: 'Biometric Login',
          subtitle: 'Use fingerprint or face ID',
          toggle: true,
          value: biometricLoginEnabled,
          onToggle: (value: boolean) => setBiometricLoginEnabled(value),
        },
      ],
    },
    {
      title: 'App Preferences',
      items: [
        {
          icon: Moon,
          title: 'Dark Mode',
          subtitle: 'Switch to dark theme',
          toggle: true,
          value: darkModeEnabled,
          onToggle: (value: boolean) => setDarkModeEnabled(value),
        },
      ],
    },
    {
      title: 'Support',
      items: [
        {
          icon: HelpCircle,
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
          <item.icon color="#4CAF50" size={20} />
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
          // <ChevronRight color="#666" size={20} />
          <ChevronRight color="#666" size={20} />
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Settings</Text>
        <Text style={styles.headerSubtitle}>Customize your experience</Text>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* User Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileAvatar}>
            <User color="white" size={32} />
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
          <LogOut color="#F44336" size={20} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        {/* App Version */}
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>WalkWise v1.0.0</Text>
          <Text style={styles.versionSubtext}>AI-Powered Walking Companion</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    paddingTop: 20,
    paddingBottom: 30,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  content: {
    flex: 1,
  },
  profileCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
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
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginTop: 32,
    paddingVertical: 16,
    borderRadius: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#F44336',
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F44336',
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
});