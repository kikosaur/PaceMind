import React from 'react';
import { Stack } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { Colors } from '../styles/designSystem';

export default function OnboardingLayout() {
  return (
    <View style={styles.container}>
      <Stack
        screenOptions={{
          headerShown: false,
          gestureEnabled: false, // Prevent swipe back during onboarding
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen 
          name="index" 
          options={{ 
            title: 'Welcome',
          }} 
        />
        <Stack.Screen 
          name="profile-setup" 
          options={{ 
            title: 'Profile Setup',
          }} 
        />
        <Stack.Screen 
          name="tutorial" 
          options={{ 
            title: 'Getting Started',
          }} 
        />
        <Stack.Screen 
          name="complete" 
          options={{ 
            title: 'Welcome to AmiOkiks',
          }} 
        />
      </Stack>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
});