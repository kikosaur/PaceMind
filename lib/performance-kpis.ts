// Performance KPIs and measurement standards for walking activities

export interface WalkingKPIs {
  // Primary Performance Metrics
  distance: DistanceKPI;
  duration: DurationKPI;
  speed: SpeedKPI;
  pace: PaceKPI;
  calories: CalorieKPI;
  steps: StepKPI;
  
  // Advanced Performance Metrics
  efficiency: EfficiencyKPI;
  consistency: ConsistencyKPI;
  endurance: EnduranceKPI;
  improvement: ImprovementKPI;
  
  // Health & Fitness Metrics
  heartRate: HeartRateKPI;
  cadence: CadenceKPI;
  strideLength: StrideLengthKPI;
  
  // Data Quality Metrics
  accuracy: AccuracyKPI;
  reliability: ReliabilityKPI;
  completeness: CompletenessKPI;
}

export interface BaseKPI {
  name: string;
  description: string;
  unit: string;
  target: number;
  current: number;
  benchmark: number;
  trend: 'improving' | 'declining' | 'stable';
  confidence: number; // 0-1
  lastUpdated: number;
  category: KPICategory;
}

export type KPICategory = 
  | 'performance' 
  | 'health' 
  | 'efficiency' 
  | 'quality' 
  | 'progress';

// Specific KPI interfaces
export interface DistanceKPI extends BaseKPI {
  totalDistance: number;
  averageDistance: number;
  longestDistance: number;
  weeklyGoal: number;
  monthlyGoal: number;
}

export interface DurationKPI extends BaseKPI {
  totalDuration: number;
  averageDuration: number;
  longestDuration: number;
  activeTime: number;
  restTime: number;
}

export interface SpeedKPI extends BaseKPI {
  averageSpeed: number;
  maxSpeed: number;
  minSpeed: number;
  speedVariability: number;
  targetSpeed: number;
}

export interface PaceKPI extends BaseKPI {
  averagePace: number;
  bestPace: number;
  targetPace: number;
  paceConsistency: number;
  paceZones: PaceZone[];
}

export interface CalorieKPI extends BaseKPI {
  totalCalories: number;
  caloriesPerKm: number;
  caloriesPerHour: number;
  dailyCalorieGoal: number;
  metabolicEfficiency: number;
}

export interface StepKPI extends BaseKPI {
  totalSteps: number;
  averageSteps: number;
  stepsPerKm: number;
  dailyStepGoal: number;
  stepConsistency: number;
}

export interface EfficiencyKPI extends BaseKPI {
  energyEfficiency: number;
  movementEfficiency: number;
  timeEfficiency: number;
  routeEfficiency: number;
}

export interface ConsistencyKPI extends BaseKPI {
  paceConsistency: number;
  speedConsistency: number;
  routeConsistency: number;
  scheduleConsistency: number;
}

export interface EnduranceKPI extends BaseKPI {
  enduranceIndex: number;
  fatigueResistance: number;
  recoveryRate: number;
  sustainedPerformance: number;
}

export interface ImprovementKPI extends BaseKPI {
  weeklyImprovement: number;
  monthlyImprovement: number;
  yearlyImprovement: number;
  personalBests: PersonalBest[];
}

export interface HeartRateKPI extends BaseKPI {
  averageHeartRate: number;
  maxHeartRate: number;
  restingHeartRate: number;
  heartRateZones: HeartRateZone[];
}

export interface CadenceKPI extends BaseKPI {
  averageCadence: number;
  targetCadence: number;
  cadenceConsistency: number;
  optimalCadence: number;
}

export interface StrideLengthKPI extends BaseKPI {
  averageStrideLength: number;
  optimalStrideLength: number;
  strideLengthConsistency: number;
  strideLengthEfficiency: number;
}

export interface AccuracyKPI extends BaseKPI {
  gpsAccuracy: number;
  distanceAccuracy: number;
  speedAccuracy: number;
  elevationAccuracy: number;
}

