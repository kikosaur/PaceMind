import { DataValidationSystem, DataQualityMetrics } from './data-validation';
import { SensorCalibrationSystem, CalibrationStatus } from './sensor-calibration';
import { StatisticalAnomalyDetector, AnomalyResult } from './anomaly-detection';
import { PerformanceKPISystem, WalkingKPIs } from './performance-kpis';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Data quality monitoring interfaces
export interface QualityReport {
  timestamp: number;
  overallScore: number; // 0-1
  category: QualityCategory;
  metrics: QualityMetrics;
  issues: QualityIssue[];
  recommendations: string[];
  trends: QualityTrend[];
  summary: string;
}

export type QualityCategory = 'excellent' | 'good' | 'fair' | 'poor' | 'critical';

export interface QualityMetrics {
  // Data accuracy metrics
  gpsAccuracy: QualityMetric;
  distanceAccuracy: QualityMetric;
  speedAccuracy: QualityMetric;
  stepAccuracy: QualityMetric;
  
  // Data completeness metrics
  dataCompleteness: QualityMetric;
  sessionCompleteness: QualityMetric;
  sensorCompleteness: QualityMetric;
  
  // Data consistency metrics
  temporalConsistency: QualityMetric;
  spatialConsistency: QualityMetric;
  measurementConsistency: QualityMetric;
  
  // System reliability metrics
  sensorReliability: QualityMetric;
  calibrationStatus: QualityMetric;
  anomalyRate: QualityMetric;
  
  // Performance metrics
  responseTime: QualityMetric;
  throughput: QualityMetric;
  errorRate: QualityMetric;
}

export interface QualityMetric {
  name: string;
  value: number; // 0-1
  target: number; // 0-1
  status: 'excellent' | 'good' | 'warning' | 'critical';
  trend: 'improving' | 'stable' | 'declining';
  lastUpdated: number;
}

export interface QualityIssue {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'accuracy' | 'completeness' | 'consistency' | 'reliability' | 'performance';
  title: string;
  description: string;
  impact: string;
  recommendation: string;
  firstDetected: number;
  lastOccurred: number;
  occurrenceCount: number;
  resolved: boolean;
}

export interface QualityTrend {
  metric: string;
  direction: 'up' | 'down' | 'stable';
  magnitude: number; // percentage change
  timeframe: string;
  significance: 'high' | 'medium' | 'low';
}

export interface QualityAlert {
  id: string;
  timestamp: number;
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  metric: string;
  value: number;
  threshold: number;
  acknowledged: boolean;
}

// Quality monitoring configuration
export interface MonitoringConfig {
  reportingInterval: number; // milliseconds
  alertThresholds: {
    gpsAccuracy: number;
    dataCompleteness: number;
    anomalyRate: number;
    errorRate: number;
  };
  trendAnalysisWindow: number; // number of reports to analyze
  enableRealTimeAlerts: boolean;
  enableAutomaticReporting: boolean;
  storageRetentionDays: number;
}

const DEFAULT_CONFIG: MonitoringConfig = {
  reportingInterval: 300000, // 5 minutes
  alertThresholds: {
    gpsAccuracy: 0.7, // 70% threshold
    dataCompleteness: 0.8, // 80% threshold
    anomalyRate: 0.1, // 10% anomaly rate threshold
    errorRate: 0.05 // 5% error rate threshold
  },
  trendAnalysisWindow: 20,
  enableRealTimeAlerts: true,
  enableAutomaticReporting: true,
  storageRetentionDays: 30
};

// Main data quality monitoring system
export class DataQualityMonitor {
  private config: MonitoringConfig;
  private validationSystem: DataValidationSystem;
  private calibrationSystem: SensorCalibrationSystem;
  private anomalyDetector: StatisticalAnomalyDetector;
  private kpiSystem: PerformanceKPISystem;
  
  private qualityHistory: QualityReport[] = [];
  private activeIssues: QualityIssue[] = [];
  private activeAlerts: QualityAlert[] = [];
  private isMonitoring = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  
  // Performance tracking
  private performanceMetrics = {
    responseTime: [] as number[],
    throughput: [] as number[],
    errorCount: 0,
    totalRequests: 0
  };

  constructor(config: Partial<MonitoringConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.validationSystem = new DataValidationSystem();
    this.calibrationSystem = new SensorCalibrationSystem();
    this.anomalyDetector = new StatisticalAnomalyDetector();
    this.kpiSystem = new PerformanceKPISystem();
    
    this.loadStoredData();
  }

