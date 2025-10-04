import AsyncStorage from '@react-native-async-storage/async-storage';
import { Accelerometer, Gyroscope, Magnetometer } from 'expo-sensors';
import * as Location from 'expo-location';

// Calibration data interfaces
export interface CalibrationData {
  accelerometer: {
    bias: { x: number; y: number; z: number };
    scale: { x: number; y: number; z: number };
    noise: number;
  };
  gyroscope: {
    bias: { x: number; y: number; z: number };
    scale: { x: number; y: number; z: number };
    noise: number;
  };
  magnetometer: {
    bias: { x: number; y: number; z: number };
    scale: { x: number; y: number; z: number };
    declination: number;
  };
  stepCounter: {
    sensitivity: number;
    threshold: number;
    accuracy: number;
  };
  gps: {
    accuracyFactor: number;
    altitudeBias: number;
    speedBias: number;
  };
  lastCalibration: number;
  calibrationQuality: number;
}

export interface CalibrationStatus {
  isCalibrated: boolean;
  quality: number; // 0-1
  lastCalibration: Date;
  needsRecalibration: boolean;
  recommendations: string[];
}

// Calibration constants
const CALIBRATION_STORAGE_KEY = 'sensor_calibration_data';
const CALIBRATION_VALIDITY_PERIOD = 7 * 24 * 60 * 60 * 1000; // 7 days
const MIN_CALIBRATION_SAMPLES = 100;
const CALIBRATION_TIMEOUT = 30000; // 30 seconds

export class SensorCalibrationSystem {
  private calibrationData: CalibrationData | null = null;
  private isCalibrating = false;
  private calibrationSamples: {
    accelerometer: Array<{ x: number; y: number; z: number; timestamp: number }>;
    gyroscope: Array<{ x: number; y: number; z: number; timestamp: number }>;
    magnetometer: Array<{ x: number; y: number; z: number; timestamp: number }>;
  } = {
    accelerometer: [],
    gyroscope: [],
    magnetometer: []
  };

  constructor() {
    this.loadCalibrationData();
  }

  // Load calibration data from storage
  private async loadCalibrationData(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(CALIBRATION_STORAGE_KEY);
      if (stored) {
        this.calibrationData = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load calibration data:', error);
    }
  }

  // Save calibration data to storage
  private async saveCalibrationData(): Promise<void> {
    try {
      if (this.calibrationData) {
        await AsyncStorage.setItem(CALIBRATION_STORAGE_KEY, JSON.stringify(this.calibrationData));
      }
    } catch (error) {
      console.error('Failed to save calibration data:', error);
    }
  }

  // Get current calibration status
  getCalibrationStatus(): CalibrationStatus {
    if (!this.calibrationData) {
      return {
        isCalibrated: false,
        quality: 0,
        lastCalibration: new Date(0),
        needsRecalibration: true,
        recommendations: ['Initial sensor calibration required']
      };
    }

    const age = Date.now() - this.calibrationData.lastCalibration;
    const needsRecalibration = age > CALIBRATION_VALIDITY_PERIOD;
    const quality = Math.max(0, this.calibrationData.calibrationQuality - (age / CALIBRATION_VALIDITY_PERIOD) * 0.3);

    const recommendations: string[] = [];
    if (needsRecalibration) {
      recommendations.push('Calibration expired, recalibration recommended');
    }
    if (quality < 0.7) {
      recommendations.push('Low calibration quality, consider recalibrating');
    }
    if (this.calibrationData.accelerometer.noise > 0.1) {
      recommendations.push('High accelerometer noise detected');
    }
    if (this.calibrationData.gyroscope.noise > 0.05) {
      recommendations.push('High gyroscope noise detected');
    }

    return {
      isCalibrated: !needsRecalibration && quality > 0.5,
      quality,
      lastCalibration: new Date(this.calibrationData.lastCalibration),
      needsRecalibration,
      recommendations
    };
  }