export interface ReliabilityKPI extends BaseKPI {
  dataReliability: number;
  sensorReliability: number;
  measurementReliability: number;
  systemReliability: number;
}

export interface CompletenessKPI extends BaseKPI {
  dataCompleteness: number;
  sessionCompleteness: number;
  metricCompleteness: number;
  recordingCompleteness: number;
}

// Supporting interfaces
export interface PaceZone {
  name: string;
  minPace: number;
  maxPace: number;
  percentage: number;
  target: number;
}

export interface HeartRateZone {
  name: string;
  minHR: number;
  maxHR: number;
  percentage: number;
  target: number;
}

export interface PersonalBest {
  metric: string;
  value: number;
  date: number;
  conditions: string;
}

// KPI calculation and management system
export class PerformanceKPISystem {
  private kpis: Partial<WalkingKPIs> = {};
  private historicalData: Array<{
    timestamp: number;
    kpis: Partial<WalkingKPIs>;
  }> = [];
  private targets: Record<string, number> = {};
  private benchmarks: Record<string, number> = {};

  constructor() {
    this.initializeDefaultTargets();
    this.initializeBenchmarks();
  }

  // Initialize default targets based on fitness guidelines
  private initializeDefaultTargets(): void {
    this.targets = {
      // WHO/CDC recommendations
      weeklyDistance: 10, // 10km per week minimum
      dailySteps: 10000, // 10,000 steps per day
      weeklyDuration: 150, // 150 minutes per week
      
      // Performance targets
      averageSpeed: 5.0, // 5 km/h walking speed
      averagePace: 12.0, // 12 minutes per km
      caloriesPerKm: 50, // 50 calories per km
      
      // Quality targets
      gpsAccuracy: 5.0, // 5 meters accuracy
      dataCompleteness: 0.95, // 95% data completeness
      reliability: 0.90, // 90% reliability
      
      // Health targets
      cadence: 100, // 100 steps per minute
      strideLength: 0.7, // 0.7 meters stride length
    };
  }

  // Initialize benchmarks based on population data
  private initializeBenchmarks(): void {
    this.benchmarks = {
      // Population averages
      averageSpeed: 4.5, // km/h
      averagePace: 13.3, // min/km
      dailySteps: 7500,
      caloriesPerKm: 45,
      
      // Performance benchmarks
      goodSpeed: 5.5, // km/h
      excellentSpeed: 6.5, // km/h
      goodPace: 11.0, // min/km
      excellentPace: 9.0, // min/km
      
      // Quality benchmarks
      goodAccuracy: 3.0, // meters
      excellentAccuracy: 1.0, // meters
      goodReliability: 0.85,
      excellentReliability: 0.95,
    };
  }

  // Calculate all KPIs from activity data
  calculateKPIs(activityData: {
    sessions: Array<{
      distance: number;
      duration: number;
      steps: number;
      calories: number;
      avgSpeed: number;
      avgPace: number;
      timestamp: number;
      gpsAccuracy?: number;
      heartRate?: number[];
      cadence?: number;
    }>;
    timeframe: 'daily' | 'weekly' | 'monthly' | 'yearly';
  }): WalkingKPIs {
    const { sessions, timeframe } = activityData;
    
    if (sessions.length === 0) {
      return this.getEmptyKPIs();
    }

    // Calculate primary metrics
    const distance = this.calculateDistanceKPI(sessions, timeframe);
    const duration = this.calculateDurationKPI(sessions, timeframe);
    const speed = this.calculateSpeedKPI(sessions);
    const pace = this.calculatePaceKPI(sessions);
    const calories = this.calculateCalorieKPI(sessions);
    const steps = this.calculateStepKPI(sessions, timeframe);

    // Calculate advanced metrics
    const efficiency = this.calculateEfficiencyKPI(sessions);
    const consistency = this.calculateConsistencyKPI(sessions);
    const endurance = this.calculateEnduranceKPI(sessions);
    const improvement = this.calculateImprovementKPI(sessions);

    // Calculate health metrics
    const heartRate = this.calculateHeartRateKPI(sessions);
    const cadence = this.calculateCadenceKPI(sessions);
    const strideLength = this.calculateStrideLengthKPI(sessions);

    // Calculate quality metrics
    const accuracy = this.calculateAccuracyKPI(sessions);
    const reliability = this.calculateReliabilityKPI(sessions);
    const completeness = this.calculateCompletenessKPI(sessions);

    const kpis: WalkingKPIs = {
      distance,
      duration,
      speed,
      pace,
      calories,
      steps,
      efficiency,
      consistency,
      endurance,
      improvement,
      heartRate,
      cadence,
      strideLength,
      accuracy,
      reliability,
      completeness
    };

    // Store historical data
    this.historicalData.push({
      timestamp: Date.now(),
      kpis
    });

    // Keep only recent history (last 100 calculations)
    if (this.historicalData.length > 100) {
      this.historicalData.shift();
    }

    this.kpis = kpis;
    return kpis;
  }