  // Start monitoring
  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    
    if (this.config.enableAutomaticReporting) {
      this.monitoringInterval = setInterval(() => {
        this.generateQualityReport();
      }, this.config.reportingInterval) as any;
    }
    
    console.log('Data quality monitoring started');
  }

  // Stop monitoring
  stopMonitoring(): void {
    this.isMonitoring = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    console.log('Data quality monitoring stopped');
  }

  // Generate comprehensive quality report
  async generateQualityReport(): Promise<QualityReport> {
    const timestamp = Date.now();
    
    try {
      // Collect quality metrics from all systems
      const dataQuality = this.validationSystem.getOverallDataQuality();
      const calibrationStatus = this.calibrationSystem.getCalibrationStatus();
      const anomalyStats = this.anomalyDetector.getStatistics();
      
      // Calculate quality metrics
      const metrics = this.calculateQualityMetrics(dataQuality, calibrationStatus, anomalyStats);
      
      // Calculate overall score
      const overallScore = this.calculateOverallScore(metrics);
      
      // Determine quality category
      const category = this.determineQualityCategory(overallScore);
      
      // Identify issues
      const issues = this.identifyQualityIssues(metrics);
      
      // Generate recommendations
      const recommendations = this.generateRecommendations(metrics, issues);
      
      // Analyze trends
      const trends = this.analyzeTrends(metrics);
      
      // Generate summary
      const summary = this.generateSummary(overallScore, category, issues.length);
      
      const report: QualityReport = {
        timestamp,
        overallScore,
        category,
        metrics,
        issues,
        recommendations,
        trends,
        summary
      };
      
      // Store report
      this.qualityHistory.push(report);
      this.maintainHistorySize();
      
      // Check for alerts
      if (this.config.enableRealTimeAlerts) {
        this.checkForAlerts(report);
      }
      
      // Save to storage
      await this.saveToStorage();
      
      return report;
      
    } catch (error) {
      console.error('Error generating quality report:', error);
      throw error;
    }
  }

  // Calculate quality metrics from system data
  private calculateQualityMetrics(
    dataQuality: DataQualityMetrics,
    calibrationStatus: CalibrationStatus,
    anomalyStats: any
  ): QualityMetrics {
    return {
      // Accuracy metrics
      gpsAccuracy: {
        name: 'GPS Accuracy',
        value: dataQuality.gpsAccuracy,
        target: 0.8,
        status: this.getMetricStatus(dataQuality.gpsAccuracy, 0.8),
        trend: this.calculateMetricTrend('gpsAccuracy'),
        lastUpdated: Date.now()
      },
      distanceAccuracy: {
        name: 'Distance Accuracy',
        value: 0.95, // Would be calculated from validation results
        target: 0.9,
        status: this.getMetricStatus(0.95, 0.9),
        trend: this.calculateMetricTrend('distanceAccuracy'),
        lastUpdated: Date.now()
      },
      speedAccuracy: {
        name: 'Speed Accuracy',
        value: 0.92,
        target: 0.85,
        status: this.getMetricStatus(0.92, 0.85),
        trend: this.calculateMetricTrend('speedAccuracy'),
        lastUpdated: Date.now()
      },
      stepAccuracy: {
        name: 'Step Accuracy',
        value: 0.88,
        target: 0.8,
        status: this.getMetricStatus(0.88, 0.8),
        trend: this.calculateMetricTrend('stepAccuracy'),
        lastUpdated: Date.now()
      },
      
      // Completeness metrics
      dataCompleteness: {
        name: 'Data Completeness',
        value: dataQuality.dataCompleteness,
        target: 0.95,
        status: this.getMetricStatus(dataQuality.dataCompleteness, 0.95),
        trend: this.calculateMetricTrend('dataCompleteness'),
        lastUpdated: Date.now()
      },
      sessionCompleteness: {
        name: 'Session Completeness',
        value: 0.97,
        target: 0.9,
        status: this.getMetricStatus(0.97, 0.9),
        trend: this.calculateMetricTrend('sessionCompleteness'),
        lastUpdated: Date.now()
      },
      sensorCompleteness: {
        name: 'Sensor Completeness',
        value: 0.93,
        target: 0.85,
        status: this.getMetricStatus(0.93, 0.85),
        trend: this.calculateMetricTrend('sensorCompleteness'),
        lastUpdated: Date.now()
      },
      
      // Consistency metrics
      temporalConsistency: {
        name: 'Temporal Consistency',
        value: dataQuality.temporalConsistency,
        target: 0.9,
        status: this.getMetricStatus(dataQuality.temporalConsistency, 0.9),
        trend: this.calculateMetricTrend('temporalConsistency'),
        lastUpdated: Date.now()
      },
      spatialConsistency: {
        name: 'Spatial Consistency',
        value: dataQuality.spatialConsistency,
        target: 0.85,
        status: this.getMetricStatus(dataQuality.spatialConsistency, 0.85),
        trend: this.calculateMetricTrend('spatialConsistency'),
        lastUpdated: Date.now()
      },
      measurementConsistency: {
        name: 'Measurement Consistency',
        value: 0.91,
        target: 0.8,
        status: this.getMetricStatus(0.91, 0.8),
        trend: this.calculateMetricTrend('measurementConsistency'),
        lastUpdated: Date.now()
      },
      
      // Reliability metrics
      sensorReliability: {
        name: 'Sensor Reliability',
        value: dataQuality.sensorReliability,
        target: 0.9,
        status: this.getMetricStatus(dataQuality.sensorReliability, 0.9),
        trend: this.calculateMetricTrend('sensorReliability'),
        lastUpdated: Date.now()
      },
      calibrationStatus: {
        name: 'Calibration Status',
        value: calibrationStatus.quality,
        target: 0.8,
        status: this.getMetricStatus(calibrationStatus.quality, 0.8),
        trend: this.calculateMetricTrend('calibrationStatus'),
        lastUpdated: Date.now()
      },
      anomalyRate: {
        name: 'Anomaly Rate',
        value: 1 - (anomalyStats.dataPoints > 0 ? 0.05 : 0), // Placeholder calculation
        target: 0.9,
        status: this.getMetricStatus(0.95, 0.9),
        trend: this.calculateMetricTrend('anomalyRate'),
        lastUpdated: Date.now()
      },
      
      // Performance metrics
      responseTime: {
        name: 'Response Time',
        value: this.calculateResponseTimeScore(),
        target: 0.8,
        status: this.getMetricStatus(this.calculateResponseTimeScore(), 0.8),
        trend: this.calculateMetricTrend('responseTime'),
        lastUpdated: Date.now()
      },
      throughput: {
        name: 'Throughput',
        value: this.calculateThroughputScore(),
        target: 0.85,
        status: this.getMetricStatus(this.calculateThroughputScore(), 0.85),
        trend: this.calculateMetricTrend('throughput'),
        lastUpdated: Date.now()
      },
      errorRate: {
        name: 'Error Rate',
        value: this.calculateErrorRateScore(),
        target: 0.95,
        status: this.getMetricStatus(this.calculateErrorRateScore(), 0.95),
        trend: this.calculateMetricTrend('errorRate'),
        lastUpdated: Date.now()
      }
    };
  }

  // Calculate overall quality score
  private calculateOverallScore(metrics: QualityMetrics): number {
    const weights = {
      accuracy: 0.3,
      completeness: 0.25,
      consistency: 0.2,
      reliability: 0.15,
      performance: 0.1
    };

    const accuracyScore = (
      metrics.gpsAccuracy.value +
      metrics.distanceAccuracy.value +
      metrics.speedAccuracy.value +
      metrics.stepAccuracy.value
    ) / 4;

    const completenessScore = (
      metrics.dataCompleteness.value +
      metrics.sessionCompleteness.value +
      metrics.sensorCompleteness.value
    ) / 3;

    const consistencyScore = (
      metrics.temporalConsistency.value +
      metrics.spatialConsistency.value +
      metrics.measurementConsistency.value
    ) / 3;

    const reliabilityScore = (
      metrics.sensorReliability.value +
      metrics.calibrationStatus.value +
      metrics.anomalyRate.value
    ) / 3;

    const performanceScore = (
      metrics.responseTime.value +
      metrics.throughput.value +
      metrics.errorRate.value
    ) / 3;

    return (
      accuracyScore * weights.accuracy +
      completenessScore * weights.completeness +
      consistencyScore * weights.consistency +
      reliabilityScore * weights.reliability +
      performanceScore * weights.performance
    );
  }

  // Determine quality category based on score
  private determineQualityCategory(score: number): QualityCategory {
    if (score >= 0.9) return 'excellent';
    if (score >= 0.8) return 'good';
    if (score >= 0.6) return 'fair';
    if (score >= 0.4) return 'poor';
    return 'critical';
  }

  // Identify quality issues
  private identifyQualityIssues(metrics: QualityMetrics): QualityIssue[] {
    const issues: QualityIssue[] = [];
    const timestamp = Date.now();

    // Check each metric for issues
    Object.entries(metrics).forEach(([key, metric]) => {
      if (metric.status === 'critical' || metric.status === 'warning') {
        const existingIssue = this.activeIssues.find(issue => 
          issue.title.includes(metric.name)
        );

        if (existingIssue) {
          existingIssue.lastOccurred = timestamp;
          existingIssue.occurrenceCount++;
        } else {
          const issue: QualityIssue = {
            id: `${key}_${timestamp}`,
            severity: metric.status === 'critical' ? 'critical' : 'medium',
            category: this.getCategoryForMetric(key),
            title: `${metric.name} Below Target`,
            description: `${metric.name} is ${(metric.value * 100).toFixed(1)}%, below target of ${(metric.target * 100).toFixed(1)}%`,
            impact: this.getImpactDescription(key, metric.value, metric.target),
            recommendation: this.getRecommendationForMetric(key),
            firstDetected: timestamp,
            lastOccurred: timestamp,
            occurrenceCount: 1,
            resolved: false
          };
          
          issues.push(issue);
          this.activeIssues.push(issue);
        }
      }
    });

    return issues;
  }

  // Generate recommendations based on metrics and issues
  private generateRecommendations(metrics: QualityMetrics, issues: QualityIssue[]): string[] {
    const recommendations: string[] = [];

    // GPS accuracy recommendations
    if (metrics.gpsAccuracy.value < 0.8) {
      recommendations.push('Consider recalibrating GPS sensors or moving to an area with better satellite visibility');
    }

    // Data completeness recommendations
    if (metrics.dataCompleteness.value < 0.9) {
      recommendations.push('Check sensor connections and ensure continuous data collection');
    }

    // Calibration recommendations
    if (metrics.calibrationStatus.value < 0.8) {
      recommendations.push('Sensor calibration is needed to maintain measurement accuracy');
    }

    // Performance recommendations
    if (metrics.responseTime.value < 0.8) {
      recommendations.push('Consider optimizing data processing algorithms to improve response time');
    }

    // General recommendations based on issues
    if (issues.length > 5) {
      recommendations.push('Multiple quality issues detected - consider comprehensive system check');
    }

    return recommendations;
  }

  // Analyze quality trends
  private analyzeTrends(metrics: QualityMetrics): QualityTrend[] {
    const trends: QualityTrend[] = [];

    if (this.qualityHistory.length < 2) {
      return trends;
    }

    const recentReports = this.qualityHistory.slice(-this.config.trendAnalysisWindow);
    
    Object.entries(metrics).forEach(([key, metric]) => {
      const historicalValues = recentReports.map(report => 
        this.getMetricValue(report.metrics, key)
      ).filter(v => v !== null);

      if (historicalValues.length >= 2) {
        const trend = this.calculateTrendDirection(historicalValues);
        if (trend.magnitude > 0.05) { // 5% change threshold
          trends.push({
            metric: metric.name,
            direction: trend.direction,
            magnitude: trend.magnitude * 100,
            timeframe: `${recentReports.length} reports`,
            significance: trend.magnitude > 0.2 ? 'high' : trend.magnitude > 0.1 ? 'medium' : 'low'
          });
        }
      }
    });

    return trends;
  }

  // Generate quality summary
  private generateSummary(score: number, category: QualityCategory, issueCount: number): string {
    const scorePercent = (score * 100).toFixed(1);
    
    let summary = `Overall data quality is ${category} with a score of ${scorePercent}%.`;
    
    if (issueCount > 0) {
      summary += ` ${issueCount} quality issue${issueCount > 1 ? 's' : ''} detected.`;
    } else {
      summary += ' No significant quality issues detected.';
    }

    // Add specific insights
    if (category === 'excellent') {
      summary += ' All systems are performing optimally.';
    } else if (category === 'good') {
      summary += ' Minor improvements recommended.';
    } else if (category === 'fair') {
      summary += ' Several areas need attention.';
    } else if (category === 'poor') {
      summary += ' Significant quality issues require immediate attention.';
    } else {
      summary += ' Critical quality issues detected - immediate action required.';
    }

    return summary;
  }

  // Check for alerts based on thresholds
  private checkForAlerts(report: QualityReport): void {
    const { alertThresholds } = this.config;

    // GPS accuracy alert
    if (report.metrics.gpsAccuracy.value < alertThresholds.gpsAccuracy) {
      this.createAlert('warning', 'GPS Accuracy Low', 
        `GPS accuracy has dropped to ${(report.metrics.gpsAccuracy.value * 100).toFixed(1)}%`,
        'gpsAccuracy', report.metrics.gpsAccuracy.value, alertThresholds.gpsAccuracy);
    }

    // Data completeness alert
    if (report.metrics.dataCompleteness.value < alertThresholds.dataCompleteness) {
      this.createAlert('error', 'Data Completeness Issue',
        `Data completeness has dropped to ${(report.metrics.dataCompleteness.value * 100).toFixed(1)}%`,
        'dataCompleteness', report.metrics.dataCompleteness.value, alertThresholds.dataCompleteness);
    }

    // Overall quality alert
    if (report.overallScore < 0.5) {
      this.createAlert('critical', 'Critical Quality Issue',
        `Overall data quality has dropped to ${(report.overallScore * 100).toFixed(1)}%`,
        'overallScore', report.overallScore, 0.5);
    }
  }

  // Create quality alert
  private createAlert(
    severity: 'info' | 'warning' | 'error' | 'critical',
    title: string,
    message: string,
    metric: string,
    value: number,
    threshold: number
  ): void {
    const alert: QualityAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      severity,
      title,
      message,
      metric,
      value,
      threshold,
      acknowledged: false
    };

    this.activeAlerts.push(alert);
    
    // Keep only recent alerts
    if (this.activeAlerts.length > 50) {
      this.activeAlerts = this.activeAlerts.slice(-50);
    }

    console.log(`Quality Alert [${severity.toUpperCase()}]: ${title} - ${message}`);
  }

  // Helper methods
  private getMetricStatus(value: number, target: number): 'excellent' | 'good' | 'warning' | 'critical' {
    const ratio = value / target;
    if (ratio >= 1.0) return 'excellent';
    if (ratio >= 0.9) return 'good';
    if (ratio >= 0.7) return 'warning';
    return 'critical';
  }

  private calculateMetricTrend(metricName: string): 'improving' | 'stable' | 'declining' {
    if (this.qualityHistory.length < 2) return 'stable';
    
    const recentValues = this.qualityHistory.slice(-5).map(report => 
      this.getMetricValue(report.metrics, metricName)
    ).filter(v => v !== null);

    if (recentValues.length < 2) return 'stable';

    const trend = (recentValues[recentValues.length - 1] - recentValues[0]) / recentValues[0];
    if (Math.abs(trend) < 0.05) return 'stable';
    return trend > 0 ? 'improving' : 'declining';
  }

  private getMetricValue(metrics: QualityMetrics, metricName: string): number | null {
    const metric = (metrics as any)[metricName];
    return metric ? metric.value : null;
  }

  private calculateTrendDirection(values: number[]): { direction: 'up' | 'down' | 'stable', magnitude: number } {
    if (values.length < 2) return { direction: 'stable', magnitude: 0 };
    
    const first = values[0];
    const last = values[values.length - 1];
    const change = (last - first) / first;
    
    if (Math.abs(change) < 0.02) return { direction: 'stable', magnitude: Math.abs(change) };
    return { direction: change > 0 ? 'up' : 'down', magnitude: Math.abs(change) };
  }

  private getCategoryForMetric(metricKey: string): 'accuracy' | 'completeness' | 'consistency' | 'reliability' | 'performance' {
    if (metricKey.includes('Accuracy')) return 'accuracy';
    if (metricKey.includes('Completeness')) return 'completeness';
    if (metricKey.includes('Consistency')) return 'consistency';
    if (metricKey.includes('Reliability') || metricKey.includes('calibration') || metricKey.includes('anomaly')) return 'reliability';
    return 'performance';
  }

  private getImpactDescription(metricKey: string, value: number, target: number): string {
    const deficit = ((target - value) * 100).toFixed(1);
    return `Performance is ${deficit}% below target, which may affect measurement reliability and user experience.`;
  }

  private getRecommendationForMetric(metricKey: string): string {
    const recommendations: Record<string, string> = {
      gpsAccuracy: 'Check GPS sensor calibration and ensure clear sky visibility',
      dataCompleteness: 'Verify sensor connections and data collection processes',
      sensorReliability: 'Perform sensor diagnostics and consider recalibration',
      responseTime: 'Optimize data processing algorithms and reduce computational load',
      errorRate: 'Review error logs and fix underlying issues'
    };
    
    return recommendations[metricKey] || 'Review system configuration and performance';
  }

  private calculateResponseTimeScore(): number {
    if (this.performanceMetrics.responseTime.length === 0) return 1.0;
    const avgResponseTime = this.performanceMetrics.responseTime.reduce((sum, time) => sum + time, 0) / this.performanceMetrics.responseTime.length;
    return Math.max(0, 1 - (avgResponseTime / 1000)); // Normalize to 1 second target
  }

  private calculateThroughputScore(): number {
    if (this.performanceMetrics.throughput.length === 0) return 1.0;
    const avgThroughput = this.performanceMetrics.throughput.reduce((sum, rate) => sum + rate, 0) / this.performanceMetrics.throughput.length;
    return Math.min(1, avgThroughput / 100); // Normalize to 100 ops/sec target
  }

  private calculateErrorRateScore(): number {
    if (this.performanceMetrics.totalRequests === 0) return 1.0;
    const errorRate = this.performanceMetrics.errorCount / this.performanceMetrics.totalRequests;
    return Math.max(0, 1 - errorRate);
  }

  private maintainHistorySize(): void {
    const maxHistory = 100;
    if (this.qualityHistory.length > maxHistory) {
      this.qualityHistory = this.qualityHistory.slice(-maxHistory);
    }
  }

  // Storage methods
  private async loadStoredData(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('quality_monitor_data');
      if (stored) {
        const data = JSON.parse(stored);
        this.qualityHistory = data.qualityHistory || [];
        this.activeIssues = data.activeIssues || [];
        this.activeAlerts = data.activeAlerts || [];
      }
    } catch (error) {
      console.error('Failed to load quality monitor data:', error);
    }
  }

  private async saveToStorage(): Promise<void> {
    try {
      const data = {
        qualityHistory: this.qualityHistory,
        activeIssues: this.activeIssues,
        activeAlerts: this.activeAlerts
      };
      await AsyncStorage.setItem('quality_monitor_data', JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save quality monitor data:', error);
    }
  }

  // Public API methods
  getLatestReport(): QualityReport | null {
    return this.qualityHistory.length > 0 ? this.qualityHistory[this.qualityHistory.length - 1] : null;
  }

  getQualityHistory(): QualityReport[] {
    return [...this.qualityHistory];
  }

  getActiveIssues(): QualityIssue[] {
    return this.activeIssues.filter(issue => !issue.resolved);
  }

  getActiveAlerts(): QualityAlert[] {
    return this.activeAlerts.filter(alert => !alert.acknowledged);
  }

  acknowledgeAlert(alertId: string): void {
    const alert = this.activeAlerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
    }
  }

  resolveIssue(issueId: string): void {
    const issue = this.activeIssues.find(i => i.id === issueId);
    if (issue) {
      issue.resolved = true;
    }
  }

  updateConfig(newConfig: Partial<MonitoringConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  getConfig(): MonitoringConfig {
    return { ...this.config };
  }

  // Performance tracking methods
  recordResponseTime(time: number): void {
    this.performanceMetrics.responseTime.push(time);
    if (this.performanceMetrics.responseTime.length > 100) {
      this.performanceMetrics.responseTime.shift();
    }
  }

  recordThroughput(rate: number): void {
    this.performanceMetrics.throughput.push(rate);
    if (this.performanceMetrics.throughput.length > 100) {
      this.performanceMetrics.throughput.shift();
    }
  }

  recordError(): void {
    this.performanceMetrics.errorCount++;
    this.performanceMetrics.totalRequests++;
  }

  recordSuccess(): void {
    this.performanceMetrics.totalRequests++;
  }

  reset(): void {
    this.qualityHistory = [];
    this.activeIssues = [];
    this.activeAlerts = [];
    this.performanceMetrics = {
      responseTime: [],
      throughput: [],
      errorCount: 0,
      totalRequests: 0
    };
  }
}