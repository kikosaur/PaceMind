import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useWalking } from '@/contexts/WalkingContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Smile, Meh, Frown, Battery, Calendar, Plus } from 'lucide-react-native';

type MoodType = 'happy' | 'neutral' | 'sad';
type EnergyLevel = 1 | 2 | 3 | 4 | 5;

export default function JournalScreen() {
  const [selectedMood, setSelectedMood] = useState<MoodType | null>(null);
  const [energyLevel, setEnergyLevel] = useState<EnergyLevel | null>(null);
  const [motivation, setMotivation] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { addJournalEntry, journalEntries } = useWalking();
  const insets = useSafeAreaInsets();

  const moodOptions = [
    { type: 'happy' as MoodType, icon: Smile, color: '#4CAF50', label: 'Happy' },
    { type: 'neutral' as MoodType, icon: Meh, color: '#FF9800', label: 'Neutral' },
    { type: 'sad' as MoodType, icon: Frown, color: '#F44336', label: 'Sad' },
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

      console.log('Journal entry saved!');
    } catch {
      console.log('Failed to save journal entry');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderMoodSelector = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>How are you feeling?</Text>
      <View style={styles.moodContainer}>
        {moodOptions.map((mood) => {
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
        {[1, 2, 3, 4, 5].map((level) => (
          <TouchableOpacity
            key={level}
            style={[
              styles.energyButton,
              energyLevel === level && styles.energyButtonSelected
            ]}
            onPress={() => setEnergyLevel(level as EnergyLevel)}
          >
            <Battery 
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
        {[0, 25, 50, 75, 100].map((value) => (
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
      {journalEntries.slice(0, 3).map((entry, index) => (
        <View key={`entry-${entry.timestamp}-${index}`} style={styles.entryCard}>
          <View style={styles.entryHeader}>
            <Calendar color="#666" size={16} />
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

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Mood Journal</Text>
        <Text style={styles.headerSubtitle}>Track your daily motivation</Text>
      </LinearGradient>

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
            <Plus color="white" size={20} />
            <Text style={styles.submitButtonText}>
              {isSubmitting ? 'Saving...' : 'Save Entry'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        {journalEntries.length > 0 && renderRecentEntries()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    paddingTop: 20,
    paddingBottom: 30,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
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
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
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
});

// Removed Expo icon wrappers at file end (HappyIcon, NeutralIcon, SadIcon, BatteryIcon)