  // Individual KPI calculation methods
  private calculateDistanceKPI(sessions: any[], timeframe: string): DistanceKPI {
    const totalDistance = sessions.reduce((sum, s) => sum + s.distance, 0);
    const averageDistance = totalDistance / sessions.length;
    const longestDistance = Math.max(...sessions.map(s => s.distance));
    
    const weeklyGoal = this.targets.weeklyDistance || 10;
    const monthlyGoal = weeklyGoal * 4.33;

    return {
      name: 'Distance',
      description: 'Total and average distance covered',
      unit: 'km',
      target: timeframe === 'weekly' ? weeklyGoal : weeklyGoal / 7,
      current: timeframe === 'weekly' ? totalDistance : averageDistance,
      benchmark: this.benchmarks.averageDistance || averageDistance,
      trend: this.calculateTrend('distance', totalDistance),
      confidence: this.calculateConfidence(sessions.length),
      lastUpdated: Date.now(),
      category: 'performance',
      totalDistance,
      averageDistance,
      longestDistance,
      weeklyGoal,
      monthlyGoal
    };
  }

  private calculateDurationKPI(sessions: any[], timeframe: string): DurationKPI {
    const totalDuration = sessions.reduce((sum, s) => sum + s.duration, 0);
    const averageDuration = totalDuration / sessions.length;
    const longestDuration = Math.max(...sessions.map(s => s.duration));

    return {
      name: 'Duration',
      description: 'Time spent walking',
      unit: 'minutes',
      target: this.targets.weeklyDuration || 150,
      current: timeframe === 'weekly' ? totalDuration / 60 : averageDuration / 60,
      benchmark: this.benchmarks.averageDuration || averageDuration / 60,
      trend: this.calculateTrend('duration', totalDuration),
      confidence: this.calculateConfidence(sessions.length),
      lastUpdated: Date.now(),
      category: 'performance',
      totalDuration: totalDuration / 60,
      averageDuration: averageDuration / 60,
      longestDuration: longestDuration / 60,
      activeTime: totalDuration / 60,
      restTime: 0 // Would need additional data to calculate
    };
  }

  private calculateSpeedKPI(sessions: any[]): SpeedKPI {
    const speeds = sessions.map(s => s.avgSpeed).filter(s => s > 0);
    const averageSpeed = speeds.reduce((sum, s) => sum + s, 0) / speeds.length;
    const maxSpeed = Math.max(...speeds);
    const minSpeed = Math.min(...speeds);
    const speedVariability = this.calculateVariability(speeds);

    return {
      name: 'Speed',
      description: 'Walking speed performance',
      unit: 'km/h',
      target: this.targets.averageSpeed || 5.0,
      current: averageSpeed,
      benchmark: this.benchmarks.averageSpeed || 4.5,
      trend: this.calculateTrend('speed', averageSpeed),
      confidence: this.calculateConfidence(speeds.length),
      lastUpdated: Date.now(),
      category: 'performance',
      averageSpeed,
      maxSpeed,
      minSpeed,
      speedVariability,
      targetSpeed: this.targets.averageSpeed || 5.0
    };
  }

