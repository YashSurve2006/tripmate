import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/theme/ThemeContext';
import { Radius, Shadows, Typography } from '../../src/theme/tokens';

export default function TabLayout() {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSubtle,
        tabBarStyle: [
          styles.tabBar,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.borderLight,
          },
        ],
        tabBarLabelStyle: styles.tabBarLabel,
      }}
    >
      {/* 1. Home */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'home' : 'home-outline'}
              size={22}
              color={color as string}
            />
          ),
        }}
      />

      {/* 2. Groups */}
      <Tabs.Screen
        name="groups"
        options={{
          title: 'Groups',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'people' : 'people-outline'}
              size={22}
              color={color as string}
            />
          ),
        }}
      />

      {/* 3. Add Expense - Center Prominent Action Button */}
      <Tabs.Screen
        name="add-expense-tab"
        options={{
          title: '',
          tabBarButton: () => (
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={() => router.push('/add-expense')}
              style={styles.centerButtonWrapper}
            >
              <View
                style={[
                  styles.centerButton,
                  {
                    backgroundColor: colors.primary,
                    borderColor: isDark ? colors.surface : '#FFFFFF',
                  },
                ]}
              >
                <Feather name="plus" size={26} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
          ),
        }}
      />

      {/* 4. Insights */}
      <Tabs.Screen
        name="insights"
        options={{
          title: 'Insights',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'pie-chart' : 'pie-chart-outline'}
              size={22}
              color={color as string}
            />
          ),
        }}
      />

      {/* 5. Profile */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'person' : 'person-outline'}
              size={22}
              color={color as string}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    borderTopWidth: 1,
    height: 64,
    paddingBottom: 8,
    paddingTop: 8,
    ...Shadows.md,
  },
  tabBarLabel: {
    ...Typography.tiny,
    fontWeight: '600',
  },
  centerButtonWrapper: {
    top: -14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.lg,
    borderWidth: 3,
  },
});
