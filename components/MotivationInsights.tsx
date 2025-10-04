import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useWalking } from '../contexts/WalkingContext';

interface MotivationInsightsProps {
  onRefresh?: () => void;
}

export const MotivationInsights: React.FC<MotivationInsightsProps> = ({ onRefresh }) => {
  const { 
    motivationPrediction, 
    isLoadingPrediction, 
    predictionError,
    getMotivationInsights,
    getMotivationRecommendations,
    predictMotivation
  } = useWalking();

  const insights = getMotivationInsights();
  const recommendations = getMotivationRecommendations();

  const handleRefresh = async () => {
    await predictMotivation(true);
    onRefresh?.();
  };

  const getMotivationColor = (level: number): string => {
    if (level >= 70) return '#4CAF50'; // Green
    if (level >= 40) return '#FF9800'; // Orange
    return '#F44336'; // Red
  };

  const getMotivationLabel = (level: number): string => {
    if (level >= 70) return 'High';
    if (level >= 40) return 'Moderate';
    return 'Low';
  };

  if (isLoadingPrediction) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Motivation Insights</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Analyzing your motivation...</Text>
        </View>
      </View>
    );
  }

  if (predictionError) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Motivation Insights</Text>
          <TouchableOpacity onPress={handleRefresh} style={styles.refreshButton}>
            <Text style={styles.refreshButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Unable to load motivation insights</Text>
          <Text style={styles.errorSubtext}>{predictionError}</Text>
        </View>
      </View>
    );
  }

  if (!motivationPrediction) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Motivation Insights</Text>
          <TouchableOpacity onPress={handleRefresh} style={styles.refreshButton}>
            <Text style={styles.refreshButtonText}>Get Insights</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Tap &quot;Get Insights&quot; to analyze your motivation</Text>
        </View>
      </View>
    );
  }

  // Convert motivation_state to numerical value
  const getMotivationValue = (state: string): number => {
    switch (state) {
      case 'high': return 80;
      case 'medium': return 50;
      case 'low': return 20;
      default: return 50;
    }
  };

  const motivationLevel = getMotivationValue(motivationPrediction.motivation_state);
  const confidence = Math.round(motivationPrediction.confidence * 100);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Motivation Insights</Text>
        <TouchableOpacity onPress={handleRefresh} style={styles.refreshButton}>
          <Text style={styles.refreshButtonText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {/* Motivation Level Display */}
      <View style={styles.motivationCard}>
        <View style={styles.motivationHeader}>
          <Text style={styles.motivationLabel}>Current Motivation</Text>
          <Text style={styles.confidenceText}>{confidence}% confidence</Text>
        </View>
        <View style={styles.motivationDisplay}>
          <Text style={[styles.motivationValue, { color: getMotivationColor(motivationLevel) }]}>
            {motivationLevel}%
          </Text>
          <Text style={[styles.motivationStatus, { color: getMotivationColor(motivationLevel) }]}>
            {getMotivationLabel(motivationLevel)}
          </Text>
        </View>
        <View style={styles.motivationBar}>
          <View 
            style={[
              styles.motivationProgress, 
              { 
                width: `${motivationLevel}%`,
                backgroundColor: getMotivationColor(motivationLevel)
              }
            ]} 
          />
        </View>
      </View>

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Insights Section */}
        {insights.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Insights</Text>
            {insights.map((insight, index) => (
              <View key={index} style={styles.insightCard}>
                <View style={styles.insightIcon}>
                  <Text style={styles.insightIconText}>💡</Text>
                </View>
                <Text style={styles.insightText}>{insight}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Recommendations Section */}
        {recommendations.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recommendations</Text>
            {recommendations.map((recommendation, index) => (
              <View key={index} style={styles.recommendationCard}>
                <View style={styles.recommendationIcon}>
                  <Text style={styles.recommendationIconText}>🎯</Text>
                </View>
                <Text style={styles.recommendationText}>{recommendation}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Factors Section - Removed since factors property doesn't exist in MotivationPredictionResponse */}
        {/* The factors section has been removed as the MotivationPredictionResponse interface 
             doesn't include a factors property. This section would need to be redesigned 
             to work with the available properties: motivation_state, confidence, suggestion, 
             insights, recommendations, and timestamp. */}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  refreshButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#4CAF50',
    borderRadius: 8,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    color: '#999',
    fontSize: 16,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  errorText: {
    color: '#F44336',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  errorSubtext: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: '#999',
    fontSize: 16,
    textAlign: 'center',
  },
  motivationCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  motivationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  motivationLabel: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  confidenceText: {
    fontSize: 12,
    color: '#999',
  },
  motivationDisplay: {
    alignItems: 'center',
    marginBottom: 16,
  },
  motivationValue: {
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  motivationStatus: {
    fontSize: 16,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  motivationBar: {
    height: 8,
    backgroundColor: '#333',
    borderRadius: 4,
    overflow: 'hidden',
  },
  motivationProgress: {
    height: '100%',
    borderRadius: 4,
  },
  scrollContainer: {
    maxHeight: 300,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  insightCard: {
    flexDirection: 'row',
    backgroundColor: '#252525',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  insightIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  insightIconText: {
    fontSize: 16,
  },
  insightText: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
  },
  recommendationCard: {
    flexDirection: 'row',
    backgroundColor: '#252525',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  recommendationIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  recommendationIconText: {
    fontSize: 16,
  },
  recommendationText: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
  },
  factorsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  factorCard: {
    backgroundColor: '#252525',
    borderRadius: 8,
    padding: 12,
    width: '48%',
    marginBottom: 8,
    alignItems: 'center',
  },
  factorLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  factorValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
});