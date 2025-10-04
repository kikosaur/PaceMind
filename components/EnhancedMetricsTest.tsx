import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useWalking } from '../contexts/WalkingContext';
import { QualityReport } from '../lib/data-quality-monitor';
import { EnhancedMetrics } from '../lib/enhanced-walking-context';

interface TestResult {
  test: string;
  status: 'pass' | 'fail' | 'pending';
  message: string;
}

export const EnhancedMetricsTest: React.FC = () => {
  const {
    isEnhancedMode,
    enhancedMetrics,
    qualityReport,
    dataQualityScore,
    toggleEnhancedMode,
    performCalibration,
    getQualityReport,
    getMetricsHistory
  } = useWalking();

  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunningTests, setIsRunningTests] = useState(false);

  const runTests = async () => {
    setIsRunningTests(true);
    const results: TestResult[] = [];

    // Test 1: Enhanced mode toggle
    try {
      const initialMode = isEnhancedMode;
      toggleEnhancedMode();
      
      results.push({
        test: 'Enhanced Mode Toggle',
        status: 'pass',
        message: `Successfully toggled from ${initialMode} to ${!initialMode}`
      });
    } catch (error) {
      results.push({
        test: 'Enhanced Mode Toggle',
        status: 'fail',
        message: `Failed to toggle enhanced mode: ${error}`
      });
    }

    // Test 2: Calibration system
    try {
      await performCalibration();
      results.push({
        test: 'Sensor Calibration',
        status: 'pass',
        message: 'Calibration completed successfully'
      });
    } catch (error) {
      results.push({
        test: 'Sensor Calibration',
        status: 'fail',
        message: `Calibration failed: ${error}`
      });
    }

    // Test 3: Quality report generation
    try {
      const report = getQualityReport();
      if (report) {
        results.push({
          test: 'Quality Report Generation',
          status: 'pass',
          message: `Quality report generated with score: ${report.overallScore.toFixed(2)}`
        });
      } else {
        results.push({
          test: 'Quality Report Generation',
          status: 'fail',
          message: 'No quality report available'
        });
      }
    } catch (error) {
      results.push({
        test: 'Quality Report Generation',
        status: 'fail',
        message: `Failed to get quality report: ${error}`
      });
    }

    // Test 4: Metrics history
    try {
      const history = getMetricsHistory();
      results.push({
        test: 'Metrics History',
        status: 'pass',
        message: `Retrieved ${history.length} historical metrics entries`
      });
    } catch (error) {
      results.push({
        test: 'Metrics History',
        status: 'fail',
        message: `Failed to get metrics history: ${error}`
      });
    }

    // Test 5: Data quality score validation
    try {
      if (dataQualityScore >= 0 && dataQualityScore <= 1) {
        results.push({
          test: 'Data Quality Score',
          status: 'pass',
          message: `Valid quality score: ${(dataQualityScore * 100).toFixed(1)}%`
        });
      } else {
        results.push({
          test: 'Data Quality Score',
          status: 'fail',
          message: `Invalid quality score: ${dataQualityScore}`
        });
      }
    } catch (error) {
      results.push({
        test: 'Data Quality Score',
        status: 'fail',
        message: `Quality score validation failed: ${error}`
      });
    }

    setTestResults(results);
    setIsRunningTests(false);

    // Show summary
    const passedTests = results.filter(r => r.status === 'pass').length;
    const totalTests = results.length;
    
    Alert.alert(
      'Test Results',
      `${passedTests}/${totalTests} tests passed`,
      [{ text: 'OK' }]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass': return '#4CAF50';
      case 'fail': return '#F44336';
      case 'pending': return '#FF9800';
      default: return '#757575';
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Enhanced Metrics System Test</Text>
      
      <View style={styles.statusSection}>
        <Text style={styles.sectionTitle}>Current Status</Text>
        <Text style={styles.statusText}>Enhanced Mode: {isEnhancedMode ? 'ON' : 'OFF'}</Text>
        <Text style={styles.statusText}>
          Data Quality Score: {(dataQualityScore * 100).toFixed(1)}%
        </Text>
        <Text style={styles.statusText}>
          Enhanced Metrics: {enhancedMetrics ? 'Available' : 'Not Available'}
        </Text>
        <Text style={styles.statusText}>
          Quality Report: {qualityReport ? 'Available' : 'Not Available'}
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.button, isRunningTests && styles.buttonDisabled]}
        onPress={runTests}
        disabled={isRunningTests}
      >
        <Text style={styles.buttonText}>
          {isRunningTests ? 'Running Tests...' : 'Run Enhanced Metrics Tests'}
        </Text>
      </TouchableOpacity>

      {testResults.length > 0 && (
        <View style={styles.resultsSection}>
          <Text style={styles.sectionTitle}>Test Results</Text>
          {testResults.map((result, index) => (
            <View key={index} style={styles.testResult}>
              <View style={styles.testHeader}>
                <Text style={styles.testName}>{result.test}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(result.status) }]}>
                  <Text style={styles.statusText}>{result.status.toUpperCase()}</Text>
                </View>
              </View>
              <Text style={styles.testMessage}>{result.message}</Text>
            </View>
          ))}
        </View>
      )}

      {qualityReport && (
        <View style={styles.qualitySection}>
          <Text style={styles.sectionTitle}>Quality Report Details</Text>
          <Text style={styles.qualityText}>Overall Score: {qualityReport.overallScore.toFixed(3)}</Text>
          <Text style={styles.qualityText}>Overall Score: {qualityReport.overallScore.toFixed(3)}</Text>
          <Text style={styles.qualityText}>Category: {qualityReport.category}</Text>
          <Text style={styles.qualityText}>Data Completeness: {qualityReport.metrics.dataCompleteness.value.toFixed(3)}</Text>
          <Text style={styles.qualityText}>GPS Accuracy: {qualityReport.metrics.gpsAccuracy.value.toFixed(3)}</Text>
          <Text style={styles.qualityText}>Issues Found: {qualityReport.issues.length}</Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  statusSection: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  statusText: {
    fontSize: 14,
    marginBottom: 5,
    color: '#666',
  },
  button: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resultsSection: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  testResult: {
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  testHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  testName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  testMessage: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  qualitySection: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  qualityText: {
    fontSize: 14,
    marginBottom: 5,
    color: '#666',
  },
});