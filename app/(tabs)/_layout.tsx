import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { Fonts, Theme } from '@/constants/theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Theme.primaryDark,
        tabBarInactiveTintColor: Theme.textSecondary,
        tabBarStyle: {
          backgroundColor: Theme.surface,
          borderTopColor: Theme.border,
          height: 84,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontFamily: Fonts.bodyBold,
          fontSize: 11,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="listen"
        options={{
          title: 'Listen',
          tabBarIcon: ({ color, size }) => <Ionicons name="mic" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="call"
        options={{
          title: 'Call Kitty',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="paw" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="journal"
        options={{
          title: 'Journal',
          tabBarIcon: ({ color, size }) => <Ionicons name="book" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
