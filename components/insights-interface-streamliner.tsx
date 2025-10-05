import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Animated, Dimensions, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useWalking } from '../contexts/WalkingContext';

interface StreamlinedInsightsProps {
  userId: string;
  compact?: boolean;
  maxInsights?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface InsightCard {
  id: string;
  type: 'motivation' | 'goal' | 'pattern' | 'recommendation';
  priority: 'high' | 'medium' | 'low';
  title: string;
  content: string;
  action?: {
    label: string;
    onPress: () => void;
  };
  icon: string;
  color: string;
  timestamp: number;
}

interface InsightFilters {
  type: string[];
  priority: string[];
  timeRange: 'today' | 'week' | 'month' | 'all';
}

const StreamlinedInsightsInterface: React.FC<StreamlinedInsightsProps> = ({
  userId,
  compact = false,
  maxInsights = 5,
  autoRefresh = true,
  refreshInterval = 300000 // 5 minutes
}) => {
  const { getMotivationInsights, getMotivationRecommendations, motivationPrediction } = useWalking();
  const [insights, setInsights] = useState<InsightCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<InsightFilters>({
    type: ['motivation', 'goal', 'pattern', 'recommendation'],
    priority: ['high', 'medium', 'low'],
    timeRange: 'week'
  });
  const [expandedInsight, setExpandedInsight] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Animation values
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(-50))[0];

  // Screen dimensions for responsive design
  const { width: screenWidth } = Dimensions.get('window');

  /**
   * Handles recommendation actions
   */
  const handleRecommendationAction = useCallback((recommendation: any) => {
    // Implement recommendation action logic
    console.log('Taking action on recommendation:', recommendation);
  }, []);

