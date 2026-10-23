import React from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { Radius, Spacing, Typography } from '../../theme/tokens';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  currencyPrefix?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  hint,
  currencyPrefix,
  leftIcon,
  rightIcon,
  containerStyle,
  inputStyle,
  placeholderTextColor,
  ...props
}) => {
  const { colors, isDark } = useTheme();

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>}
      <View
        style={[
          styles.inputWrapper,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
          error
            ? [
                styles.inputWrapperError,
                {
                  borderColor: colors.negative,
                  backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2',
                },
              ]
            : null,
          props.editable === false
            ? [
                styles.inputWrapperDisabled,
                {
                  backgroundColor: colors.surfaceAlt,
                  borderColor: colors.borderLight,
                },
              ]
            : null,
        ]}
      >
        {currencyPrefix && (
          <Text style={[styles.currencyPrefix, { color: colors.primary }]}>{currencyPrefix}</Text>
        )}
        {leftIcon && <View style={styles.iconContainer}>{leftIcon}</View>}
        <TextInput
          placeholderTextColor={placeholderTextColor || colors.placeholder}
          style={[styles.input, { color: colors.text }, inputStyle]}
          {...props}
        />
        {rightIcon && <View style={styles.iconContainer}>{rightIcon}</View>}
      </View>
      {error ? (
        <Text style={[styles.errorText, { color: colors.negative }]}>{error}</Text>
      ) : hint ? (
        <Text style={[styles.hintText, { color: colors.textTertiary }]}>{hint}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  label: {
    ...Typography.caption,
    marginBottom: Spacing.xs,
    fontWeight: '600',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    minHeight: 48,
  },
  inputWrapperError: {},
  inputWrapperDisabled: {},
  currencyPrefix: {
    ...Typography.bodyBold,
    fontSize: 18,
    marginRight: Spacing.xs,
  },
  iconContainer: {
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    ...Typography.body,
    paddingVertical: 10,
  },
  errorText: {
    ...Typography.caption,
    marginTop: Spacing.xs,
  },
  hintText: {
    ...Typography.caption,
    marginTop: Spacing.xs,
  },
});
