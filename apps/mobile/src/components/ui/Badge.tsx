import React from 'react';
import { StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import { Colors, Radius, Spacing, Typography } from '../../theme/tokens';

export type BadgeVariant = 'primary' | 'positive' | 'negative' | 'warning' | 'neutral' | 'info';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  icon?: React.ReactNode;
  size?: 'sm' | 'md';
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'primary',
  icon,
  size = 'md',
  style,
  textStyle,
}) => {
  const getColors = (): { bg: string; text: string } => {
    switch (variant) {
      case 'positive':
        return { bg: Colors.positiveMuted, text: Colors.positiveText };
      case 'negative':
        return { bg: Colors.negativeMuted, text: Colors.negativeText };
      case 'warning':
        return { bg: Colors.warningMuted, text: Colors.warningText };
      case 'info':
        return { bg: Colors.blueMuted, text: Colors.blue };
      case 'neutral':
        return { bg: Colors.surfaceAlt, text: Colors.textMuted };
      case 'primary':
      default:
        return { bg: Colors.primaryMuted, text: Colors.primaryDark };
    }
  };

  const { bg, text } = getColors();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: bg,
          paddingVertical: size === 'sm' ? 2 : 4,
          paddingHorizontal: size === 'sm' ? Spacing.xs + 2 : Spacing.sm + 2,
        },
        style,
      ]}
    >
      {icon && <View style={styles.icon}>{icon}</View>}
      <Text
        style={[
          styles.text,
          {
            color: text,
            fontSize: size === 'sm' ? 10 : 12,
          },
          textStyle,
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
  },
  icon: {
    marginRight: 4,
  },
  text: {
    ...Typography.tiny,
    fontWeight: '700',
  },
});
