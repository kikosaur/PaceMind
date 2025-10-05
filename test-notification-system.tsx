import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  TextInput,
} from 'react-native';
import { useNotificationManager } from './hooks/useNotificationManager';

interface TestResult {
  test: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  message?: string;
  duration?: number;
}

export const NotificationSystemTest: React.FC = () => {
  const {
    isInitialized,
    isLoading,
    error,
    preferences,
    engagementMetrics,
    sendNotification,
    sendPersonalizedMotivation,
    updatePreferences,
    loadEngagementMetrics,
    getOptimalSettings,
    trackActivity,
    trackWalkStart,
    trackWalkEnd,
    trackGoalSet,
    trackGoalAchieved,
    trackJournalEntry,
    trackScreenView,
    pauseNotifications,
    resumeNotifications,
    scheduleNotification,
    cancelScheduledNotification,
    onNotificationOpened,
    onNotificationDismissed,
    onNotificationActionTaken,
  } = useNotificationManager();

  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [testMessage, setTestMessage] = useState('Hello from test notification!');
  const [testCategory, setTestCategory] = useState('test');
  const [scheduledTaskId, setScheduledTaskId] = useState<string | null>(null);

  // Initialize test results
  useEffect(() => {
    const initialTests: TestResult[] = [
      { test: 'Notification Manager Initialization', status: 'pending' },
      { test: 'Send Basic Notification', status: 'pending' },
      { test: 'Send Personalized Motivation', status: 'pending' },
      { test: 'Activity Tracking', status: 'pending' },
      { test: 'User Preferences Management', status: 'pending' },
      { test: 'Engagement Metrics Loading', status: 'pending' },
      { test: 'Optimal Settings Calculation', status: 'pending' },
      { test: 'Notification Scheduling', status: 'pending' },
      { test: 'Notification Pause/Resume', status: 'pending' },
      { test: 'Event Tracking (Open/Dismiss/Action)', status: 'pending' },
    ];
    setTestResults(initialTests);
  }, []);

  // Update initialization test result
  useEffect(() => {
    if (isInitialized) {
      updateTestResult('Notification Manager Initialization', 'passed', 'Successfully initialized');
    } else if (error) {
      updateTestResult('Notification Manager Initialization', 'failed', error);
    }
  }, [isInitialized, error]);

  const updateTestResult = (testName: string, status: TestResult['status'], message?: string, duration?: number) => {
    setTestResults(prev => prev.map(test => 
      test.test === testName 
        ? { ...test, status, message, duration }
        : test
    ));
  };

  const runTest = async (testName: string, testFn: () => Promise<void>) => {
    const startTime = Date.now();
    updateTestResult(testName, 'running');
    
    try {
      await testFn();
      const duration = Date.now() - startTime;
      updateTestResult(testName, 'passed', 'Test completed successfully', duration);
    } catch (error) {
      const duration = Date.now() - startTime;
      const message = error instanceof Error ? error.message : 'Unknown error';
      updateTestResult(testName, 'failed', message, duration);
    }
  };

  const runAllTests = async () => {
    if (!isInitialized) {
      Alert.alert('Error', 'Notification system not initialized yet');
      return;
    }

    setIsRunningTests(true);

    // Test 1: Send Basic Notification
    await runTest('Send Basic Notification', async () => {
      const notificationId = await sendNotification(
        'Test Notification',
        testMessage,
        testCategory,
        'medium',
        { testData: 'basic_test' }
      );
      if (!notificationId) throw new Error('Failed to send notification');
    });

    // Test 2: Send Personalized Motivation
    await runTest('Send Personalized Motivation', async () => {
      const notificationId = await sendPersonalizedMotivation('motivational');
      if (!notificationId) throw new Error('Failed to send personalized motivation');
    });

    // Test 3: Activity Tracking
    await runTest('Activity Tracking', async () => {
      await trackActivity('test_activity', { testData: 'activity_test' });
      await trackWalkStart();
      await trackWalkEnd();
      await trackGoalSet('steps', 10000);
      await trackGoalAchieved('steps', 10000);
      await trackJournalEntry();
      await trackScreenView('test_screen');
    });

    // Test 4: User Preferences Management
    await runTest('User Preferences Management', async () => {
      const testPreferences = {
        enabled: true,
        frequency: 'medium',
        types: {
          inactivity_reminders: true,
          motivational_messages: true,
          achievement_alerts: true,
          walking_reminders: true,
        },
        quiet_hours: {
          enabled: true,
          start: '22:00',
          end: '06:00',
        },
        additional_settings: {
          allow_during_walks: false,
          vibration: true,
          sound: true,
        },
      };
      
      await updatePreferences(testPreferences);
      
      // Verify preferences were updated
      if (!preferences || preferences.frequency !== 'medium') {
        throw new Error('Preferences not updated correctly');
      }
    });

    // Test 5: Engagement Metrics Loading
    await runTest('Engagement Metrics Loading', async () => {
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
      const endDate = new Date();
      await loadEngagementMetrics(startDate, endDate);
      
      // Metrics should be loaded (can be empty for new users)
      if (engagementMetrics === null) {
        throw new Error('Failed to load engagement metrics');
      }
    });

    // Test 6: Optimal Settings Calculation
    await runTest('Optimal Settings Calculation', async () => {
      const optimalSettings = await getOptimalSettings();
      // This might return null for new users, which is acceptable
      console.log('Optimal settings:', optimalSettings);
    });

    // Test 7: Notification Scheduling
    await runTest('Notification Scheduling', async () => {
      const scheduledTime = new Date(Date.now() + 60000); // 1 minute from now
      const taskId = await scheduleNotification('motivational_message', scheduledTime, { test: true });
      if (!taskId) throw new Error('Failed to schedule notification');
      setScheduledTaskId(taskId);
    });

    // Test 8: Notification Pause/Resume
    await runTest('Notification Pause/Resume', async () => {
      await pauseNotifications();
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      await resumeNotifications();
    });

    // Test 9: Event Tracking
    await runTest('Event Tracking (Open/Dismiss/Action)', async () => {
      const testNotificationId = 'test_notification_' + Date.now();
      await onNotificationOpened(testNotificationId, 'test');
      await onNotificationDismissed(testNotificationId, 'test');
      await onNotificationActionTaken(testNotificationId, 'test', 'button_clicked');
    });

    setIsRunningTests(false);
    Alert.alert('Tests Complete', 'All notification system tests have been executed. Check the results below.');
  };

  const clearTestResults = () => {
    const clearedTests = testResults.map(test => ({ ...test, status: 'pending' as const, message: undefined, duration: undefined }));
    setTestResults(clearedTests);
  };

  const cancelScheduledTest = async () => {
    if (scheduledTaskId) {
      await cancelScheduledNotification(scheduledTaskId);
      setScheduledTaskId(null);
      Alert.alert('Success', 'Scheduled notification cancelled');
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'pending': return '#666';
      case 'running': return '#007AFF';
      case 'passed': return '#34C759';
      case 'failed': return '#FF3B30';
      default: return '#666';
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'pending': return '⏳';
      case 'running': return '🔄';
      case 'passed': return '✅';
      case 'failed': return '❌';
      default: return '⏳';
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Notification System Test</Text>
        <Text style={styles.loading}>Initializing notification system...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Notification System Test</Text>
      
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error: {error}</Text>
        </View>
      )}

      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>
          Status: {isInitialized ? '✅ Initialized' : '❌ Not Initialized'}
        </Text>
        {preferences && (
          <Text style={styles.statusText}>
            Preferences: {preferences.enabled ? '✅ Enabled' : '❌ Disabled'}
          </Text>
        )}
      </View>

      <View style={styles.controlsContainer}>
        <Text style={styles.sectionTitle}>Test Controls</Text>
        
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Test Message:</Text>
          <TextInput
            style={styles.textInput}
            value={testMessage}
            onChangeText={setTestMessage}
            placeholder="Enter test message"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Test Category:</Text>
          <TextInput
            style={styles.textInput}
            value={testCategory}
            onChangeText={setTestCategory}
            placeholder="Enter test category"
          />
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={runAllTests}
            disabled={isRunningTests || !isInitialized}
          >
            <Text style={styles.buttonText}>
              {isRunningTests ? 'Running Tests...' : 'Run All Tests'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={clearTestResults}
            disabled={isRunningTests}
          >
            <Text style={styles.buttonText}>Clear Results</Text>
          </TouchableOpacity>
        </View>

        {scheduledTaskId && (
          <TouchableOpacity
            style={[styles.button, styles.warningButton]}
            onPress={cancelScheduledTest}
          >
            <Text style={styles.buttonText}>Cancel Scheduled Test</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.resultsContainer}>
        <Text style={styles.sectionTitle}>Test Results</Text>
        
        {testResults.map((result, index) => (
          <View key={index} style={styles.testResult}>
            <View style={styles.testHeader}>
              <Text style={styles.testIcon}>{getStatusIcon(result.status)}</Text>
              <Text style={[styles.testName, { color: getStatusColor(result.status) }]}>
                {result.test}
              </Text>
              {result.duration && (
                <Text style={styles.testDuration}>{result.duration}ms</Text>
              )}
            </View>
            {result.message && (
              <Text style={styles.testMessage}>{result.message}</Text>
            )}
          </View>
        ))}
      </View>

      <View style={styles.metricsContainer}>
        <Text style={styles.sectionTitle}>System Information</Text>
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Initialization Status:</Text>
          <Text style={styles.infoValue}>{isInitialized ? 'Ready' : 'Not Ready'}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Current Preferences:</Text>
          <Text style={styles.infoValue}>
            {preferences ? JSON.stringify(preferences, null, 2) : 'Not loaded'}
          </Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Engagement Metrics:</Text>
          <Text style={styles.infoValue}>
            {engagementMetrics ? JSON.stringify(engagementMetrics, null, 2) : 'Not loaded'}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  loading: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginTop: 50,
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#f44336',
  },
  errorText: {
    color: '#c62828',
    fontSize: 14,
  },
  statusContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statusText: {
    fontSize: 16,
    marginBottom: 8,
    color: '#333',
  },
  controlsContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  inputContainer: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
    color: '#333',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  secondaryButton: {
    backgroundColor: '#666',
  },
  warningButton: {
    backgroundColor: '#FF9500',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  resultsContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  testResult: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  testHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  testIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  testName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  testDuration: {
    fontSize: 12,
    color: '#666',
  },
  testMessage: {
    fontSize: 14,
    color: '#666',
    marginLeft: 24,
    fontStyle: 'italic',
  },
  metricsContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  infoRow: {
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
  },
});

export default NotificationSystemTest;