import React from 'react';
import { StyleProp, StyleSheet, TouchableOpacity, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Radius, Shadows, Spacing } from '../../theme/tokens';

export type CardVariant = 'elevated' | 'flat' | 'outline' | 'gradient';

interface CardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  gradientColors?: readonly [string, string, ...string[]];
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  padding?: keyof typeof Spacing;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'elevated',
  gradientColors = Colors.primaryGradient,
  onPress,
  style,
  padding = 'md',
}) => {
  const paddingValue = Spacing[padding];

  if (variant === 'gradient') {
    const Container = onPress ? TouchableOpacity : View;
    return (
      <Container
        activeOpacity={0.88}
        onPress={onPress}
        style={[styles.gradientWrapper, Shadows.md, style]}
      >
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.gradientInner, { padding: paddingValue }]}
        >
          {children}
        </LinearGradient>
      </Container>
    );
  }

  const getStyle = (): ViewStyle => {
    switch (variant) {
      case 'flat':
        return {
          backgroundColor: Colors.surfaceAlt,
          borderRadius: Radius.lg,
          padding: paddingValue,
        };
      case 'outline':
        return {
          backgroundColor: Colors.surface,
          borderRadius: Radius.lg,
          borderWidth: 1.5,
          borderColor: Colors.border,
          padding: paddingValue,
        };
      case 'elevated':
      default:
        return {
          backgroundColor: Colors.surface,
          borderRadius: Radius.lg,
          padding: paddingValue,
          ...Shadows.md,
        };
    }
  };

  if (onPress) {
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPress}
        style={[getStyle(), style]}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={[getStyle(), style]}>{children}</View>;
};

const styles = StyleSheet.create({
  gradientWrapper: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  gradientInner: {
    borderRadius: Radius.lg,
  },
});
