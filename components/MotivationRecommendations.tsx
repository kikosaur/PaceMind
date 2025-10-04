import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useWalking } from '../contexts/WalkingContext';

interface Recommendation {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  category: 'timing' | 'route' | 'preparation' | 'mindset' | 'social';
  actionable: boolean;
  estimatedImpact: number; // 1-10 scale
}

export const MotivationRecommendations: React.FC = () => {
  const { 
    getMotivationRecommendations, 
    motivationPrediction,
    isLoadingPrediction,
    predictionError 
  } = useWalking();
  
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [completedActions, setCompletedActions] = useState<Set<string>>(new Set());

  const categories = [
    { id: 'all', label: 'All', icon: '📋' },
    { id: 'timing', label: 'Timing', icon: '⏰' },
    { id: 'route', label: 'Route', icon: '🗺️' },
    { id: 'preparation', label: 'Prep', icon: '🎒' },
    { id: 'mindset', label: 'Mindset', icon: '🧠' },
    { id: 'social', label: 'Social', icon: '👥' },
  ];

  const priorityColors = {
    high: '#F44336',
    medium: '#FF9800',
    low: '#4CAF50',
  };

  const priorityLabels = {
    high: 'High Impact',
    medium: 'Medium Impact',
    low: 'Low Impact',
  };

  useEffect(() => {
    loadRecommendations();
  }, [motivationPrediction]);

  const loadRecommendations = async () => {
    if (!motivationPrediction) return;

    setIsLoading(true);
    try {
      const mlRecommendations = await getMotivationRecommendations();
      
      // Transform ML recommendations into our format
      const formattedRecommendations: Recommendation[] = mlRecommendations.map((rec: string, index: number) => ({
        id: `rec-${index}`,
        title: `Recommendation ${index + 1}`,
        description: rec || 'No description available',
        priority: 'medium' as const,
        category: 'mindset' as const,
        actionable: true,
        estimatedImpact: Math.floor(Math.random() * 5) + 5, // Fallback to random 5-10
      }));

      setRecommendations(formattedRecommendations);
    } catch (error) {
      console.error('Failed to load recommendations:', error);
      Alert.alert('Error', 'Failed to load recommendations. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleActionComplete = (recommendationId: string) => {
    setCompletedActions(prev => new Set([...prev, recommendationId]));
    Alert.alert(
      'Great Job!', 
      'Action completed! This will help improve your motivation for future walks.',
      [{ text: 'OK', style: 'default' }]
    );
  };

  const filteredRecommendations = recommendations.filter(rec => 
    selectedCategory === 'all' || rec.category === selectedCategory
  );

  const sortedRecommendations = filteredRecommendations.sort((a, b) => {
    // Sort by priority (high > medium > low) then by impact
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return b.estimatedImpact - a.estimatedImpact;
  });

  if (predictionError) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Motivation Recommendations</Text>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Unable to load recommendations</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadRecommendations}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Motivation Recommendations</Text>
        {motivationPrediction && (
          <Text style={styles.subtitle}>
            Based on your {motivationPrediction.motivation_state} motivation level
          </Text>
        )}
      </View>

      {/* Category Filter */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.categoryFilter}
        contentContainerStyle={styles.categoryFilterContent}
      >
        {categories.map(category => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryButton,
              selectedCategory === category.id && styles.categoryButtonActive
            ]}
            onPress={() => setSelectedCategory(category.id)}
          >
            <Text style={styles.categoryIcon}>{category.icon}</Text>
            <Text style={[
              styles.categoryLabel,
              selectedCategory === category.id && styles.categoryLabelActive
            ]}>
              {category.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Recommendations List */}
      {isLoading || isLoadingPrediction ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Loading recommendations...</Text>
        </View>
      ) : (
        <ScrollView style={styles.recommendationsList}>
          {sortedRecommendations.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No recommendations available</Text>
              <Text style={styles.emptySubtext}>
                Complete a few walks to get personalized recommendations
              </Text>
            </View>
          ) : (
            sortedRecommendations.map(recommendation => (
              <RecommendationCard
                key={recommendation.id}
                recommendation={recommendation}
                isCompleted={completedActions.has(recommendation.id)}
                onActionComplete={() => handleActionComplete(recommendation.id)}
              />
            ))
          )}
        </ScrollView>
      )}

      {/* Summary Stats */}
      {recommendations.length > 0 && (
        <View style={styles.summaryStats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{recommendations.length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{completedActions.size}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {Math.round(
                recommendations.reduce((sum, rec) => sum + rec.estimatedImpact, 0) / 
                recommendations.length
              )}
            </Text>
            <Text style={styles.statLabel}>Avg Impact</Text>
          </View>
        </View>
      )}
    </View>
  );
};

