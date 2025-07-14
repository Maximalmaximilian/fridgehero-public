import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  TextInput,
  Dimensions,
  Animated,
  ScrollView,
  Modal,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { stripeService } from '../lib/stripe';
import { useAuth } from '../contexts/AuthContext';
import { useHousehold } from '../contexts/HouseholdContext';
import { useTheme } from '../contexts/ThemeContext';
import { designTokens } from '../constants/DesignTokens';
import { SafeAreaView } from 'react-native-safe-area-context';
import ProfileAvatar from '../components/ProfileAvatar';

interface NutritionData {
  energy_kcal?: number;
  fat_g?: number;
  saturated_fat_g?: number;
  carbohydrates_g?: number;
  sugars_g?: number;
  fiber_g?: number;
  proteins_g?: number;
  salt_g?: number;
  sodium_mg?: number;
  per_100g: boolean;
}

interface FridgeItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  expiry_date: string;
  created_at: string;
  household_id: string;
  status: string;
  nutrition_data?: NutritionData | null;
  storage_tips?: string | null;
}

interface FilterOption {
  id: string;
  label: string;
  icon: string;
  count?: number;
}

interface SortOption {
  id: string;
  label: string;
  icon: string;
}

const { width } = Dimensions.get('window');

export default function ItemsScreen({ navigation }: any) {
  const [items, setItems] = useState<FridgeItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<FridgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [selectedSort, setSelectedSort] = useState('expiry');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showHouseholdSelector, setShowHouseholdSelector] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const { user } = useAuth();
  const { households, selectedHousehold, selectHousehold, loading: householdLoading } = useHousehold();
  const { theme } = useTheme();

  // Auto-refresh when screen is focused
  useFocusEffect(
    useCallback(() => {
      console.log('📱 ItemsScreen focused - refreshing data');
      if (user && selectedHousehold && !householdLoading) {
        fetchItems();
        checkSubscriptionStatus();
      }
    }, [user, selectedHousehold, householdLoading])
  );

  useEffect(() => {
    if (user && selectedHousehold && !householdLoading) {
      fetchItems();
      checkSubscriptionStatus();
    }
  }, [user, selectedHousehold, householdLoading]);

  useEffect(() => {
    filterAndSortItems();
  }, [items, searchQuery, selectedFilter, selectedSort]);

  const fetchItems = async () => {
    if (!selectedHousehold) {
      console.log('📱 No selected household, skipping item fetch');
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      console.log('📱 Fetching items for household:', selectedHousehold.households.name);
      
      const { data: itemsData, error } = await supabase
        .from('items')
        .select('*, nutrition_data, storage_tips')
        .eq('household_id', selectedHousehold.household_id)
        .eq('status', 'active')
        .order('expiry_date', { ascending: true });

      if (error) {
        console.error('Error fetching items:', error);
        Alert.alert('Error', 'Failed to load items');
      } else {
        console.log('📱 Found items:', itemsData?.length || 0);
        setItems(itemsData || []);
      }
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const checkSubscriptionStatus = async () => {
    try {
      const status = await stripeService.getSubscriptionStatus();
      setIsPremium(status.isActive);
    } catch (error) {
      console.error('Error checking subscription:', error);
      setIsPremium(false);
    }
  };

  const filterAndSortItems = () => {
    let filtered = items;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Status filter
    if (selectedFilter !== 'all') {
      const today = new Date();
      filtered = filtered.filter(item => {
        const expiryDate = new Date(item.expiry_date);
        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        switch (selectedFilter) {
          case 'expired':
            return daysUntilExpiry < 0;
          case 'expiring':
            return daysUntilExpiry >= 0 && daysUntilExpiry <= 3;
          case 'fresh':
            return daysUntilExpiry > 3;
          case 'category':
            // This will be handled by category-specific filtering
            return true;
          default:
            return true;
        }
      });
    }

    // Sorting
    filtered.sort((a, b) => {
      switch (selectedSort) {
        case 'expiry':
          return new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime();
        case 'name':
          return a.name.localeCompare(b.name);
        case 'category':
          return a.category.localeCompare(b.category);
        case 'recent':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        default:
          return 0;
      }
    });

    setFilteredItems(filtered);
  };

  const getDaysUntilExpiry = (expiryDate: string): number => {
    if (!expiryDate) return 0;
    
    const today = new Date();
    const expiry = new Date(expiryDate);
    
    // Check if the date is valid
    if (isNaN(expiry.getTime())) return 0;
    
    const days = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    // Ensure we return a valid number
    return isNaN(days) ? 0 : days;
  };

  const getExpiryColor = (daysUntilExpiry: number): string => {
    // Handle NaN or invalid numbers
    if (isNaN(daysUntilExpiry)) return designTokens.colors.gray[400];
    
    if (daysUntilExpiry < 0) return designTokens.colors.expiredRed;
    if (daysUntilExpiry <= 1) return designTokens.colors.alertAmber;
    if (daysUntilExpiry <= 3) return designTokens.colors.sunset;
    return designTokens.colors.heroGreen;
  };

  const getExpiryText = (days: number): string => {
    // Handle NaN or invalid numbers
    if (isNaN(days) || days === null || days === undefined) return 'Unknown expiry';
    
    if (days < 0) return `Expired ${Math.abs(days)} day${Math.abs(days) !== 1 ? 's' : ''} ago`;
    if (days === 0) return 'Expires today';
    if (days === 1) return 'Expires tomorrow';
    return `Expires in ${days} days`;
  };

  const deleteItem = async (itemId: string) => {
    Alert.alert(
      'Delete Item',
      'Are you sure you want to delete this item?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('items')
                .update({ status: 'trashed' })
                .eq('id', itemId);

              if (error) {
                Alert.alert('Error', 'Failed to delete item');
              } else {
                setItems(items.filter(item => item.id !== itemId));
              }
            } catch (error) {
              Alert.alert('Error', 'Something went wrong');
            }
          }
        }
      ]
    );
  };

  const markAsUsed = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('items')
        .update({ status: 'used' })
        .eq('id', itemId);

      if (error) {
        Alert.alert('Error', 'Failed to mark item as used');
      } else {
        setItems(items.filter(item => item.id !== itemId));
        Alert.alert('Success', 'Item marked as used! 🎉');
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong');
    }
  };

  const renderFilterButton = (filter: string, label: string, icon: string) => (
    <TouchableOpacity
      style={[
        styles.modernFilterButton,
        selectedFilter === filter && { backgroundColor: designTokens.colors.heroGreen, borderColor: designTokens.colors.heroGreen }
      ]}
      onPress={() => setSelectedFilter(filter)}
    >
      <Ionicons 
        name={icon as any} 
        size={16} 
        color={selectedFilter === filter ? designTokens.colors.pureWhite : theme.textSecondary} 
      />
      <Text style={[
        styles.modernFilterText,
        { color: selectedFilter === filter ? designTokens.colors.pureWhite : theme.textSecondary }
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderModernItem = ({ item }: { item: FridgeItem }) => {
    // Safety check for item data
    if (!item || !item.id) {
      console.warn('Invalid item data:', item);
      return null;
    }

    const daysUntilExpiry = getDaysUntilExpiry(item.expiry_date);
    const expiryColor = getExpiryColor(daysUntilExpiry);
    const hasNutrition = item.nutrition_data && Object.keys(item.nutrition_data).length > 1; // More than just per_100g

    return (
      <TouchableOpacity
        style={styles.modernItemCard}
        onPress={() => navigation.navigate('ItemDetails', { itemId: item.id })}
        activeOpacity={0.7}
      >
        <View style={[styles.modernItemContainer, { backgroundColor: theme.cardBackground, borderColor: theme.borderPrimary }]}>
          {/* Item Header */}
          <View style={styles.modernItemHeader}>
            <View style={styles.modernItemInfo}>
              <View style={styles.itemNameRow}>
                <Text style={[styles.modernItemName, { color: theme.textPrimary }]} numberOfLines={1}>
                  {String(item.name || 'Unnamed Item')}
                </Text>
                {hasNutrition && (
                  <View style={[styles.nutritionIndicator, { backgroundColor: designTokens.colors.heroGreen }]}>
                    <Ionicons name="nutrition" size={10} color="white" />
                  </View>
                )}
              </View>
              <Text style={[styles.modernItemCategory, { color: theme.textSecondary }]}>
                {String(item.category || 'Uncategorized')}
              </Text>
            </View>
            
            {/* Quick Actions */}
            <View style={styles.modernItemActions}>
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  markAsUsed(item.id);
                }}
                style={[styles.modernActionButton, { backgroundColor: designTokens.colors.heroGreen + '15' }]}
              >
                <Ionicons name="checkmark-circle" size={16} color={designTokens.colors.heroGreen} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  deleteItem(item.id);
                }}
                style={[styles.modernActionButton, { backgroundColor: designTokens.colors.expiredRed + '15' }]}
              >
                <Ionicons name="trash-outline" size={16} color={designTokens.colors.expiredRed} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Nutrition Stats - Only show if available */}
          {hasNutrition && item.nutrition_data && (
            <View style={[styles.nutritionRow, { backgroundColor: theme.bgTertiary, borderColor: theme.borderSecondary }]}>
              <View style={styles.nutritionGrid}>
                {item.nutrition_data.energy_kcal && typeof item.nutrition_data.energy_kcal === 'number' && (
                  <View style={styles.nutritionStat}>
                    <Text style={[styles.nutritionValue, { color: designTokens.colors.heroGreen }]}>
                      {Math.round(item.nutrition_data.energy_kcal)}
                    </Text>
                    <Text style={[styles.nutritionLabel, { color: theme.textTertiary }]}>kcal</Text>
                  </View>
                )}
                {item.nutrition_data.proteins_g && typeof item.nutrition_data.proteins_g === 'number' && (
                  <View style={styles.nutritionStat}>
                    <Text style={[styles.nutritionValue, { color: designTokens.colors.heroGreen }]}>
                      {item.nutrition_data.proteins_g.toFixed(1)}g
                    </Text>
                    <Text style={[styles.nutritionLabel, { color: theme.textTertiary }]}>protein</Text>
                  </View>
                )}
                {item.nutrition_data.carbohydrates_g && typeof item.nutrition_data.carbohydrates_g === 'number' && (
                  <View style={styles.nutritionStat}>
                    <Text style={[styles.nutritionValue, { color: designTokens.colors.heroGreen }]}>
                      {item.nutrition_data.carbohydrates_g.toFixed(1)}g
                    </Text>
                    <Text style={[styles.nutritionLabel, { color: theme.textTertiary }]}>carbs</Text>
                  </View>
                )}
                {item.nutrition_data.fat_g && typeof item.nutrition_data.fat_g === 'number' && (
                  <View style={styles.nutritionStat}>
                    <Text style={[styles.nutritionValue, { color: designTokens.colors.heroGreen }]}>
                      {item.nutrition_data.fat_g.toFixed(1)}g
                    </Text>
                    <Text style={[styles.nutritionLabel, { color: theme.textTertiary }]}>fat</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.nutritionPer100g, { color: theme.textTertiary }]}>per 100g</Text>
            </View>
          )}

          {/* Item Details Row */}
          <View style={styles.modernItemDetails}>
            <View style={styles.modernItemLeft}>
              <View style={[styles.modernQuantityBadge, { backgroundColor: theme.bgTertiary }]}>
                <Text style={[styles.modernQuantityText, { color: theme.textSecondary }]}>
                  {String(item.quantity || 1)}x
                </Text>
              </View>
            </View>
            
            <View style={[styles.modernExpiryBadge, { backgroundColor: expiryColor }]}>
              <Text style={styles.modernExpiryText}>{getExpiryText(daysUntilExpiry)}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderHouseholdSelector = () => {
    if (households.length <= 1) return null;

    return (
      <View style={[styles.householdSelectorContainer, { backgroundColor: theme.cardBackground }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.householdChips}>
            {households.map((household) => (
              <TouchableOpacity
                key={household.household_id}
                style={[
                  styles.householdChip,
                  { 
                    backgroundColor: selectedHousehold?.household_id === household.household_id ? designTokens.colors.heroGreen : theme.cardBackground,
                    borderColor: selectedHousehold?.household_id === household.household_id ? designTokens.colors.heroGreen : theme.borderPrimary
                  }
                ]}
                onPress={() => {
                  selectHousehold(household);
                  setShowHouseholdSelector(false);
                }}
              >
                <Ionicons 
                  name="home" 
                  size={16} 
                  color={selectedHousehold?.household_id === household.household_id ? designTokens.colors.pureWhite : designTokens.colors.heroGreen} 
                />
                <Text style={[
                  styles.householdChipText,
                  { 
                    color: selectedHousehold?.household_id === household.household_id ? designTokens.colors.pureWhite : theme.textPrimary
                  }
                ]}>
                  {household.households.name}
                </Text>
                {household.role === 'owner' && (
                  <Ionicons 
                    name="star" 
                    size={12} 
                    color={selectedHousehold?.household_id === household.household_id ? designTokens.colors.amber[200] : designTokens.colors.amber[500]} 
                  />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  };

  const getFilterOptions = (): FilterOption[] => {
    const today = new Date();
    const expiredCount = items.filter(item => {
      const days = getDaysUntilExpiry(item.expiry_date);
      return days < 0;
    }).length;
    
    const expiringCount = items.filter(item => {
      const days = getDaysUntilExpiry(item.expiry_date);
      return days >= 0 && days <= 3;
    }).length;
    
    const freshCount = items.filter(item => {
      const days = getDaysUntilExpiry(item.expiry_date);
      return days > 3;
    }).length;

    return [
      { id: 'all', label: 'All Items', icon: 'list-outline', count: items.length },
      { id: 'expiring', label: 'Expiring Soon', icon: 'time-outline', count: expiringCount },
      { id: 'expired', label: 'Expired', icon: 'alert-circle-outline', count: expiredCount },
      { id: 'fresh', label: 'Fresh', icon: 'leaf-outline', count: freshCount },
    ];
  };

  const getSortOptions = (): SortOption[] => [
    { id: 'expiry', label: 'By Expiry Date', icon: 'time-outline' },
    { id: 'name', label: 'By Name', icon: 'text-outline' },
    { id: 'category', label: 'By Category', icon: 'grid-outline' },
    { id: 'recent', label: 'Recently Added', icon: 'add-circle-outline' },
  ];

  const getSelectedFilterLabel = (): string => {
    const option = getFilterOptions().find(opt => opt.id === selectedFilter);
    return option?.label || 'All Items';
  };

  const getSelectedSortLabel = (): string => {
    const option = getSortOptions().find(opt => opt.id === selectedSort);
    return option?.label || 'By Expiry Date';
  };

  const renderFilterDropdown = () => (
    <Modal
      visible={showFilterDropdown}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowFilterDropdown(false)}
    >
      <TouchableOpacity 
        style={styles.dropdownOverlay}
        activeOpacity={1}
        onPress={() => setShowFilterDropdown(false)}
      >
        <View style={[styles.dropdownContainer, { backgroundColor: theme.cardBackground, borderColor: theme.borderPrimary }]}>
          <View style={styles.dropdownHeader}>
            <Text style={[styles.dropdownTitle, { color: theme.textPrimary }]}>Filter Items</Text>
            <TouchableOpacity onPress={() => setShowFilterDropdown(false)}>
              <Ionicons name="close" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>
          
          {getFilterOptions().map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.dropdownOption,
                selectedFilter === option.id && { backgroundColor: theme.bgTertiary }
              ]}
              onPress={() => {
                setSelectedFilter(option.id);
                setShowFilterDropdown(false);
              }}
            >
              <View style={styles.dropdownOptionLeft}>
                <Ionicons 
                  name={option.icon as any} 
                  size={20} 
                  color={selectedFilter === option.id ? designTokens.colors.heroGreen : theme.textSecondary} 
                />
                <Text style={[
                  styles.dropdownOptionText,
                  { 
                    color: selectedFilter === option.id ? theme.textPrimary : theme.textSecondary,
                    fontWeight: selectedFilter === option.id ? '600' : '400'
                  }
                ]}>
                  {option.label}
                </Text>
              </View>
              <View style={[
                styles.countBadge,
                { backgroundColor: selectedFilter === option.id ? designTokens.colors.heroGreen + '20' : theme.bgTertiary }
              ]}>
                <Text style={[
                  styles.countBadgeText,
                  { color: selectedFilter === option.id ? designTokens.colors.heroGreen : theme.textTertiary }
                ]}>
                  {String(option.count || 0)}
                </Text>
              </View>
              {selectedFilter === option.id && (
                <Ionicons name="checkmark" size={16} color={designTokens.colors.heroGreen} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const renderSortDropdown = () => (
    <Modal
      visible={showSortDropdown}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowSortDropdown(false)}
    >
      <TouchableOpacity 
        style={styles.dropdownOverlay}
        activeOpacity={1}
        onPress={() => setShowSortDropdown(false)}
      >
        <View style={[styles.dropdownContainer, { backgroundColor: theme.cardBackground, borderColor: theme.borderPrimary }]}>
          <View style={styles.dropdownHeader}>
            <Text style={[styles.dropdownTitle, { color: theme.textPrimary }]}>Sort Items</Text>
            <TouchableOpacity onPress={() => setShowSortDropdown(false)}>
              <Ionicons name="close" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>
          
          {getSortOptions().map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.dropdownOption,
                selectedSort === option.id && { backgroundColor: theme.bgTertiary }
              ]}
              onPress={() => {
                setSelectedSort(option.id);
                setShowSortDropdown(false);
              }}
            >
              <View style={styles.dropdownOptionLeft}>
                <Ionicons 
                  name={option.icon as any} 
                  size={20} 
                  color={selectedSort === option.id ? designTokens.colors.heroGreen : theme.textSecondary} 
                />
                <Text style={[
                  styles.dropdownOptionText,
                  { 
                    color: selectedSort === option.id ? theme.textPrimary : theme.textSecondary,
                    fontWeight: selectedSort === option.id ? '600' : '400'
                  }
                ]}>
                  {option.label}
                </Text>
              </View>
              {selectedSort === option.id && (
                <Ionicons name="checkmark" size={16} color={designTokens.colors.heroGreen} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );

  if (loading || householdLoading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.bgPrimary }]}>
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading items...</Text>
      </View>
    );
  }

  if (!selectedHousehold) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.bgPrimary }]}>
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>No household selected</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bgPrimary }]} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.bgPrimary, borderBottomColor: theme.borderPrimary }]}>
        <ProfileAvatar 
          size={44} 
          onPress={() => navigation.navigate('AccountDetails')}
          isPremium={isPremium}
        />
        
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>My Items</Text>
          <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
            {String(filteredItems.length)} of {String(items.length)}
          </Text>
        </View>
        
        {households.length > 1 && (
          <TouchableOpacity 
            onPress={() => setShowHouseholdSelector(!showHouseholdSelector)} 
            style={[styles.headerButton, { backgroundColor: designTokens.colors.gray[100] }]}
          >
            <Ionicons name="swap-horizontal-outline" size={24} color={designTokens.colors.heroGreen} />
          </TouchableOpacity>
        )}
      </View>

      {/* Household Selector */}
      {showHouseholdSelector && renderHouseholdSelector()}

      {/* Professional Search and Filter Bar */}
      <View style={[styles.searchFilterContainer, { backgroundColor: theme.bgPrimary, gap: 12 }]}>
        {/* Search Bar */}
        <View style={[styles.modernSearchBar, { backgroundColor: theme.cardBackground, borderColor: theme.borderPrimary }]}>
          <Ionicons name="search" size={18} color={theme.textTertiary} />
          <TextInput
            style={[styles.modernSearchInput, { color: theme.textPrimary }]}
            placeholder="Search items..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={theme.textTertiary}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={theme.textTertiary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter and Sort Buttons */}
        <View style={styles.filterSortRow}>
          <TouchableOpacity
            style={[styles.modernFilterButton, { backgroundColor: theme.cardBackground, borderColor: theme.borderPrimary }]}
            onPress={() => setShowFilterDropdown(true)}
          >
            <Ionicons name="funnel-outline" size={16} color={theme.textSecondary} />
            <Text style={[styles.modernFilterText, { color: theme.textSecondary }]}>
              {getSelectedFilterLabel()}
            </Text>
            <Ionicons name="chevron-down" size={14} color={theme.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modernFilterButton, { backgroundColor: theme.cardBackground, borderColor: theme.borderPrimary }]}
            onPress={() => setShowSortDropdown(true)}
          >
            <Ionicons name="swap-vertical-outline" size={16} color={theme.textSecondary} />
            <Text style={[styles.modernFilterText, { color: theme.textSecondary }]}>
              {getSelectedSortLabel()}
            </Text>
            <Ionicons name="chevron-down" size={14} color={theme.textTertiary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Items List with Proper Spacing */}
      {filteredItems.length > 0 ? (
        <FlatList
          data={filteredItems}
          renderItem={renderModernItem}
          keyExtractor={(item) => item.id}
          style={styles.modernItemsList}
          contentContainerStyle={styles.modernItemsListContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchItems();
              }}
              tintColor={theme.textSecondary}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.modernEmptyState}>
          <Ionicons name="basket-outline" size={48} color={theme.textTertiary} />
          <Text style={[styles.modernEmptyTitle, { color: theme.textPrimary }]}>
            {searchQuery || selectedFilter !== 'all' ? 'No items found' : 'No items yet'}
          </Text>
          <Text style={[styles.modernEmptySubtitle, { color: theme.textSecondary }]}>
            {searchQuery || selectedFilter !== 'all' 
              ? 'Try adjusting your search or filters'
              : 'Add your first item to get started'
            }
          </Text>
          {!searchQuery && selectedFilter === 'all' && (
            <TouchableOpacity 
              style={[styles.modernEmptyButton, { backgroundColor: designTokens.colors.heroGreen }]}
              onPress={() => navigation.navigate('AddItem')}
            >
              <Ionicons name="add" size={18} color={designTokens.colors.pureWhite} />
              <Text style={styles.modernEmptyButtonText}>Add First Item</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Dropdowns */}
      {renderFilterDropdown()}
      {renderSortDropdown()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...designTokens.typography.textStyles.body,
    color: designTokens.colors.gray[600],
  },
  
  // Enhanced Header Design
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
    backgroundColor: designTokens.colors.gray[100],
  },
  headerTitleContainer: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: '400',
    textAlign: 'center',
  },

  // Professional Search and Filter Section
  searchFilterContainer: {
    paddingHorizontal: designTokens.spacing.xl,
    paddingVertical: designTokens.spacing.lg,
    gap: designTokens.spacing.md,
  },
  modernSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: designTokens.spacing.lg,
    paddingVertical: designTokens.spacing.md,
    borderRadius: designTokens.borderRadius.xl,
    borderWidth: 2,
    borderColor: designTokens.colors.gray[200],
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    minHeight: 56,
  },
  modernSearchInput: {
    flex: 1,
    marginLeft: designTokens.spacing.sm,
    ...designTokens.typography.textStyles.body,
    color: designTokens.colors.deepCharcoal,
  },
  filterSortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: designTokens.spacing.sm,
  },
  modernFilterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.sm,
    borderRadius: designTokens.borderRadius.lg,
    borderWidth: 1,
    borderColor: designTokens.colors.gray[300],
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    gap: designTokens.spacing.xs,
    minHeight: 44,
    justifyContent: 'center',
  },
  modernFilterText: {
    flex: 1,
    ...designTokens.typography.textStyles.caption,
    fontWeight: '600',
    fontSize: 13,
    textAlign: 'center',
  },

  // Enhanced Items List
  modernItemsList: {
    flex: 1,
    paddingHorizontal: designTokens.spacing.xl,
  },
  modernItemsListContent: {
    paddingBottom: designTokens.spacing.xl,
    gap: designTokens.spacing.md,
  },
  modernItemCard: {
    borderRadius: designTokens.borderRadius.xl,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    marginBottom: designTokens.spacing.sm,
  },
  modernItemContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: designTokens.borderRadius.xl,
    padding: designTokens.spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  modernItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: designTokens.spacing.md,
  },
  modernItemInfo: {
    flex: 1,
    marginRight: designTokens.spacing.md,
  },
  modernItemName: {
    ...designTokens.typography.textStyles.h3,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  modernItemCategory: {
    ...designTokens.typography.textStyles.body,
    color: designTokens.colors.gray[600],
    fontWeight: '500',
  },
  modernItemActions: {
    flexDirection: 'row',
    gap: designTokens.spacing.xs,
  },
  modernActionButton: {
    width: 36,
    height: 36,
    borderRadius: designTokens.borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  modernItemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modernItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modernQuantityBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    paddingHorizontal: designTokens.spacing.sm,
    paddingVertical: 6,
    borderRadius: designTokens.borderRadius.md,
  },
  modernQuantityText: {
    ...designTokens.typography.textStyles.caption,
    fontWeight: '700',
    fontSize: 12,
  },
  modernExpiryBadge: {
    paddingHorizontal: designTokens.spacing.sm,
    paddingVertical: 6,
    borderRadius: designTokens.borderRadius.md,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  modernExpiryText: {
    ...designTokens.typography.textStyles.caption,
    color: designTokens.colors.pureWhite,
    fontWeight: '700',
    fontSize: 12,
  },

  // Enhanced Empty State
  modernEmptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: designTokens.spacing['2xl'],
    paddingVertical: designTokens.spacing['3xl'],
  },
  modernEmptyTitle: {
    ...designTokens.typography.textStyles.h2,
    fontWeight: '700',
    marginTop: designTokens.spacing.lg,
    marginBottom: designTokens.spacing.sm,
    textAlign: 'center',
  },
  modernEmptySubtitle: {
    ...designTokens.typography.textStyles.body,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: designTokens.spacing.xl,
    maxWidth: 280,
  },
  modernEmptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: designTokens.spacing.xl,
    paddingVertical: designTokens.spacing.md,
    borderRadius: designTokens.borderRadius.xl,
    elevation: 6,
    shadowColor: designTokens.colors.heroGreen,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    gap: designTokens.spacing.sm,
  },
  modernEmptyButtonText: {
    ...designTokens.typography.textStyles.bodyMedium,
    color: designTokens.colors.pureWhite,
    fontWeight: '700',
  },

  // Enhanced Household Selector
  householdSelectorContainer: {
    paddingHorizontal: designTokens.spacing.xl,
    paddingVertical: designTokens.spacing.md,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  householdChips: {
    flexDirection: 'row',
    gap: designTokens.spacing.sm,
  },
  householdChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 2,
    paddingHorizontal: designTokens.spacing.lg,
    paddingVertical: designTokens.spacing.md,
    borderRadius: designTokens.borderRadius.full,
    gap: designTokens.spacing.xs,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    minHeight: 44,
  },
  householdChipSelected: {
    backgroundColor: designTokens.colors.heroGreen,
    borderColor: designTokens.colors.heroGreen,
    elevation: 6,
    shadowColor: designTokens.colors.heroGreen,
    shadowOpacity: 0.25,
  },
  householdChipText: {
    ...designTokens.typography.textStyles.bodyMedium,
    fontWeight: '600',
  },
  householdChipTextSelected: {
    color: designTokens.colors.pureWhite,
  },

  // Enhanced Dropdown Design
  dropdownOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  dropdownContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    padding: designTokens.spacing.xl,
    borderRadius: designTokens.borderRadius.xl,
    width: '85%',
    maxHeight: '70%',
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: designTokens.spacing.lg,
    paddingBottom: designTokens.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.colors.gray[200],
  },
  dropdownTitle: {
    ...designTokens.typography.textStyles.h2,
    fontWeight: '700',
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: designTokens.spacing.md,
    paddingHorizontal: designTokens.spacing.sm,
    borderRadius: designTokens.borderRadius.lg,
    marginBottom: designTokens.spacing.xs,
  },
  dropdownOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: designTokens.spacing.sm,
    flex: 1,
  },
  dropdownOptionText: {
    ...designTokens.typography.textStyles.body,
    fontWeight: '500',
  },
  countBadge: {
    backgroundColor: designTokens.colors.gray[100],
    paddingHorizontal: designTokens.spacing.sm,
    paddingVertical: 4,
    borderRadius: designTokens.borderRadius.md,
  },
  countBadgeText: {
    ...designTokens.typography.textStyles.caption,
    fontWeight: '700',
    fontSize: 11,
  },

  // Legacy styles (keeping for compatibility)
  itemCard: {
    backgroundColor: designTokens.colors.pureWhite,
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: designTokens.colors.gray[200],
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 18,
    fontWeight: '600',
    color: designTokens.colors.deepCharcoal,
    fontFamily: 'Poppins',
    marginBottom: 4,
  },
  itemCategory: {
    fontSize: 14,
    color: designTokens.colors.gray[600],
    fontFamily: 'Inter',
  },
  itemActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  useButton: {
    backgroundColor: designTokens.colors.heroGreen,
  },
  deleteButton: {
    backgroundColor: designTokens.colors.expiredRed,
  },
  itemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quantityBadge: {
    backgroundColor: designTokens.colors.gray[100],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  quantityText: {
    fontSize: 12,
    color: designTokens.colors.gray[700],
    fontFamily: 'Inter',
    fontWeight: '500',
  },
  expiryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  expiryText: {
    fontSize: 12,
    color: designTokens.colors.pureWhite,
    fontFamily: 'Inter',
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: designTokens.colors.deepCharcoal,
    fontFamily: 'Poppins',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: designTokens.colors.gray[600],
    fontFamily: 'Inter',
    textAlign: 'center',
    lineHeight: 24,
  },

  // Nutrition-related styles
  itemNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: designTokens.spacing.sm,
  },
  nutritionIndicator: {
    backgroundColor: designTokens.colors.heroGreen,
    borderRadius: designTokens.borderRadius.full,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  nutritionRow: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderWidth: 1,
    borderRadius: designTokens.borderRadius.lg,
    padding: designTokens.spacing.md,
    marginVertical: designTokens.spacing.sm,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  nutritionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: designTokens.spacing.xs,
  },
  nutritionStat: {
    alignItems: 'center',
    flex: 1,
  },
  nutritionValue: {
    ...designTokens.typography.textStyles.bodyMedium,
    fontWeight: '700',
    color: designTokens.colors.heroGreen,
    fontSize: 14,
  },
  nutritionLabel: {
    ...designTokens.typography.textStyles.caption,
    color: designTokens.colors.gray[600],
    fontSize: 11,
    marginTop: 2,
  },
  nutritionPer100g: {
    ...designTokens.typography.textStyles.caption,
    color: designTokens.colors.gray[500],
    fontSize: 10,
    textAlign: 'center',
    fontStyle: 'italic',
  },
}); 