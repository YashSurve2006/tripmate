import React, { useCallback, useEffect, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { GroupCard, GroupCardData } from '../../src/components/common/GroupCard';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { Loading } from '../../src/components/ui/Loading';
import { api } from '../../src/services/api';
import { useTheme } from '../../src/theme/ThemeContext';
import { Radius, Spacing, Typography } from '../../src/theme/tokens';

const FILTER_TYPES = ['ALL', 'TRIP', 'ROOMMATES', 'OUTING', 'EVENT'] as const;

export default function GroupsScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const [selectedFilter, setSelectedFilter] = useState<string>('ALL');
  const [groups, setGroups] = useState<GroupCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadGroups = useCallback(async () => {
    try {
      const data = await api.getGroups();
      setGroups(data);
    } catch (err) {
      console.warn('Failed to fetch groups:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  const onRefresh = () => {
    setRefreshing(true);
    loadGroups();
  };

  const filteredGroups = groups.filter((g) => {
    if (selectedFilter === 'ALL') return true;
    return g.type === selectedFilter;
  });

  if (loading && !refreshing) {
    return <Loading fullScreen message="Loading groups..." />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.borderLight,
          },
        ]}
      >
        <View>
          <Text style={[styles.title, { color: colors.text }]}>Your Groups</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {groups.length} {groups.length === 1 ? 'group' : 'groups'} active
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.push('/groups/new')}
          style={[styles.createButton, { backgroundColor: colors.primary }]}
        >
          <Feather name="plus" size={18} color="#FFFFFF" />
          <Text style={styles.createButtonText}>New Group</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View
        style={[
          styles.filtersContainer,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.borderLight,
          },
        ]}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersScroll}
        >
          {FILTER_TYPES.map((filter) => {
            const isSelected = selectedFilter === filter;
            return (
              <TouchableOpacity
                key={filter}
                activeOpacity={0.7}
                onPress={() => setSelectedFilter(filter)}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: isSelected
                      ? colors.primary
                      : isDark
                      ? colors.surfaceElevated
                      : colors.surfaceAlt,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    {
                      color: isSelected ? '#FFFFFF' : colors.textSecondary,
                      fontWeight: isSelected ? '700' : '600',
                    },
                  ]}
                >
                  {filter === 'ALL'
                    ? 'All Groups'
                    : filter.charAt(0) + filter.slice(1).toLowerCase()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Group List */}
      <ScrollView
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {filteredGroups.length === 0 ? (
          <EmptyState
            icon="folder-open-outline"
            title="No Groups In This Category"
            description="Start by creating a new group for your friends or roommates."
            actionTitle="Create Group"
            onAction={() => router.push('/groups/new')}
          />
        ) : (
          filteredGroups.map((g) => (
            <GroupCard
              key={g.id}
              group={g}
              onPress={() => router.push(`/groups/${g.id}`)}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: 54,
    paddingBottom: Spacing.md,
  },
  title: {
    ...Typography.h1,
  },
  subtitle: {
    ...Typography.caption,
    marginTop: 2,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: Radius.md,
    gap: 4,
  },
  createButtonText: {
    ...Typography.bodyBold,
    color: '#FFFFFF',
    fontSize: 13,
  },
  filtersContainer: {
    borderBottomWidth: 1,
    paddingBottom: Spacing.sm,
  },
  filtersScroll: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.xs + 2,
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: Radius.full,
  },
  filterChipText: {
    ...Typography.caption,
  },
  listContent: {
    padding: Spacing.lg,
    paddingBottom: 100,
  },
});