  private calculatePaceKPI(sessions: any[]): PaceKPI {
    const paces = sessions.map(s => s.avgPace).filter(p => p > 0);
    const averagePace = paces.reduce((sum, p) => sum + p, 0) / paces.length;
    const bestPace = Math.min(...paces);
    const paceConsistency = 1 - this.calculateVariability(paces);

    const paceZones: PaceZone[] = [
      { name: 'Easy', minPace: 14, maxPace: 16, percentage: 0, target: 60 },
      { name: 'Moderate', minPace: 12, maxPace: 14, percentage: 0, target: 30 },
      { name: 'Brisk', minPace: 10, maxPace: 12, percentage: 0, target: 10 }
    ];

    // Calculate actual percentages
    paceZones.forEach(zone => {
      const inZone = paces.filter(p => p >= zone.minPace && p <= zone.maxPace).length;
      zone.percentage = (inZone / paces.length) * 100;
    });

    return {
      name: 'Pace',
      description: 'Walking pace performance',
      unit: 'min/km',
      target: this.targets.averagePace || 12.0,
      current: averagePace,
      benchmark: this.benchmarks.averagePace || 13.3,
      trend: this.calculateTrend('pace', averagePace),
      confidence: this.calculateConfidence(paces.length),
      lastUpdated: Date.now(),
      category: 'performance',
      averagePace,
      bestPace,
      targetPace: this.targets.averagePace || 12.0,
      paceConsistency,
      paceZones
    };
  }

  private calculateCalorieKPI(sessions: any[]): CalorieKPI {
    const totalCalories = sessions.reduce((sum, s) => sum + s.calories, 0);
    const totalDistance = sessions.reduce((sum, s) => sum + s.distance, 0);
    const totalDuration = sessions.reduce((sum, s) => sum + s.duration, 0);
    
    const caloriesPerKm = totalDistance > 0 ? totalCalories / totalDistance : 0;
    const caloriesPerHour = totalDuration > 0 ? (totalCalories / totalDuration) * 3600 : 0;

    return {
      name: 'Calories',
      description: 'Energy expenditure',
      unit: 'kcal',
      target: this.targets.caloriesPerKm || 50,
      current: caloriesPerKm,
      benchmark: this.benchmarks.caloriesPerKm || 45,
      trend: this.calculateTrend('calories', totalCalories),
      confidence: this.calculateConfidence(sessions.length),
      lastUpdated: Date.now(),
      category: 'health',
      totalCalories,
      caloriesPerKm,
      caloriesPerHour,
      dailyCalorieGoal: 300, // Example daily goal
      metabolicEfficiency: this.calculateMetabolicEfficiency(caloriesPerKm)
    };
  }

  private calculateStepKPI(sessions: any[], timeframe: string): StepKPI {
    const totalSteps = sessions.reduce((sum, s) => sum + s.steps, 0);
    const averageSteps = totalSteps / sessions.length;
    const totalDistance = sessions.reduce((sum, s) => sum + s.distance, 0);
    const stepsPerKm = totalDistance > 0 ? totalSteps / totalDistance : 0;
    
    const stepCounts = sessions.map(s => s.steps);
    const stepConsistency = 1 - this.calculateVariability(stepCounts);

    return {
      name: 'Steps',
      description: 'Step count performance',
      unit: 'steps',
      target: this.targets.dailySteps || 10000,
      current: timeframe === 'daily' ? totalSteps : averageSteps,
      benchmark: this.benchmarks.dailySteps || 7500,
      trend: this.calculateTrend('steps', totalSteps),
      confidence: this.calculateConfidence(sessions.length),
      lastUpdated: Date.now(),
      category: 'performance',
      totalSteps,
      averageSteps,
      stepsPerKm,
      dailyStepGoal: this.targets.dailySteps || 10000,
      stepConsistency
    };
  }

