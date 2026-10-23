import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Colors, Radius, Typography } from '../../theme/tokens';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface AvatarProps {
  name: string;
  url?: string | null;
  size?: AvatarSize;
}

const PALETTE = [
  '#7C3AED', // Purple
  '#4F46E5', // Indigo
  '#2563EB', // Blue
  '#059669', // Emerald
  '#D97706', // Amber
  '#DC2626', // Red
  '#DB2777', // Pink
  '#0891B2', // Cyan
];

function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getColorForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % PALETTE.length;
  return PALETTE[index];
}

export const Avatar: React.FC<AvatarProps> = ({ name, url, size = 'md' }) => {
  const getDimensions = (): { dim: number; fontSize: number } => {
    switch (size) {
      case 'xs':
        return { dim: 24, fontSize: 10 };
      case 'sm':
        return { dim: 32, fontSize: 12 };
      case 'lg':
        return { dim: 52, fontSize: 20 };
      case 'xl':
        return { dim: 72, fontSize: 26 };
      case 'md':
      default:
        return { dim: 40, fontSize: 15 };
    }
  };

  const { dim, fontSize } = getDimensions();
  const initials = getInitials(name);
  const bgColor = getColorForName(name);

  if (url) {
    return (
      <Image
        source={{ uri: url }}
        style={[
          styles.image,
          { width: dim, height: dim, borderRadius: dim / 2 },
        ]}
      />
    );
  }

  return (
    <View
      style={[
        styles.fallbackContainer,
        {
          width: dim,
          height: dim,
          borderRadius: dim / 2,
          backgroundColor: bgColor,
        },
      ]}
    >
      <Text style={[styles.initialsText, { fontSize }]}>{initials}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  fallbackContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsText: {
    ...Typography.bodyBold,
    color: '#FFFFFF',
  },
  image: {
    resizeMode: 'cover',
  },
});