  // Start calibration process
  async startCalibration(
    onProgress?: (progress: number, message: string) => void,
    onComplete?: (success: boolean, data?: CalibrationData) => void
  ): Promise<boolean> {
    if (this.isCalibrating) {
      return false;
    }

    this.isCalibrating = true;
    this.calibrationSamples = { accelerometer: [], gyroscope: [], magnetometer: [] };

    try {
      onProgress?.(0, 'Starting sensor calibration...');

      // Check sensor availability
      const accelAvailable = await Accelerometer.isAvailableAsync();
      const gyroAvailable = await Gyroscope.isAvailableAsync();
      const magAvailable = await Magnetometer.isAvailableAsync();

      if (!accelAvailable || !gyroAvailable || !magAvailable) {
        throw new Error('Required sensors not available');
      }

      onProgress?.(10, 'Sensors detected, starting data collection...');

      // Set sensor update intervals
      Accelerometer.setUpdateInterval(50); // 20Hz
      Gyroscope.setUpdateInterval(50);
      Magnetometer.setUpdateInterval(100); // 10Hz

      // Start sensor listeners
      const accelSubscription = Accelerometer.addListener((data) => {
        this.calibrationSamples.accelerometer.push({
          ...data,
          timestamp: Date.now()
        });
      });

      const gyroSubscription = Gyroscope.addListener((data) => {
        this.calibrationSamples.gyroscope.push({
          ...data,
          timestamp: Date.now()
        });
      });

      const magSubscription = Magnetometer.addListener((data) => {
        this.calibrationSamples.magnetometer.push({
          ...data,
          timestamp: Date.now()
        });
      });

      // Collect calibration data
      const startTime = Date.now();
      const calibrationDuration = 20000; // 20 seconds

      while (Date.now() - startTime < calibrationDuration) {
        const progress = ((Date.now() - startTime) / calibrationDuration) * 80 + 10;
        const remaining = Math.ceil((calibrationDuration - (Date.now() - startTime)) / 1000);
        onProgress?.(progress, `Collecting sensor data... ${remaining}s remaining`);

        await new Promise(resolve => setTimeout(resolve, 1000));

        // Check if we have enough samples
        if (this.calibrationSamples.accelerometer.length < MIN_CALIBRATION_SAMPLES / 4) {
          onProgress?.(progress, 'Keep device steady for accurate calibration...');
        }
      }

      // Stop sensor listeners
      accelSubscription.remove();
      gyroSubscription.remove();
      magSubscription.remove();

      onProgress?.(90, 'Processing calibration data...');

      // Process calibration data
      const calibrationData = await this.processCalibrationData();

      if (calibrationData) {
        this.calibrationData = calibrationData;
        await this.saveCalibrationData();
        onProgress?.(100, 'Calibration completed successfully!');
        onComplete?.(true, calibrationData);
        return true;
      } else {
        throw new Error('Failed to process calibration data');
      }

    } catch (error) {
      console.error('Calibration failed:', error);
      onProgress?.(0, `Calibration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      onComplete?.(false);
      return false;
    } finally {
      this.isCalibrating = false;
    }
  }

  // Process collected calibration data
  private async processCalibrationData(): Promise<CalibrationData | null> {
    try {
      const { accelerometer, gyroscope, magnetometer } = this.calibrationSamples;

      if (accelerometer.length < MIN_CALIBRATION_SAMPLES ||
          gyroscope.length < MIN_CALIBRATION_SAMPLES ||
          magnetometer.length < MIN_CALIBRATION_SAMPLES) {
        throw new Error('Insufficient calibration samples');
      }

      // Calculate accelerometer calibration
      const accelBias = this.calculateBias(accelerometer);
      const accelScale = this.calculateScale(accelerometer);
      const accelNoise = this.calculateNoise(accelerometer);

      // Calculate gyroscope calibration
      const gyroBias = this.calculateBias(gyroscope);
      const gyroScale = this.calculateScale(gyroscope);
      const gyroNoise = this.calculateNoise(gyroscope);

      // Calculate magnetometer calibration
      const magBias = this.calculateBias(magnetometer);
      const magScale = this.calculateScale(magnetometer);
      const magDeclination = await this.calculateMagneticDeclination();

      // Calculate overall calibration quality
      const quality = this.calculateCalibrationQuality(accelNoise, gyroNoise);

      return {
        accelerometer: {
          bias: accelBias,
          scale: accelScale,
          noise: accelNoise
        },
        gyroscope: {
          bias: gyroBias,
          scale: gyroScale,
          noise: gyroNoise
        },
        magnetometer: {
          bias: magBias,
          scale: magScale,
          declination: magDeclination
        },
        stepCounter: {
          sensitivity: 1.0,
          threshold: 0.1,
          accuracy: 0.95
        },
        gps: {
          accuracyFactor: 1.0,
          altitudeBias: 0,
          speedBias: 0
        },
        lastCalibration: Date.now(),
        calibrationQuality: quality
      };

    } catch (error) {
      console.error('Error processing calibration data:', error);
      return null;
    }
  }

  // Calculate sensor bias (offset)
  private calculateBias(samples: Array<{ x: number; y: number; z: number }>): { x: number; y: number; z: number } {
    const sum = samples.reduce(
      (acc, sample) => ({
        x: acc.x + sample.x,
        y: acc.y + sample.y,
        z: acc.z + sample.z
      }),
      { x: 0, y: 0, z: 0 }
    );

    return {
      x: sum.x / samples.length,
      y: sum.y / samples.length,
      z: sum.z / samples.length
    };
  }

  // Calculate sensor scale factors
  private calculateScale(samples: Array<{ x: number; y: number; z: number }>): { x: number; y: number; z: number } {
    // For now, assume unity scale factors
    // In a more sophisticated implementation, this would involve
    // rotating the device through known orientations
    return { x: 1.0, y: 1.0, z: 1.0 };
  }

  // Calculate sensor noise level
  private calculateNoise(samples: Array<{ x: number; y: number; z: number }>): number {
    if (samples.length < 2) return 0;

    const bias = this.calculateBias(samples);
    
    const variance = samples.reduce((acc, sample) => {
      const dx = sample.x - bias.x;
      const dy = sample.y - bias.y;
      const dz = sample.z - bias.z;
      return acc + (dx * dx + dy * dy + dz * dz);
    }, 0) / samples.length;

    return Math.sqrt(variance);
  }

  // Calculate magnetic declination for compass calibration
  private async calculateMagneticDeclination(): Promise<number> {
    try {
      // Get current location for declination calculation
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced
      });

      // Simplified declination calculation
      // In a real implementation, you would use a magnetic model like WMM
      const lat = location.coords.latitude;
      const lon = location.coords.longitude;
      
      // Rough approximation for magnetic declination
      // This should be replaced with a proper magnetic model
      return Math.sin(lat * Math.PI / 180) * Math.cos(lon * Math.PI / 180) * 15;
      
    } catch (error) {
      console.error('Failed to calculate magnetic declination:', error);
      return 0; // Default to no declination
    }
  }

  // Calculate overall calibration quality
  private calculateCalibrationQuality(accelNoise: number, gyroNoise: number): number {
    // Quality based on noise levels and sample count
    const accelQuality = Math.max(0, 1 - accelNoise / 0.2);
    const gyroQuality = Math.max(0, 1 - gyroNoise / 0.1);
    const sampleQuality = Math.min(1, this.calibrationSamples.accelerometer.length / MIN_CALIBRATION_SAMPLES);
    
    return (accelQuality + gyroQuality + sampleQuality) / 3;
  }

  // Apply calibration to sensor readings
  applyCalibratedReading(
    sensorType: 'accelerometer' | 'gyroscope' | 'magnetometer',
    rawReading: { x: number; y: number; z: number }
  ): { x: number; y: number; z: number } {
    if (!this.calibrationData) {
      return rawReading;
    }

    const calibration = this.calibrationData[sensorType];
    
    return {
      x: (rawReading.x - calibration.bias.x) * calibration.scale.x,
      y: (rawReading.y - calibration.bias.y) * calibration.scale.y,
      z: (rawReading.z - calibration.bias.z) * calibration.scale.z
    };
  }

  // Apply GPS calibration
  applyCalibratedGPS(location: Location.LocationObject): Location.LocationObject {
    if (!this.calibrationData) {
      return location;
    }

    const gpsCalibration = this.calibrationData.gps;
    
    return {
      ...location,
      coords: {
        ...location.coords,
        accuracy: location.coords.accuracy !== null ? 
          location.coords.accuracy * gpsCalibration.accuracyFactor : null,
        altitude: location.coords.altitude ? 
          location.coords.altitude - gpsCalibration.altitudeBias : null,
        speed: location.coords.speed ? 
          location.coords.speed - gpsCalibration.speedBias : null
      }
    };
  }

  // Get calibration recommendations
  getCalibrationRecommendations(): string[] {
    const status = this.getCalibrationStatus();
    const recommendations: string[] = [...status.recommendations];

    if (this.calibrationData) {
      // Add specific recommendations based on calibration data
      if (this.calibrationData.accelerometer.noise > 0.15) {
        recommendations.push('Consider calibrating in a quieter environment');
      }
      
      if (this.calibrationData.calibrationQuality < 0.8) {
        recommendations.push('Calibration quality could be improved');
      }
      
      const age = Date.now() - this.calibrationData.lastCalibration;
      if (age > CALIBRATION_VALIDITY_PERIOD * 0.8) {
        recommendations.push('Calibration will expire soon');
      }
    }

    return recommendations;
  }

  // Reset calibration data
  async resetCalibration(): Promise<void> {
    this.calibrationData = null;
    try {
      await AsyncStorage.removeItem(CALIBRATION_STORAGE_KEY);
    } catch (error) {
      console.error('Failed to reset calibration data:', error);
    }
  }

  // Export calibration data for backup
  exportCalibrationData(): string | null {
    if (!this.calibrationData) {
      return null;
    }
    return JSON.stringify(this.calibrationData, null, 2);
  }

  // Import calibration data from backup
  async importCalibrationData(data: string): Promise<boolean> {
    try {
      const calibrationData = JSON.parse(data) as CalibrationData;
      
      // Validate the imported data structure
      if (this.validateCalibrationData(calibrationData)) {
        this.calibrationData = calibrationData;
        await this.saveCalibrationData();
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to import calibration data:', error);
      return false;
    }
  }

  // Validate calibration data structure
  private validateCalibrationData(data: any): data is CalibrationData {
    return (
      data &&
      typeof data === 'object' &&
      data.accelerometer &&
      data.gyroscope &&
      data.magnetometer &&
      data.stepCounter &&
      data.gps &&
      typeof data.lastCalibration === 'number' &&
      typeof data.calibrationQuality === 'number'
    );
  }
}