  /**
   * Loads and processes insights from various sources
   */
  const loadInsights = useCallback(async () => {
    if (loading) return;
    
    setLoading(true);
    setError(null);

    try {
      const insightCards: InsightCard[] = [];

      // Get motivation insights
      if (motivationPrediction) {
        const motivationInsights = await getMotivationInsights();
        const motivationRecommendations = await getMotivationRecommendations();

        // Process motivation insights
        motivationInsights.forEach((insight, index) => {
          insightCards.push({
            id: `motivation-${index}`,
            type: 'motivation',
            priority: 'medium', // Default priority since insight is a string
            title: 'Motivation Insight',
            content: insight, // insight is a string, not an object
            icon: 'heart',
            color: '#FF6B6B',
            timestamp: Date.now()
          });
        });

        // Process motivation recommendations
        motivationRecommendations.forEach((rec, index) => {
          insightCards.push({
            id: `recommendation-${index}`,
            type: 'recommendation',
            priority: 'medium', // Default priority since rec is a string
            title: `Recommendation ${index + 1}`,
            content: rec, // rec is a string, not an object
            action: {
              label: 'Take Action',
              onPress: () => handleRecommendationAction(rec)
            },
            icon: 'bulb',
            color: '#4ECDC4',
            timestamp: Date.now()
          });
        });
      }

      // Add goal-related insights (mock data for demonstration)
      insightCards.push({
        id: 'goal-progress',
        type: 'goal',
        priority: 'medium',
        title: 'Goal Progress',
        content: 'You\'re 85% towards your weekly step goal. Keep it up!',
        icon: 'trophy',
        color: '#45B7D1',
        timestamp: Date.now()
      });

      // Add pattern insights (mock data for demonstration)
      insightCards.push({
        id: 'pattern-timing',
        type: 'pattern',
        priority: 'low',
        title: 'Walking Pattern',
        content: 'You tend to walk more in the afternoon. Consider morning walks for better energy.',
        icon: 'analytics',
        color: '#96CEB4',
        timestamp: Date.now()
      });

      // Sort by priority and timestamp
      const sortedInsights = insightCards
        .sort((a, b) => {
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
          if (priorityDiff !== 0) return priorityDiff;
          return b.timestamp - a.timestamp;
        })
        .slice(0, maxInsights);

      setInsights(sortedInsights);
      
      // Animate insights appearance
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();

    } catch (err) {
      console.error('Failed to load insights:', err);
      setError('Failed to load insights. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [motivationPrediction, getMotivationInsights, getMotivationRecommendations, maxInsights, loading, fadeAnim, slideAnim, handleRecommendationAction]);



  /**
   * Filters insights based on current filter settings
   */
  const filteredInsights = useMemo(() => {
    return insights.filter(insight => {
      const typeMatch = filters.type.includes(insight.type);
      const priorityMatch = filters.priority.includes(insight.priority);
      
      // Time range filtering (simplified for demonstration)
      let timeMatch = true;
      const now = Date.now();
      const dayMs = 24 * 60 * 60 * 1000;
      
      switch (filters.timeRange) {
        case 'today':
          timeMatch = now - insight.timestamp < dayMs;
          break;
        case 'week':
          timeMatch = now - insight.timestamp < 7 * dayMs;
          break;
        case 'month':
          timeMatch = now - insight.timestamp < 30 * dayMs;
          break;
        default:
          timeMatch = true;
      }
      
      return typeMatch && priorityMatch && timeMatch;
    });
  }, [insights, filters]);

  /**
   * Handles insight card press
   */
  const handleInsightPress = useCallback((insightId: string) => {
    setExpandedInsight(expandedInsight === insightId ? null : insightId);
  }, [expandedInsight]);

  /**
   * Handles refresh
   */
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadInsights();
  }, [loadInsights]);

  /**
   * Auto-refresh effect
   */
  useEffect(() => {
    loadInsights();
    
    if (autoRefresh) {
      const interval = setInterval(loadInsights, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [loadInsights, autoRefresh, refreshInterval]);

  /**
   * Renders insight card
   */
  const renderInsightCard = useCallback((insight: InsightCard, index: number) => {
    const isExpanded = expandedInsight === insight.id;
    const cardWidth = compact ? screenWidth - 32 : screenWidth - 32;
    
    return (
      <Animated.View
        key={insight.id}
        style={{
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
          marginBottom: 12,
          width: cardWidth,
        }}
      >
        <TouchableOpacity
          onPress={() => handleInsightPress(insight.id)}
          style={{
            backgroundColor: 'white',
            borderRadius: 12,
            padding: 16,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
            borderLeftWidth: 4,
            borderLeftColor: insight.color,
          }}
          activeOpacity={0.7}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: insight.color + '20',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12,
              }}
            >
              <Ionicons name={insight.icon as any} size={18} color={insight.color} />
            </View>
            
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 2 }}>
                {insight.title}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 10,
                    backgroundColor: insight.priority === 'high' ? '#FF6B6B20' : 
                                   insight.priority === 'medium' ? '#4ECDC420' : '#96CEB420',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      color: insight.priority === 'high' ? '#FF6B6B' : 
                             insight.priority === 'medium' ? '#4ECDC4' : '#96CEB4',
                      fontWeight: '500',
                    }}
                  >
                    {insight.priority.toUpperCase()}
                  </Text>
                </View>
                <Text style={{ fontSize: 12, color: '#666', marginLeft: 8 }}>
                  {insight.type.charAt(0).toUpperCase() + insight.type.slice(1)}
                </Text>
              </View>
            </View>
            
            <Ionicons
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={20}
              color="#666"
            />
          </View>
          
          <Text
            style={{
              fontSize: 14,
              color: '#555',
              lineHeight: 20,
              marginBottom: isExpanded ? 12 : 0,
            }}
            numberOfLines={isExpanded ? undefined : compact ? 2 : 3}
          >
            {insight.content}
          </Text>
          
          {isExpanded && insight.action && (
            <TouchableOpacity
              onPress={insight.action.onPress}
              style={{
                backgroundColor: insight.color,
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 8,
                alignSelf: 'flex-start',
              }}
            >
              <Text style={{ color: 'white', fontWeight: '600', fontSize: 14 }}>
                {insight.action.label}
              </Text>
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  }, [expandedInsight, handleInsightPress, fadeAnim, slideAnim, compact, screenWidth]);

  /**
   * Renders filter chips
   */
  const renderFilterChips = useCallback(() => {
    if (compact) return null;
    
    const typeFilters = ['motivation', 'goal', 'pattern', 'recommendation'];
    const priorityFilters = ['high', 'medium', 'low'];
    
    return (
      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 }}>
          Filter by Type
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          {typeFilters.map(type => (
            <TouchableOpacity
              key={type}
              onPress={() => {
                const newTypes = filters.type.includes(type)
                  ? filters.type.filter(t => t !== type)
                  : [...filters.type, type];
                setFilters({ ...filters, type: newTypes });
              }}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 16,
                backgroundColor: filters.type.includes(type) ? '#4ECDC4' : '#F0F0F0',
                marginRight: 8,
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  color: filters.type.includes(type) ? 'white' : '#666',
                  fontWeight: '500',
                }}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        
        <Text style={{ fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 }}>
          Filter by Priority
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {priorityFilters.map(priority => (
            <TouchableOpacity
              key={priority}
              onPress={() => {
                const newPriorities = filters.priority.includes(priority)
                  ? filters.priority.filter(p => p !== priority)
                  : [...filters.priority, priority];
                setFilters({ ...filters, priority: newPriorities });
              }}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 16,
                backgroundColor: filters.priority.includes(priority) ? '#FF6B6B' : '#F0F0F0',
                marginRight: 8,
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  color: filters.priority.includes(priority) ? 'white' : '#666',
                  fontWeight: '500',
                }}
              >
                {priority.charAt(0).toUpperCase() + priority.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  }, [compact, filters]);

  /**
   * Renders loading state
   */
  const renderLoading = useCallback(() => (
    <View style={{ alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <Ionicons name="refresh" size={32} color="#4ECDC4" />
      <Text style={{ fontSize: 16, color: '#666', marginTop: 8 }}>
        Loading insights...
      </Text>
    </View>
  ), []);

  /**
   * Renders error state
   */
  const renderError = useCallback(() => (
    <View style={{ alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <Ionicons name="alert-circle" size={32} color="#FF6B6B" />
      <Text style={{ fontSize: 16, color: '#666', marginTop: 8, textAlign: 'center' }}>
        {error}
      </Text>
      <TouchableOpacity
        onPress={handleRefresh}
        style={{
          backgroundColor: '#4ECDC4',
          paddingHorizontal: 16,
          paddingVertical: 8,
          borderRadius: 8,
          marginTop: 12,
        }}
      >
        <Text style={{ color: 'white', fontWeight: '600' }}>
          Try Again
        </Text>
      </TouchableOpacity>
    </View>
  ), [error, handleRefresh]);

  /**
   * Renders empty state
   */
  const renderEmpty = useCallback(() => (
    <View style={{ alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <Ionicons name="bulb-outline" size={32} color="#CCC" />
      <Text style={{ fontSize: 16, color: '#666', marginTop: 8, textAlign: 'center' }}>
        No insights available at the moment.
      </Text>
      <Text style={{ fontSize: 14, color: '#999', marginTop: 4, textAlign: 'center' }}>
        Keep walking to generate personalized insights!
      </Text>
    </View>
  ), []);

  return (
    <View style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
      {/* Header */}
      {!compact && (
        <View style={{ 
          flexDirection: 'row', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: 'white',
          borderBottomWidth: 1,
          borderBottomColor: '#E0E0E0'
        }}>
          <Text style={{ fontSize: 20, fontWeight: '700', color: '#333' }}>
            AI Insights
          </Text>
          <TouchableOpacity
            onPress={handleRefresh}
            disabled={loading || refreshing}
            style={{
              padding: 8,
              borderRadius: 8,
              backgroundColor: refreshing ? '#E0E0E0' : '#4ECDC420',
            }}
          >
            <Ionicons 
              name="refresh" 
              size={20} 
              color={refreshing ? '#999' : '#4ECDC4'} 
            />
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        }
      >
        {/* Filters */}
        {renderFilterChips()}

        {/* Content */}
        {loading && insights.length === 0 ? (
          renderLoading()
        ) : error ? (
          renderError()
        ) : filteredInsights.length === 0 ? (
          renderEmpty()
        ) : (
          <View>
            {filteredInsights.map((insight, index) => renderInsightCard(insight, index))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default StreamlinedInsightsInterface;