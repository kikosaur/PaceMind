import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  ToastAndroid,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useWalking, JournalEntry } from '@/contexts/WalkingContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

type MoodType = 'happy' | 'neutral' | 'sad';
type EnergyLevel = 1 | 2 | 3 | 4 | 5;

export default function JournalScreen() {
  const [selectedMood, setSelectedMood] = useState<MoodType | null>(null);
  const [energyLevel, setEnergyLevel] = useState<EnergyLevel | null>(null);
  const [motivation, setMotivation] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showPrediction, setShowPrediction] = useState(false);
  
  const { 
    addJournalEntry, 
    journalEntries, 
    predictMotivation, 
    motivationPrediction, 
    motivationPredictionLoading,
    motivationPredictionError 
  } = useWalking();
  const insets = useSafeAreaInsets();

  const moodOptions = [
    { type: 'happy' as MoodType, icon: Ionicons, iconName: 'happy-outline' as keyof typeof Ionicons.glyphMap, color: '#4CAF50', label: 'Happy' },
    { type: 'neutral' as MoodType, icon: Ionicons, iconName: 'remove-circle-outline' as keyof typeof Ionicons.glyphMap, color: '#FF9800', label: 'Neutral' },
    { type: 'sad' as MoodType, icon: Ionicons, iconName: 'sad-outline' as keyof typeof Ionicons.glyphMap, color: '#F44336', label: 'Sad' },
  ];

  const handleSubmit = async () => {
    if (!selectedMood || !energyLevel || motivation === null) {
      console.log('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      await addJournalEntry({
        mood: selectedMood,
        energyLevel,
        motivation,
        notes: notes.trim(),
        timestamp: Date.now(),
      });

      setSelectedMood(null);
      setEnergyLevel(null);
      setMotivation(null);
      setNotes('');

      if (Platform.OS === 'android') {
        ToastAndroid.show('Journal entry saved!', ToastAndroid.SHORT);
      } else {
        setToast({ type: 'success', message: 'Journal entry saved!' });
      }

      // Show motivation prediction after successful journal entry
      setShowPrediction(true);
      
      // Trigger motivation prediction (this will use the new journal entry)
      await predictMotivation(true);
      
    } catch {
      if (Platform.OS === 'android') {
        ToastAndroid.show('Failed to save entry', ToastAndroid.SHORT);
      } else {
        setToast({ type: 'error', message: 'Failed to save entry' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2000);
    return () => clearTimeout(t);
  }, [toast]);

  const renderMoodSelector = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>How are you feeling?</Text>
      <View style={styles.moodContainer}>
        {moodOptions.map((mood: typeof moodOptions[0]) => {
          const IconComponent = mood.icon;
          const isSelected = selectedMood === mood.type;
          
          return (
            <TouchableOpacity
              key={mood.type}
              style={[
                styles.moodButton,
                isSelected && { backgroundColor: mood.color, borderColor: mood.color }
              ]}
              onPress={() => setSelectedMood(mood.type)}
            >
              <IconComponent 
                name={mood.iconName}
                color={isSelected ? 'white' : mood.color} 
                size={32} 
              />
              <Text style={[
                styles.moodLabel,
                isSelected && { color: 'white' }
              ]}>
                {mood.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const renderEnergySelector = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Energy Level</Text>
      <View style={styles.energyContainer}>
        {[1, 2, 3, 4, 5].map((level: number) => (
          <TouchableOpacity
            key={level}
            style={[
              styles.energyButton,
              energyLevel === level && styles.energyButtonSelected
            ]}
            onPress={() => setEnergyLevel(level as EnergyLevel)}
          >
            <Ionicons
            name="battery-full" 
              color={energyLevel === level ? 'white' : '#4CAF50'} 
              size={24} 
            />
            <Text style={[
              styles.energyLabel,
              energyLevel === level && { color: 'white' }
            ]}>
              {level}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderMotivationSlider = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>
        Motivation to Walk: {motivation !== null ? `${motivation}%` : 'Not set'}
      </Text>
      <View style={styles.sliderContainer}>
        {[0, 25, 50, 75, 100].map((value: number) => (
          <TouchableOpacity
            key={value}
            style={[
              styles.sliderButton,
              motivation === value && styles.sliderButtonSelected
            ]}
            onPress={() => {
              if (typeof value === 'number') {
                setMotivation(value);
              }
            }}
          >
            <Text style={[
              styles.sliderLabel,
              motivation === value && { color: 'white' }
            ]}>
              {value}%
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderRecentEntries = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Recent Entries</Text>
      {journalEntries.slice(0, 3).map((entry: JournalEntry, index: number) => (
        <View key={`entry-${entry.timestamp}-${index}`} style={styles.entryCard}>
          <View style={styles.entryHeader}>
            <Ionicons name="calendar" color="#666" size={16} />
            <Text style={styles.entryDate}>
              {new Date(entry.timestamp).toDateString()}
            </Text>
          </View>
          <View style={styles.entryContent}>
            <Text style={styles.entryMood}>
              Mood: {entry.mood} • Energy: {entry.energyLevel}/5 • Motivation: {entry.motivation}%
            </Text>
            {entry.notes && (
              <Text style={styles.entryNotes}>{entry.notes}</Text>
            )}
          </View>
        </View>
      ))}
    </View>
  );

  const renderMotivationPrediction = () => {
    if (!showPrediction) return null;

    return (
      <View style={styles.section}>
        <View style={styles.predictionHeader}>
          <Ionicons name="bulb" color="#FF9800" size={20} />
          <Text style={styles.sectionTitle}>AI Motivation Insights</Text>
          <TouchableOpacity 
            onPress={() => setShowPrediction(false)}
            style={styles.closeButton}
          >
            <Ionicons name="close" color="#666" size={20} />
          </TouchableOpacity>
        </View>

        {motivationPredictionLoading && (
          <View style={styles.predictionCard}>
            <ActivityIndicator size="small" color="#4CAF50" />
            <Text style={styles.predictionLoadingText}>
              Analyzing your motivation patterns...
            </Text>
          </View>
        )}

        {motivationPredictionError && (
          <View style={[styles.predictionCard, styles.predictionErrorCard]}>
            <Ionicons name="warning" color="#F44336" size={20} />
            <Text style={styles.predictionErrorText}>
              Unable to generate insights right now. Please try again later.
            </Text>
          </View>
        )}

        {motivationPrediction && !motivationPredictionLoading && (
          <View style={styles.predictionCard}>
            <View style={styles.predictionContent}>
              <View style={styles.predictionRow}>
                <Text style={styles.predictionLabel}>Predicted State:</Text>
                <View style={[
                  styles.predictionBadge,
                  { backgroundColor: motivationPrediction.motivation_state === 'high' ? '#4CAF50' : '#FF9800' }
                ]}>
                  <Text style={styles.predictionBadgeText}>
                    {motivationPrediction.motivation_state?.toUpperCase() || 'UNKNOWN'}
                  </Text>
                </View>
              </View>

              <View style={styles.predictionRow}>
                <Text style={styles.predictionLabel}>Confidence:</Text>
                <Text style={styles.predictionValue}>
                  {motivationPrediction.confidence ? `${Math.round(motivationPrediction.confidence * 100)}%` : 'N/A'}
                </Text>
              </View>

              {motivationPrediction.recommendations && motivationPrediction.recommendations.length > 0 && (
                <View style={styles.recommendationsContainer}>
                  <Text style={styles.recommendationsTitle}>Recommendations:</Text>
                  {motivationPrediction.recommendations.slice(0, 2).map((rec: string, index: number) => (
                    <View key={index} style={styles.recommendationItem}>
                      <Ionicons name="checkmark-circle" color="#4CAF50" size={16} />
                      <Text style={styles.recommendationText}>{rec}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mood Journal</Text>
        <Text style={styles.headerSubtitle}>Track your daily motivation</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderMoodSelector()}
        {renderEnergySelector()}
        {renderMotivationSlider()}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes (Optional)</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="How are you feeling today? Any thoughts about walking?"
            placeholderTextColor="#999"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          <LinearGradient
            colors={['#4CAF50', '#45a049']}
            style={styles.submitButtonGradient}
          >
            <Ionicons name="add" color="white" size={20} />
            <Text style={styles.submitButtonText}>
              {isSubmitting ? 'Saving...' : 'Save Entry'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        {renderMotivationPrediction()}

        {journalEntries.length > 0 && renderRecentEntries()}
      </ScrollView>

      {/* Cross-platform lightweight toast for iOS/web */}
      {toast && Platform.OS !== 'android' && (
        <View
          style={[
            styles.toast,
            { backgroundColor: toast.type === 'success' ? '#2e7d32' : '#c62828' },
          ]}
        >
          <Text style={styles.toastText}>{toast.message}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#f8f9fa',
    paddingTop: 20,
    paddingBottom: 30,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E8F5E8',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  moodContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  moodButton: {
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E5E5E5',
    backgroundColor: 'white',
    minWidth: 80,
  },
  moodLabel: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  energyContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  energyButton: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E5E5',
    backgroundColor: 'white',
    flex: 1,
    marginHorizontal: 4,
  },
  energyButtonSelected: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  energyLabel: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },
  sliderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sliderButton: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E5E5',
    backgroundColor: 'white',
    flex: 1,
    marginHorizontal: 2,
  },
  sliderButtonSelected: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  sliderLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  notesInput: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    minHeight: 100,
  },
  submitButton: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonGradient: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  entryCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  entryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  entryDate: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  entryContent: {
    gap: 8,
  },
  entryMood: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  entryNotes: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  toast: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },
  toastText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  predictionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  closeButton: {
    padding: 4,
  },
  predictionCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  predictionErrorCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
  },
  predictionLoadingText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  predictionErrorText: {
    fontSize: 14,
    color: '#F44336',
    flex: 1,
  },
  predictionContent: {
    flex: 1,
  },
  predictionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  predictionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  predictionValue: {
    fontSize: 14,
    color: '#666',
  },
  predictionBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  predictionBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  recommendationsContainer: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  recommendationsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
    gap: 8,
  },
  recommendationText: {
    fontSize: 13,
    color: '#666',
    flex: 1,
    lineHeight: 18,
  },
});

// Removed Expo icon wrappers at file end (HappyIcon, NeutralIcon, SadIcon, BatteryIcon)