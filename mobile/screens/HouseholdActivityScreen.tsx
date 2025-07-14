import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Platform,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { useHousehold } from '../contexts/HouseholdContext';
import { designTokens } from '../constants/DesignTokens';
import { supabase } from '../lib/supabase';

interface ActivityItem {
  id: string;
  name: string;
  status: string;
  created_at: string;
  updated_at: string;
  added_by: string;
  profiles?: {
    full_name?: string;
    username?: string;
  } | null;
}

interface HouseholdActivityScreenProps {
  navigation: any;
}

export default function HouseholdActivityScreen({ navigation }: HouseholdActivityScreenProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { theme } = useTheme();
  const { selectedHousehold } = useHousehold();

  useEffect(() => {
    fetchAllActivity();
  }, [selectedHousehold]);

  const fetchAllActivity = async () => {
    if (!selectedHousehold) {
      setLoading(false);
      return;
    }

    try {
      console.log('📱 Fetching all household activity for:', selectedHousehold.households.name);
      
      // Fetch all activity (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: activityData, error: activityError } = await supabase
        .from('items')
        .select(`
          id,
          name,
          status,
          created_at,
          updated_at,
          added_by
        `)
        .eq('household_id', selectedHousehold.household_id)
        .gte('updated_at', thirtyDaysAgo.toISOString())
        .order('updated_at', { ascending: false })
        .limit(100);

      if (activityError) {
        console.error('Error fetching activity:', activityError);
      } else {
        // Fetch user profiles for the activity items
        let enrichedActivityData = activityData || [];
        if (activityData && activityData.length > 0) {
          const userIds = [...new Set(activityData.map(item => item.added_by).filter(Boolean))];
          
          if (userIds.length > 0) {
            const { data: profilesData } = await supabase
              .from('profiles')
              .select('id, full_name, username')
              .in('id', userIds);

            // Enrich activity data with profile information
            enrichedActivityData = activityData.map(item => ({
              ...item,
              profiles: profilesData?.find(profile => profile.id === item.added_by) || null
            }));
          }
        }
        
        setActivities(enrichedActivityData as ActivityItem[]);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchAllActivity();
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) {
      return 'Just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 2592000) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} day${days !== 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getActionText = (status: string, createdAt: string, updatedAt: string) => {
    if (status === 'used') {
      return 'used';
    } else if (status === 'active' && createdAt === updatedAt) {
      return 'added';
    } else if (status === 'active') {
      return 'updated';
    } else if (status === 'expired') {
      return 'marked as expired';
    } else if (status === 'deleted') {
      return 'removed';
    }
    return 'modified';
  };

  const renderActivityItem = (activity: ActivityItem, index: number) => {
    const username = activity.profiles?.full_name || activity.profiles?.username || 'Someone';
    const actionText = getActionText(activity.status, activity.created_at, activity.updated_at);
    const timeAgo = getTimeAgo(activity.updated_at);
    
    return (
      <View key={`${activity.id}-${index}`} style={[styles.activityItem, { borderBottomColor: theme.borderPrimary }]}>
        <View style={[styles.activityIcon, { backgroundColor: theme.bgTertiary }]}>
          <Ionicons 
            name={
              activity.status === 'used' ? 'checkmark-circle' : 
              activity.status === 'expired' ? 'time-outline' :
              activity.status === 'deleted' ? 'trash-outline' :
              'add-circle'
            } 
            size={18} 
            color={
              activity.status === 'used' ? designTokens.colors.heroGreen : 
              activity.status === 'expired' ? designTokens.colors.expiredRed :
              activity.status === 'deleted' ? designTokens.colors.gray[500] :
              designTokens.colors.primary[500]
            } 
          />
        </View>
        
        <View style={styles.activityContent}>
          <Text style={[styles.activityText, { color: theme.textSecondary }]}>
            <Text style={[styles.activityUser, { color: theme.textPrimary }]}>
              {username}
            </Text>
            {' '}
            {actionText}
            {' '}
            <Text style={styles.activityItemName}>{activity.name}</Text>
          </Text>
          <Text style={[styles.activityTime, { color: theme.textTertiary }]}>
            {timeAgo}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.bgPrimary }]}>
        <StatusBar barStyle="dark-content" backgroundColor={theme.bgPrimary} />
        
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.bgPrimary, borderBottomColor: theme.borderPrimary }]}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
          </TouchableOpacity>
          
          <View style={styles.headerTitleContainer}>
            <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Household Activity</Text>
          </View>
          
          <View style={styles.headerButton} />
        </View>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={designTokens.colors.heroGreen} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
            Loading activity...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

      return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.bgPrimary }]}>
        <StatusBar barStyle="dark-content" backgroundColor={theme.bgPrimary} />
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.bgPrimary, borderBottomColor: theme.borderPrimary }]}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
        </TouchableOpacity>
        
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Household Activity</Text>
          <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
            {selectedHousehold?.households.name}
          </Text>
        </View>
        
        <View style={styles.headerButton} />
      </View>

      {/* Content */}
      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {activities.length > 0 ? (
          <View style={[styles.activityList, { backgroundColor: theme.cardBackground }]}>
            <View style={styles.activityHeader}>
              <Text style={[styles.activityHeaderText, { color: theme.textPrimary }]}>
                Recent Activity
              </Text>
              <Text style={[styles.activityCount, { color: theme.textSecondary }]}>
                {activities.length} {activities.length === 1 ? 'item' : 'items'}
              </Text>
            </View>
            
            {activities.map(renderActivityItem)}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <View style={[styles.emptyStateCard, { backgroundColor: theme.cardBackground }]}>
              <Ionicons name="time-outline" size={48} color={theme.textTertiary} />
              <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>No Activity Yet</Text>
              <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                Start adding and managing items to see household activity here
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  headerButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
  },
  headerTitleContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    ...designTokens.typography.textStyles.h3,
    fontWeight: '700',
    textAlign: 'center',
  },
  headerSubtitle: {
    ...designTokens.typography.textStyles.small,
    textAlign: 'center',
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: designTokens.spacing.md,
  },
  loadingText: {
    ...designTokens.typography.textStyles.body,
  },
  content: {
    flex: 1,
  },
  activityList: {
    margin: designTokens.spacing.md,
    borderRadius: designTokens.borderRadius.lg,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: designTokens.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.colors.gray[100],
  },
  activityHeaderText: {
    ...designTokens.typography.textStyles.bodyMedium,
    fontWeight: '600',
  },
  activityCount: {
    ...designTokens.typography.textStyles.small,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.colors.gray[100],
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: designTokens.colors.gray[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: designTokens.spacing.sm,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    ...designTokens.typography.textStyles.body,
    marginBottom: 4,
    lineHeight: 20,
  },
  activityUser: {
    fontWeight: '600',
    color: designTokens.colors.deepCharcoal,
  },
  activityItemName: {
    fontWeight: '500',
    color: designTokens.colors.primary[600],
  },
  activityTime: {
    ...designTokens.typography.textStyles.small,
    color: designTokens.colors.gray[500],
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: designTokens.spacing.xl,
  },
  emptyStateCard: {
    padding: designTokens.spacing.xl,
    borderRadius: designTokens.borderRadius.lg,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  emptyTitle: {
    ...designTokens.typography.textStyles.h3,
    fontWeight: '600',
    marginTop: designTokens.spacing.md,
    marginBottom: designTokens.spacing.xs,
  },
  emptySubtitle: {
    ...designTokens.typography.textStyles.body,
    textAlign: 'center',
    lineHeight: 22,
  },
}); 