  // Additional KPI calculation methods would continue here...
  // For brevity, I'll include placeholder implementations

  private calculateEfficiencyKPI(sessions: any[]): EfficiencyKPI {
    // Placeholder implementation
    return {
      name: 'Efficiency',
      description: 'Movement and energy efficiency',
      unit: 'index',
      target: 0.8,
      current: 0.75,
      benchmark: 0.7,
      trend: 'stable',
      confidence: 0.8,
      lastUpdated: Date.now(),
      category: 'efficiency',
      energyEfficiency: 0.75,
      movementEfficiency: 0.8,
      timeEfficiency: 0.7,
      routeEfficiency: 0.85
    };
  }

  private calculateConsistencyKPI(sessions: any[]): ConsistencyKPI {
    const speeds = sessions.map(s => s.avgSpeed);
    const paces = sessions.map(s => s.avgPace);
    
    return {
      name: 'Consistency',
      description: 'Performance consistency',
      unit: 'index',
      target: 0.8,
      current: 1 - this.calculateVariability(speeds),
      benchmark: 0.7,
      trend: 'improving',
      confidence: 0.85,
      lastUpdated: Date.now(),
      category: 'performance',
      paceConsistency: 1 - this.calculateVariability(paces),
      speedConsistency: 1 - this.calculateVariability(speeds),
      routeConsistency: 0.8,
      scheduleConsistency: 0.75
    };
  }

  // Placeholder implementations for remaining KPIs
  private calculateEnduranceKPI(sessions: any[]): EnduranceKPI {
    return {
      name: 'Endurance',
      description: 'Endurance performance',
      unit: 'index',
      target: 0.8,
      current: 0.7,
      benchmark: 0.65,
      trend: 'improving',
      confidence: 0.8,
      lastUpdated: Date.now(),
      category: 'performance',
      enduranceIndex: 0.7,
      fatigueResistance: 0.75,
      recoveryRate: 0.8,
      sustainedPerformance: 0.65
    };
  }

  private calculateImprovementKPI(sessions: any[]): ImprovementKPI {
    return {
      name: 'Improvement',
      description: 'Performance improvement trends',
      unit: '%',
      target: 5,
      current: 3.2,
      benchmark: 2.5,
      trend: 'improving',
      confidence: 0.9,
      lastUpdated: Date.now(),
      category: 'progress',
      weeklyImprovement: 1.5,
      monthlyImprovement: 3.2,
      yearlyImprovement: 15.8,
      personalBests: []
    };
  }

  private calculateHeartRateKPI(sessions: any[]): HeartRateKPI {
    return {
      name: 'Heart Rate',
      description: 'Heart rate performance',
      unit: 'bpm',
      target: 120,
      current: 115,
      benchmark: 110,
      trend: 'stable',
      confidence: 0.7,
      lastUpdated: Date.now(),
      category: 'health',
      averageHeartRate: 115,
      maxHeartRate: 140,
      restingHeartRate: 65,
      heartRateZones: []
    };
  }

  private calculateCadenceKPI(sessions: any[]): CadenceKPI {
    return {
      name: 'Cadence',
      description: 'Step cadence performance',
      unit: 'steps/min',
      target: 100,
      current: 95,
      benchmark: 90,
      trend: 'improving',
      confidence: 0.8,
      lastUpdated: Date.now(),
      category: 'performance',
      averageCadence: 95,
      targetCadence: 100,
      cadenceConsistency: 0.85,
      optimalCadence: 105
    };
  }

  private calculateStrideLengthKPI(sessions: any[]): StrideLengthKPI {
    return {
      name: 'Stride Length',
      description: 'Stride length performance',
      unit: 'meters',
      target: 0.7,
      current: 0.68,
      benchmark: 0.65,
      trend: 'stable',
      confidence: 0.75,
      lastUpdated: Date.now(),
      category: 'performance',
      averageStrideLength: 0.68,
      optimalStrideLength: 0.7,
      strideLengthConsistency: 0.8,
      strideLengthEfficiency: 0.85
    };
  }