interface RecommendationCardProps {
  recommendation: Recommendation;
  isCompleted: boolean;
  onActionComplete: () => void;
}

const RecommendationCard: React.FC<RecommendationCardProps> = ({
  recommendation,
  isCompleted,
  onActionComplete,
}) => {
  const priorityColors = {
    high: '#F44336',
    medium: '#FF9800',
    low: '#4CAF50',
  };

  const categoryIcons = {
    timing: '⏰',
    route: '🗺️',
    preparation: '🎒',
    mindset: '🧠',
    social: '👥',
  };

  return (
    <View style={[styles.recommendationCard, isCompleted && styles.completedCard]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.categoryIcon}>
            {categoryIcons[recommendation.category] || '💡'}
          </Text>
          <Text style={styles.cardTitle}>{recommendation.title}</Text>
        </View>
        <View style={[
          styles.priorityBadge,
          { backgroundColor: priorityColors[recommendation.priority] }
        ]}>
          <Text style={styles.priorityText}>
            {recommendation.priority.toUpperCase()}
          </Text>
        </View>
      </View>

      <Text style={styles.cardDescription}>{recommendation.description}</Text>

      <View style={styles.cardFooter}>
        <View style={styles.impactIndicator}>
          <Text style={styles.impactLabel}>Impact:</Text>
          <View style={styles.impactStars}>
            {[...Array(5)].map((_, index) => (
              <Text
                key={index}
                style={[
                  styles.impactStar,
                  index < Math.ceil(recommendation.estimatedImpact / 2) && styles.impactStarFilled
                ]}
              >
                ★
              </Text>
            ))}
          </View>
        </View>

        {recommendation.actionable && !isCompleted && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={onActionComplete}
          >
            <Text style={styles.actionButtonText}>Mark Done</Text>
          </TouchableOpacity>
        )}

        {isCompleted && (
          <View style={styles.completedBadge}>
            <Text style={styles.completedText}>✓ Completed</Text>
          </View>
        )}
      </View>
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
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#999',
  },
  categoryFilter: {
    marginBottom: 20,
  },
  categoryFilterContent: {
    paddingRight: 16,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  categoryButtonActive: {
    backgroundColor: '#4CAF50',
  },
  categoryIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  categoryLabel: {
    color: '#999',
    fontSize: 14,
    fontWeight: '500',
  },
  categoryLabelActive: {
    color: '#fff',
  },
  recommendationsList: {
    maxHeight: 400,
  },
  recommendationCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  completedCard: {
    opacity: 0.7,
    borderLeftColor: '#666',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
    flex: 1,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  cardDescription: {
    color: '#ccc',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  impactIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  impactLabel: {
    color: '#999',
    fontSize: 12,
    marginRight: 6,
  },
  impactStars: {
    flexDirection: 'row',
  },
  impactStar: {
    color: '#333',
    fontSize: 14,
  },
  impactStarFilled: {
    color: '#FFD700',
  },
  actionButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  completedBadge: {
    backgroundColor: '#333',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  completedText: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    color: '#999',
    fontSize: 14,
    marginTop: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    color: '#999',
    fontSize: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
  },
  errorContainer: {
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    color: '#F44336',
    fontSize: 16,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    color: '#4CAF50',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    color: '#999',
    fontSize: 12,
  },
});