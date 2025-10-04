import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { useWalking } from '../contexts/WalkingContext';
import { MotivationTrendData } from '../lib/motivation-service';

interface MotivationTrendChartProps {
  height?: number;
}

const { width: screenWidth } = Dimensions.get('window');

export const MotivationTrendChart: React.FC<MotivationTrendChartProps> = ({ 
  height = 200 
}) => {
  const { motivationTrendData, motivationTrend } = useWalking();

  // Use ML trend data if available, otherwise fall back to existing trend
  const trendData: Array<{ day: string; value: number }> = motivationTrendData || motivationTrend;

  if (!trendData || trendData.length === 0) {
    return (
      <View style={[styles.container, { height }]}>
        <Text style={styles.title}>Motivation Trend</Text>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No trend data available</Text>
          <Text style={styles.emptySubtext}>Complete more walks to see your motivation trend</Text>
        </View>
      </View>
    );
  }

  const chartWidth = screenWidth - 64; // Account for margins and padding
  const chartHeight = height - 80; // Account for title and padding
  const maxValue = Math.max(...trendData.map((d: { day: string; value: number }) => d.value || 0));
  const minValue = Math.min(...trendData.map((d: { day: string; value: number }) => d.value || 0));
  const valueRange = maxValue - minValue || 1;

  // Generate SVG path for the trend line
  const generatePath = (): string => {
    if (trendData.length < 2) return '';

    const points = trendData.map((point: { day: string; value: number }, index: number) => {
      const x = (index / (trendData.length - 1)) * chartWidth;
      const y = chartHeight - ((point.value - minValue) / valueRange) * chartHeight;
      return `${x},${y}`;
    });

    return `M ${points.join(' L ')}`;
  };

  const getColorForValue = (value: number): string => {
    if (value >= 70) return '#4CAF50'; // Green
    if (value >= 40) return '#FF9800'; // Orange
    return '#F44336'; // Red
  };

  const averageValue = trendData.reduce((sum: number, point: { day: string; value: number }) => sum + point.value, 0) / trendData.length;
  const latestValue = trendData[trendData.length - 1]?.value || 0;
  const trend = latestValue > averageValue ? 'up' : latestValue < averageValue ? 'down' : 'stable';

  return (
    <View style={[styles.container, { height }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Motivation Trend</Text>
        <View style={styles.trendIndicator}>
          <Text style={styles.trendValue}>{Math.round(latestValue)}%</Text>
          <Text style={[styles.trendDirection, { color: getColorForValue(latestValue) }]}>
            {trend === 'up' ? '↗' : trend === 'down' ? '↘' : '→'}
          </Text>
        </View>
      </View>

      <View style={styles.chartContainer}>
        <View style={styles.yAxisLabels}>
          {[100, 75, 50, 25, 0].map((value: number) => (
            <Text key={value} style={styles.axisLabel}>{value}</Text>
          ))}
        </View>

        <View style={styles.chartArea}>
          {/* Grid lines */}
          <View style={styles.gridLines}>
            {[0, 25, 50, 75, 100].map((value: number) => (
              <View
                key={value}
                style={[
                  styles.gridLine,
                  { bottom: `${value}%` }
                ]}
              />
            ))}
          </View>

          {/* Data points */}
          {trendData.map((point: { day: string; value: number }, index: number) => {
            const x = (index / (trendData.length - 1)) * chartWidth;
            const y = chartHeight - ((point.value - minValue) / valueRange) * chartHeight;
            
            return (
              <View
                key={`${point.day}-${index}`}
                style={[
                  styles.dataPoint,
                  {
                    left: x - 4,
                    bottom: y - 4,
                    backgroundColor: getColorForValue(point.value),
                  }
                ]}
              />
            );
          })}

          {/* Trend lines */}
          {trendData.length > 1 && trendData.map((point: { day: string; value: number }, index: number) => {
            if (index === trendData.length - 1) return null;
            
            const nextPoint = trendData[index + 1];
            const x1 = (index / (trendData.length - 1)) * chartWidth;
            const y1 = chartHeight - ((point.value - minValue) / valueRange) * chartHeight;
            const x2 = ((index + 1) / (trendData.length - 1)) * chartWidth;
            const y2 = chartHeight - ((nextPoint.value - minValue) / valueRange) * chartHeight;
            
            const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
            const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);
            
            return (
              <View
                key={`line-${index}`}
                style={[
                  styles.trendLine,
                  {
                    left: x1,
                    bottom: y1 - 1,
                    width: length,
                    backgroundColor: getColorForValue((point.value + nextPoint.value) / 2),
                    transform: [{ rotate: `${angle}deg` }],
                  }
                ]}
              />
            );
          })}
        </View>
      </View>

      {/* X-axis labels */}
      <View style={styles.xAxisLabels}>
        {trendData.map((point: { day: string; value: number }, index: number) => {
          const x = (index / (trendData.length - 1)) * chartWidth;
          return (
            <Text
              key={`label-${point.day}-${index}`}
              style={[
                styles.xAxisLabel,
                { left: x - 20 }
              ]}
            >
              {point.day}
            </Text>
          );
        })}
      </View>

      {/* Summary statistics */}
      <View style={styles.summaryStats}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Average</Text>
          <Text style={styles.statValue}>{Math.round(averageValue)}%</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Highest</Text>
          <Text style={styles.statValue}>{Math.round(maxValue)}%</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Lowest</Text>
          <Text style={styles.statValue}>{Math.round(minValue)}%</Text>
        </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  trendIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginRight: 4,
  },
  trendDirection: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  chartContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  yAxisLabels: {
    width: 40,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingRight: 8,
  },
  axisLabel: {
    color: '#999',
    fontSize: 12,
  },
  chartArea: {
    flex: 1,
    position: 'relative',
  },
  gridLines: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#333',
  },
  dataPoint: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#1a1a1a',
  },
  trendLine: {
    position: 'absolute',
    height: 2,
    transformOrigin: 'left center',
  },
  xAxisLabels: {
    position: 'relative',
    height: 20,
    marginLeft: 48, // Account for y-axis labels
  },
  xAxisLabel: {
    position: 'absolute',
    color: '#999',
    fontSize: 12,
    width: 40,
    textAlign: 'center',
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
  statLabel: {
    color: '#999',
    fontSize: 12,
    marginBottom: 4,
  },
  statValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});