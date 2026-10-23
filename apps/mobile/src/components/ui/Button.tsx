import React from 'react';
import {
  ActivityIndicator,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { Colors, Radius, Spacing, Typography } from '../../theme/tokens';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  style,
  textStyle,
  fullWidth = false,
}) => {
  const getContainerStyle = (): ViewStyle => {
    let paddingVertical = 12;
    let paddingHorizontal = Spacing.lg;
    let borderRadius = Radius.md;

    if (size === 'sm') {
      paddingVertical = 8;
      paddingHorizontal = Spacing.md;
    } else if (size === 'lg') {
      paddingVertical = 16;
      paddingHorizontal = Spacing.xl;
      borderRadius = Radius.lg;
    }

    let backgroundColor = Colors.primary;
    let borderWidth = 0;
    let borderColor = 'transparent';

    if (variant === 'secondary') {
      backgroundColor = Colors.primaryMuted;
    } else if (variant === 'outline') {
      backgroundColor = 'transparent';
      borderWidth = 1.5;
      borderColor = Colors.primary;
    } else if (variant === 'danger') {
      backgroundColor = Colors.negative;
    } else if (variant === 'ghost') {
      backgroundColor = 'transparent';
    }

    return {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius,
      paddingVertical,
      paddingHorizontal,
      backgroundColor,
      borderWidth,
      borderColor,
      opacity: disabled || loading ? 0.6 : 1,
      ...(fullWidth ? { width: '100%' } : {}),
    };
  };

  const getTextStyle = (): TextStyle => {
    let color = Colors.textInverse;
    if (variant === 'secondary') color = Colors.primaryDark;
    if (variant === 'outline' || variant === 'ghost') color = Colors.primary;

    return {
      ...Typography.bodyBold,
      color,
      fontSize: size === 'sm' ? 13 : size === 'lg' ? 16 : 14,
    };
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={disabled || loading}
      style={[getContainerStyle(), style]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'outline' || variant === 'ghost' ? Colors.primary : '#FFF'}
        />
      ) : (
        <View style={styles.contentRow}>
          {leftIcon && <View style={styles.leftIconContainer}>{leftIcon}</View>}
          <Text style={[getTextStyle(), textStyle]}>{title}</Text>
          {rightIcon && <View style={styles.rightIconContainer}>{rightIcon}</View>}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  leftIconContainer: {
    marginRight: Spacing.sm,
  },
  rightIconContainer: {
    marginLeft: Spacing.sm,
  },
});
