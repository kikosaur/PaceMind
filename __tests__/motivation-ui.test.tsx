import React, { createContext } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { MotivationInsights } from '../components/MotivationInsights';
import { MotivationRecommendations } from '../components/MotivationRecommendations';
import { MotivationTrendChart } from '../components/MotivationTrendChart';
import { WalkingContextType } from '../contexts/WalkingContext';
import { MotivationPredictionResponse } from '../lib/motivation-service';

// Create a mock WalkingContext for testing
const WalkingContext = createContext<WalkingContextType | undefined>(undefined);

// Mock the WalkingContext
const createMockWalkingContext = (overrides: Partial<WalkingContextType> = {}): WalkingContextType => ({
  // State
  isWalking: false,
  currentWalk: null,
  routePoints: [],
  splits: [],
  lastCompletedWalk: null,
  
  // Stats
  todayStats: { steps: 0, distance: 0, duration: 0, calories: 0, walks: 0 },
  weeklyStats: { steps: 0, distance: 0, duration: 0, calories: 0, walks: 0 },
  monthlyStats: { steps: 0, distance: 0, duration: 0, calories: 0, walks: 0 },
  yearlyStats: { steps: 0, distance: 0, duration: 0, calories: 0, walks: 0 },
  weeklyGoal: 10,
  motivationLevel: 75,
  motivationTrend: [],
  
  // Journal
  journalEntries: [],
  
  // Enhanced metrics properties
  enhancedMetrics: null,
  qualityReport: null,
  dataQualityScore: 0.8,
  isEnhancedMode: false,
  
  // ML Motivation Prediction properties
  motivationPrediction: null,
  motivationTrendData: null,
  isLoadingPrediction: false,
  predictionError: null,
  lastPredictionUpdate: null,
  
  // Additional motivation properties
  motivationPredictionLoading: false,
  motivationPredictionError: null,
  motivationTrendLoading: false,
  motivationTrendError: null,
  
  // Actions
  startWalk: jest.fn(),
  pauseWalk: jest.fn(),
  resumeWalk: jest.fn(),
  stopWalk: jest.fn(),
  updateSteps: jest.fn(),
  updateDistance: jest.fn(),
  addRoutePoint: jest.fn(),
  resetRoute: jest.fn(),
  saveCurrentWalk: jest.fn(),
  addJournalEntry: jest.fn(),
  
  // Enhanced methods
  toggleEnhancedMode: jest.fn(),
  performCalibration: jest.fn(),
  getQualityReport: jest.fn(),
  getMetricsHistory: jest.fn(),
  
  // ML Motivation Prediction methods
  predictMotivation: jest.fn(),
  getMotivationInsights: jest.fn(),
  getMotivationRecommendations: jest.fn(),
  refreshMotivationTrend: jest.fn(),
  
  ...overrides
});