  private calculateAccuracyKPI(sessions: any[]): AccuracyKPI {
    const accuracies = sessions.map(s => s.gpsAccuracy).filter(a => a !== undefined);
    const avgAccuracy = accuracies.length > 0 ? 
      accuracies.reduce((sum, a) => sum + a, 0) / accuracies.length : 5;

    return {
      name: 'Accuracy',
      description: 'Measurement accuracy',
      unit: 'meters',
      target: 3,
      current: avgAccuracy,
      benchmark: 5,
      trend: 'improving',
      confidence: 0.9,
      lastUpdated: Date.now(),
      category: 'quality',
      gpsAccuracy: avgAccuracy,
      distanceAccuracy: 0.95,
      speedAccuracy: 0.9,
      elevationAccuracy: 0.85
    };
  }

  private calculateReliabilityKPI(sessions: any[]): ReliabilityKPI {
    return {
      name: 'Reliability',
      description: 'System reliability',
      unit: 'index',
      target: 0.95,
      current: 0.92,
      benchmark: 0.85,
      trend: 'stable',
      confidence: 0.95,
      lastUpdated: Date.now(),
      category: 'quality',
      dataReliability: 0.92,
      sensorReliability: 0.9,
      measurementReliability: 0.94,
      systemReliability: 0.91
    };
  }

  private calculateCompletenessKPI(sessions: any[]): CompletenessKPI {
    return {
      name: 'Completeness',
      description: 'Data completeness',
      unit: 'index',
      target: 0.95,
      current: 0.93,
      benchmark: 0.9,
      trend: 'stable',
      confidence: 0.9,
      lastUpdated: Date.now(),
      category: 'quality',
      dataCompleteness: 0.93,
      sessionCompleteness: 0.95,
      metricCompleteness: 0.92,
      recordingCompleteness: 0.94
    };
  }

  // Helper methods
  private calculateTrend(metric: string, currentValue: number): 'improving' | 'declining' | 'stable' {
    const recentHistory = this.historicalData.slice(-5);
    if (recentHistory.length < 2) return 'stable';

    const values = recentHistory.map(h => this.getKPIValue(h.kpis, metric)).filter(v => v !== null);
    if (values.length < 2) return 'stable';

    const trend = (values[values.length - 1] - values[0]) / values[0];
    if (Math.abs(trend) < 0.05) return 'stable';
    return trend > 0 ? 'improving' : 'declining';
  }

  private calculateConfidence(sampleSize: number): number {
    // Confidence based on sample size
    return Math.min(1, sampleSize / 10);
  }

  private calculateVariability(values: number[]): number {
    if (values.length < 2) return 0;
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    return mean > 0 ? stdDev / mean : 0; // Coefficient of variation
  }

  private calculateMetabolicEfficiency(caloriesPerKm: number): number {
    const optimal = 45; // Optimal calories per km
    return Math.max(0, 1 - Math.abs(caloriesPerKm - optimal) / optimal);
  }

  private getKPIValue(kpis: Partial<WalkingKPIs>, metric: string): number | null {
    // Extract specific metric value from KPIs object
    switch (metric) {
      case 'distance': return kpis.distance?.current || null;
      case 'duration': return kpis.duration?.current || null;
      case 'speed': return kpis.speed?.current || null;
      case 'pace': return kpis.pace?.current || null;
      case 'calories': return kpis.calories?.current || null;
      case 'steps': return kpis.steps?.current || null;
      default: return null;
    }
  }

