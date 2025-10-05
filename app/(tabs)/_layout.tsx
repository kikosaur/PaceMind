import { Tabs } from "expo-router";
import React from "react";
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { StatusBar } from "expo-status-bar";

export default function TabLayout() {
  return (
    <>
      <StatusBar style="dark" backgroundColor="transparent" translucent />
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: '#4CAF50',
          tabBarInactiveTintColor: '#666',
          headerShown: false,
          tabBarStyle: {
            backgroundColor: 'white',
            borderTopWidth: 1,
            borderTopColor: '#E5E5E5',
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '500',
          },
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            title: "Home",
            tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="walk"
          options={{
            title: "Walk",
            tabBarIcon: ({ color, size }) => <FontAwesome5 name="walking" color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="journal"
          options={{
            title: "Journal",
            tabBarIcon: ({ color, size }) => <Ionicons name="calendar" color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="progress"
          options={{
            title: "Progress",
            tabBarIcon: ({ color, size }) => <Ionicons name="trending-up" color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: "Settings",
            tabBarIcon: ({ color, size }) => <Ionicons name="settings" color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="test-notifications"
          options={{
            title: "Test",
            tabBarIcon: ({ color, size }) => <Ionicons name="notifications" color={color} size={size} />,
          }}
        />
      </Tabs>
    </>
  );
}