describe('Motivation UI Components', () => {
  describe('MotivationInsights', () => {
    it('should render loading state', () => {
      const mockContext = createMockWalkingContext({
        motivationPredictionLoading: true
      });

      render(
        <WalkingContext.Provider value={mockContext}>
          <MotivationInsights />
        </WalkingContext.Provider>
      );

      expect(screen.getByText(/loading/i)).toBeTruthy();
    });

    it('should render motivation prediction', () => {
      const mockPrediction: MotivationPredictionResponse = {
        motivation_state: 'high',
        confidence: 0.85,
        suggestion: 'Great job! Keep up the excellent work.',
        insights: {
          primaryFactors: ['Consistency', 'Energy Level'],
          recommendations: ['Keep up the good work', 'Try longer walks']
        },
        recommendations: ['Continue your current routine', 'Try increasing distance gradually'],
        timestamp: Date.now()
      };

      const mockContext = createMockWalkingContext({
        motivationPrediction: mockPrediction,
        motivationPredictionLoading: false
      });

      render(
        <WalkingContext.Provider value={mockContext}>
          <MotivationInsights />
        </WalkingContext.Provider>
      );

      expect(screen.getByText(/great job/i)).toBeTruthy();
    });

    it('should render error state', () => {
      const mockContext = createMockWalkingContext({
        motivationPredictionError: 'Failed to load motivation data'
      });

      render(
        <WalkingContext.Provider value={mockContext}>
          <MotivationInsights />
        </WalkingContext.Provider>
      );

      expect(screen.getByText(/failed to load/i)).toBeTruthy();
    });

    it('should handle refresh action', async () => {
      const mockRefresh = jest.fn();
      const mockContext = createMockWalkingContext({
        predictMotivation: mockRefresh
      });

      render(
        <WalkingContext.Provider value={mockContext}>
          <MotivationInsights />
        </WalkingContext.Provider>
      );

      const refreshButton = screen.getByText(/refresh/i);
      fireEvent.press(refreshButton);

      await waitFor(() => {
        expect(mockRefresh).toHaveBeenCalled();
      });
    });
  });

  describe('MotivationRecommendations', () => {
    it('should render recommendations list', () => {
      const mockPrediction: MotivationPredictionResponse = {
        motivation_state: 'medium',
        confidence: 0.7,
        suggestion: 'Good progress, keep it up!',
        insights: {
          primaryFactors: ['Progress', 'Motivation'],
          recommendations: ['Stay consistent', 'Set new goals']
        },
        recommendations: [
          'Try walking for 30 minutes daily',
          'Set small, achievable goals',
          'Track your progress regularly'
        ],
        timestamp: Date.now()
      };

      const mockContext = createMockWalkingContext({
        motivationPrediction: mockPrediction
      });

      render(
        <WalkingContext.Provider value={mockContext}>
          <MotivationRecommendations />
        </WalkingContext.Provider>
      );

      expect(screen.getByText(/30 minutes daily/i)).toBeTruthy();
      expect(screen.getByText(/achievable goals/i)).toBeTruthy();
      expect(screen.getByText(/track your progress/i)).toBeTruthy();
    });

    it('should render empty state when no recommendations', () => {
      const mockContext = createMockWalkingContext({
        motivationPrediction: null
      });

      render(
        <WalkingContext.Provider value={mockContext}>
          <MotivationRecommendations />
        </WalkingContext.Provider>
      );

      expect(screen.getByText(/no recommendations/i)).toBeTruthy();
    });
  });

  describe('MotivationTrendChart', () => {
    it('should render trend chart with data', () => {
      const mockTrendData = [
        { day: 'Mon', value: 0.7 },
        { day: 'Tue', value: 0.8 },
        { day: 'Wed', value: 0.6 },
        { day: 'Thu', value: 0.9 },
        { day: 'Fri', value: 0.7 },
        { day: 'Sat', value: 0.8 },
        { day: 'Sun', value: 0.6 }
      ];

      const mockContext = createMockWalkingContext({
        motivationTrendData: mockTrendData
      });

      render(
        <WalkingContext.Provider value={mockContext}>
          <MotivationTrendChart />
        </WalkingContext.Provider>
      );

      // Check if trend chart elements are rendered
      expect(screen.getByText(/motivation trend/i)).toBeTruthy();
    });

    it('should render loading state for trend chart', () => {
      const mockContext = createMockWalkingContext({
        motivationTrendLoading: true
      });

      render(
        <WalkingContext.Provider value={mockContext}>
          <MotivationTrendChart />
        </WalkingContext.Provider>
      );

      expect(screen.getByText(/loading/i)).toBeTruthy();
    });

    it('should render error state for trend chart', () => {
      const mockContext = createMockWalkingContext({
        motivationTrendError: 'Failed to load trend data'
      });

      render(
        <WalkingContext.Provider value={mockContext}>
          <MotivationTrendChart />
        </WalkingContext.Provider>
      );

      expect(screen.getByText(/failed to load/i)).toBeTruthy();
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete motivation workflow', async () => {
      const mockPredictMotivation = jest.fn();
      const mockRefreshTrend = jest.fn();
      
      const mockPrediction: MotivationPredictionResponse = {
        motivation_state: 'high',
        confidence: 0.9,
        suggestion: 'Excellent work! You are highly motivated.',
        insights: {
          primaryFactors: ['Consistency', 'Energy Level'],
          recommendations: ['Maintain current pace', 'Consider longer routes']
        },
        timestamp: Date.now()
      };

      const mockTrendData = [
        { day: 'Mon', value: 0.8 },
        { day: 'Tue', value: 0.9 },
        { day: 'Wed', value: 0.7 },
        { day: 'Thu', value: 0.95 },
        { day: 'Fri', value: 0.85 },
        { day: 'Sat', value: 0.9 },
        { day: 'Sun', value: 0.8 }
      ];

      const mockContext = createMockWalkingContext({
        motivationPrediction: mockPrediction,
        motivationTrendData: mockTrendData,
        predictMotivation: mockPredictMotivation,
        refreshMotivationTrend: mockRefreshTrend
      });

      render(
        <WalkingContext.Provider value={mockContext}>
          <MotivationInsights />
          <MotivationRecommendations />
          <MotivationTrendChart />
        </WalkingContext.Provider>
      );

      // Verify all components render with data
      expect(screen.getByText(/excellent work/i)).toBeTruthy();
      expect(screen.getByText(/maintain current pace/i)).toBeTruthy();
      expect(screen.getByText(/motivation trend/i)).toBeTruthy();
    });
  });
});