  private getEmptyKPIs(): WalkingKPIs {
    // Return empty KPI structure when no data is available
    const emptyKPI: BaseKPI = {
      name: '',
      description: '',
      unit: '',
      target: 0,
      current: 0,
      benchmark: 0,
      trend: 'stable',
      confidence: 0,
      lastUpdated: Date.now(),
      category: 'performance'
    };

    return {
      distance: { ...emptyKPI, name: 'Distance', totalDistance: 0, averageDistance: 0, longestDistance: 0, weeklyGoal: 0, monthlyGoal: 0 } as DistanceKPI,
      duration: { ...emptyKPI, name: 'Duration', totalDuration: 0, averageDuration: 0, longestDuration: 0, activeTime: 0, restTime: 0 } as DurationKPI,
      speed: { ...emptyKPI, name: 'Speed', averageSpeed: 0, maxSpeed: 0, minSpeed: 0, speedVariability: 0, targetSpeed: 0 } as SpeedKPI,
      pace: { ...emptyKPI, name: 'Pace', averagePace: 0, bestPace: 0, targetPace: 0, paceConsistency: 0, paceZones: [] } as PaceKPI,
      calories: { ...emptyKPI, name: 'Calories', totalCalories: 0, caloriesPerKm: 0, caloriesPerHour: 0, dailyCalorieGoal: 0, metabolicEfficiency: 0 } as CalorieKPI,
      steps: { ...emptyKPI, name: 'Steps', totalSteps: 0, averageSteps: 0, stepsPerKm: 0, dailyStepGoal: 0, stepConsistency: 0 } as StepKPI,
      efficiency: { ...emptyKPI, name: 'Efficiency', energyEfficiency: 0, movementEfficiency: 0, timeEfficiency: 0, routeEfficiency: 0 } as EfficiencyKPI,
      consistency: { ...emptyKPI, name: 'Consistency', paceConsistency: 0, speedConsistency: 0, routeConsistency: 0, scheduleConsistency: 0 } as ConsistencyKPI,
      endurance: { ...emptyKPI, name: 'Endurance', enduranceIndex: 0, fatigueResistance: 0, recoveryRate: 0, sustainedPerformance: 0 } as EnduranceKPI,
      improvement: { ...emptyKPI, name: 'Improvement', weeklyImprovement: 0, monthlyImprovement: 0, yearlyImprovement: 0, personalBests: [] } as ImprovementKPI,
      heartRate: { ...emptyKPI, name: 'Heart Rate', averageHeartRate: 0, maxHeartRate: 0, restingHeartRate: 0, heartRateZones: [] } as HeartRateKPI,
      cadence: { ...emptyKPI, name: 'Cadence', averageCadence: 0, targetCadence: 0, cadenceConsistency: 0, optimalCadence: 0 } as CadenceKPI,
      strideLength: { ...emptyKPI, name: 'Stride Length', averageStrideLength: 0, optimalStrideLength: 0, strideLengthConsistency: 0, strideLengthEfficiency: 0 } as StrideLengthKPI,
      accuracy: { ...emptyKPI, name: 'Accuracy', gpsAccuracy: 0, distanceAccuracy: 0, speedAccuracy: 0, elevationAccuracy: 0 } as AccuracyKPI,
      reliability: { ...emptyKPI, name: 'Reliability', dataReliability: 0, sensorReliability: 0, measurementReliability: 0, systemReliability: 0 } as ReliabilityKPI,
      completeness: { ...emptyKPI, name: 'Completeness', dataCompleteness: 0, sessionCompleteness: 0, metricCompleteness: 0, recordingCompleteness: 0 } as CompletenessKPI
    };
  }

  // Public methods
  getCurrentKPIs(): Partial<WalkingKPIs> {
    return this.kpis;
  }

  getKPIHistory(): Array<{ timestamp: number; kpis: Partial<WalkingKPIs> }> {
    return [...this.historicalData];
  }

  setTarget(kpiName: string, target: number): void {
    this.targets[kpiName] = target;
  }

  getTargets(): Record<string, number> {
    return { ...this.targets };
  }

  setBenchmark(kpiName: string, benchmark: number): void {
    this.benchmarks[kpiName] = benchmark;
  }

  getBenchmarks(): Record<string, number> {
    return { ...this.benchmarks };
  }

  reset(): void {
    this.kpis = {};
    this.historicalData = [];
  }
}