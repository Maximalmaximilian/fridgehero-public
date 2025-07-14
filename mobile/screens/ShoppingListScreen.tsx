import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  RefreshControl,
  Animated,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { stripeService } from '../lib/stripe';
import { smartShoppingService, type SmartSuggestion } from '../lib/smart-shopping-service';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useHousehold } from '../contexts/HouseholdContext';
import { designTokens } from '../constants/DesignTokens';

interface ShoppingListItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  completed: boolean;
  notes?: string;
  added_by: string;
  completed_by?: string;
  completed_at?: string;
  created_at: string;
  auto_generated?: boolean;
  priority?: 'critical' | 'high' | 'medium' | 'low';
  estimated_price?: number;
}

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  sort_order: number;
}

export default function ShoppingListScreen({ navigation }: any) {
  const [items, setItems] = useState<ShoppingListItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [smartSuggestions, setSmartSuggestions] = useState<SmartSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [smartLoading, setSmartLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [showCompleted, setShowCompleted] = useState(false);
  const [smartMode, setSmartMode] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [checkingSubscription, setCheckingSubscription] = useState(true);
  
  // Form state
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('Other');
  const [newItemQuantity, setNewItemQuantity] = useState('1');
  const [newItemUnit, setNewItemUnit] = useState('pcs');
  const [newItemNotes, setNewItemNotes] = useState('');

  const { user } = useAuth();
  const { theme } = useTheme();
  const { selectedHousehold } = useHousehold();

  const fadeAnim = new Animated.Value(1);
  const scaleAnim = new Animated.Value(1);
  const [pulseAnimation] = useState(new Animated.Value(1));
  const [sparkleAnimation] = useState(new Animated.Value(0));

  useEffect(() => {
    if (selectedHousehold) {
      fetchShoppingList();
      fetchCategories();
    }
  }, [selectedHousehold]);

  useEffect(() => {
    if (user) {
      checkSubscriptionStatus();
    }
  }, [user]);

  useEffect(() => {
    if (isPremium && selectedHousehold && smartMode) {
      generateSmartSuggestions();
    }
  }, [isPremium, selectedHousehold, smartMode]);

  // Add focus effect to refresh subscription status when returning to screen
  useFocusEffect(
    React.useCallback(() => {
      if (user) {
        console.log('🛒 Shopping List screen focused - refreshing subscription status');
        checkSubscriptionStatus();
      }
    }, [user])
  );

  useEffect(() => {
    if (!isPremium) {
      startAnimations();
    }
  }, [isPremium]);

  const startAnimations = () => {
    // Pulse animation for upgrade prompts
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnimation, {
          toValue: 1.05,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnimation, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Sparkle animation for premium elements
    Animated.loop(
      Animated.sequence([
        Animated.timing(sparkleAnimation, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(sparkleAnimation, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const checkSubscriptionStatus = async () => {
    try {
      const status = await stripeService.getSubscriptionStatus();
      setIsPremium(status.isActive);
      console.log('🛒 Shopping List subscription status:', status.isActive ? 'Premium' : 'Free');
    } catch (error) {
      console.error('Error checking subscription:', error);
      setIsPremium(false);
    } finally {
      setCheckingSubscription(false);
    }
  };

  const generateSmartSuggestions = async () => {
    if (!selectedHousehold || !isPremium) return;

    try {
      setSmartLoading(true);
      console.log('🤖 Generating smart shopping suggestions...');

      const suggestions = await smartShoppingService.generateSmartSuggestions(
        selectedHousehold.household_id,
        {
          budget_range: 'moderate',
          max_expiry_days: 7
        }
      );

      console.log(`🤖 Generated ${suggestions.length} smart suggestions`);
      setSmartSuggestions(suggestions);

    } catch (error) {
      console.error('Error generating smart suggestions:', error);
      if ((error as any)?.message?.includes('premium feature')) {
        Alert.alert(
          'Premium Feature',
          'Smart Shopping Lists are available for premium users. Upgrade to unlock AI-powered recommendations!',
          [
            { text: 'Maybe Later', style: 'cancel' },
            { text: 'Upgrade Now', onPress: () => navigation.navigate('Premium', { source: 'smart_shopping' }) }
          ]
        );
      } else {
        Alert.alert('Error', 'Unable to generate smart suggestions. Please try again later.');
      }
    } finally {
      setSmartLoading(false);
    }
  };

  const addSmartSuggestionToList = async (suggestion: SmartSuggestion) => {
    try {
      const { error } = await supabase
        .from('shopping_list_items')
        .insert([{
          name: suggestion.name,
          category: suggestion.category,
          quantity: suggestion.suggested_quantity,
          unit: suggestion.suggested_unit,
          notes: `💡 ${suggestion.reason}`,
          household_id: selectedHousehold?.household_id,
          added_by: user?.id,
          auto_generated: true,
          priority: suggestion.urgency,
          estimated_price: suggestion.estimated_price
        }]);

      if (error) throw error;

      // Invalidate cache to ensure fresh suggestions
      if (selectedHousehold) {
        await smartShoppingService.invalidateSuggestionsCache(selectedHousehold.household_id);
      }

      // Remove from suggestions and refresh list
      setSmartSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
      fetchShoppingList();

      // Show success animation
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 0.95,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();

    } catch (error) {
      console.error('Error adding smart suggestion:', error);
      Alert.alert('Error', 'Failed to add item to list');
    }
  };

  const bulkAddSuggestions = async () => {
    if (!isPremium || smartSuggestions.length === 0) return;

    try {
      Alert.alert(
        'Add All Suggestions',
        `Add all ${smartSuggestions.length} smart suggestions to your shopping list?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Add All',
            onPress: async () => {
              try {
                await smartShoppingService.autoPopulateShoppingList(
                  selectedHousehold!.household_id,
                  smartSuggestions.map(s => s.id),
                  user!.id
                );
                
                setSmartSuggestions([]);
                fetchShoppingList();
                
                Alert.alert(
                  'Success! 🎉',
                  `Added ${smartSuggestions.length} smart suggestions to your shopping list.`
                );
              } catch (error) {
                Alert.alert('Error', 'Failed to add suggestions');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error bulk adding suggestions:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('shopping_list_categories')
        .select('*')
        .order('sort_order');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchShoppingList = async () => {
    if (!selectedHousehold) return;

    try {
      const { data, error } = await supabase
        .from('shopping_list_items')
        .select('*')
        .eq('household_id', selectedHousehold.household_id)
        .order('completed', { ascending: true })
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Error fetching shopping list:', error);
      Alert.alert('Error', 'Failed to load shopping list');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const addItem = async () => {
    if (!newItemName.trim()) {
      Alert.alert('Error', 'Please enter an item name');
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from('shopping_list_items')
        .insert([{
          name: newItemName.trim(),
          category: newItemCategory,
          quantity: parseFloat(newItemQuantity) || 1,
          unit: newItemUnit,
          notes: newItemNotes.trim() || null,
          household_id: selectedHousehold?.household_id,
          added_by: user?.id,
        }]);

      if (error) throw error;

      // Invalidate cache to ensure fresh suggestions
      if (selectedHousehold) {
        await smartShoppingService.invalidateSuggestionsCache(selectedHousehold.household_id);
      }

      // Reset form
      setNewItemName('');
      setNewItemCategory('Other');
      setNewItemQuantity('1');
      setNewItemUnit('pcs');
      setNewItemNotes('');
      setShowAddModal(false);
      
      fetchShoppingList();
      
      // Regenerate suggestions if in smart mode
      if (isPremium && smartMode) {
        generateSmartSuggestions();
      }
    } catch (error) {
      console.error('Error adding item:', error);
      Alert.alert('Error', 'Failed to add item');
    } finally {
      setLoading(false);
    }
  };

  const toggleCompleted = async (item: ShoppingListItem) => {
    try {
      // Animate the item
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 0.95,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();

      const { error } = await supabase
        .from('shopping_list_items')
        .update({ completed: !item.completed })
        .eq('id', item.id);

      if (error) throw error;
      fetchShoppingList();
    } catch (error) {
      console.error('Error updating item:', error);
      Alert.alert('Error', 'Failed to update item');
    }
  };

  const deleteItem = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('shopping_list_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
      fetchShoppingList();
    } catch (error) {
      console.error('Error deleting item:', error);
      Alert.alert('Error', 'Failed to delete item');
    }
  };

  const clearCompleted = async () => {
    Alert.alert(
      'Clear Completed Items',
      'Are you sure you want to remove all completed items?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('shopping_list_items')
                .delete()
                .eq('household_id', selectedHousehold?.household_id)
                .eq('completed', true);

              if (error) throw error;
              fetchShoppingList();
            } catch (error) {
              Alert.alert('Error', 'Failed to clear completed items');
            }
          }
        }
      ]
    );
  };

  const filteredItems = items.filter(item => {
    const categoryMatch = selectedCategory === 'All' || item.category === selectedCategory;
    const completedMatch = showCompleted || !item.completed;
    return categoryMatch && completedMatch;
  });

  const completedCount = items.filter(item => item.completed).length;
  const totalCount = items.length;

  const getUrgencyColor = (urgency: 'critical' | 'high' | 'medium' | 'low') => {
    switch (urgency) {
      case 'critical': return designTokens.colors.expiredRed;
      case 'high': return designTokens.colors.alertAmber;
      case 'medium': return designTokens.colors.ocean;
      case 'low': return designTokens.colors.heroGreen;
      default: return designTokens.colors.gray[500];
    }
  };

  const getUrgencyIcon = (urgency: 'critical' | 'high' | 'medium' | 'low') => {
    switch (urgency) {
      case 'critical': return 'warning';
      case 'high': return 'alert-circle';
      case 'medium': return 'information-circle';
      case 'low': return 'checkmark-circle';
      default: return 'help-circle';
    }
  };

  const renderSmartSuggestion = ({ item: suggestion }: { item: SmartSuggestion }) => (
    <Animated.View style={[
      styles.suggestionCard,
      {
        transform: [{ scale: scaleAnim }],
        opacity: smartLoading ? 0.7 : 1
      }
    ]}>
      <LinearGradient
        colors={[
          `${getUrgencyColor(suggestion.urgency)}08`,
          theme.cardBackground,
          theme.cardBackground
        ]}
        style={[styles.suggestionGradient, { borderColor: theme.borderPrimary }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <View style={styles.suggestionContent}>
          {/* Main Info Row */}
          <View style={styles.suggestionMainRow}>
            <View style={styles.suggestionInfo}>
              <View style={styles.suggestionTitleRow}>
                <Text style={[styles.suggestionName, { color: theme.textPrimary }]} numberOfLines={1}>
                  {suggestion.name}
                </Text>
                <View style={[
                  styles.urgencyBadge,
                  { backgroundColor: getUrgencyColor(suggestion.urgency) }
                ]}>
                  <Ionicons 
                    name={getUrgencyIcon(suggestion.urgency)} 
                    size={10} 
                    color="white" 
                  />
                </View>
              </View>
              
              <Text style={[styles.suggestionMeta, { color: theme.textSecondary }]} numberOfLines={1}>
                {suggestion.category} • {suggestion.suggested_quantity} {suggestion.suggested_unit}
              </Text>
              
              <Text style={[styles.suggestionReason, { color: theme.textSecondary }]} numberOfLines={2}>
                {suggestion.reason}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.addButton}
              onPress={() => addSmartSuggestionToList(suggestion)}
            >
              <LinearGradient
                colors={[designTokens.colors.heroGreen, designTokens.colors.green[600]]}
                style={styles.addButtonGradient}
              >
                <Ionicons name="add" size={18} color="white" />
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Details Row */}
          <View style={styles.suggestionDetails}>
            <View style={styles.detailItem}>
              <Ionicons name="pricetag-outline" size={12} color={designTokens.colors.heroGreen} />
              <Text style={[styles.detailText, { color: theme.textSecondary }]}>
                ${suggestion.estimated_price.toFixed(2)}
              </Text>
            </View>
            
            <View style={styles.detailItem}>
              <Ionicons name="analytics-outline" size={12} color={designTokens.colors.ocean} />
              <Text style={[styles.detailText, { color: theme.textSecondary }]}>
                {Math.round(suggestion.confidence_score * 100)}%
              </Text>
            </View>

            {suggestion.expiry_prevention && (
              <View style={styles.detailItem}>
                <Ionicons name="leaf-outline" size={12} color={designTokens.colors.heroGreen} />
                <Text style={[styles.detailText, { color: theme.textSecondary }]}>
                  Waste prevention
                </Text>
              </View>
            )}

            {suggestion.savings_potential && (
              <View style={styles.detailItem}>
                <Ionicons name="trending-down-outline" size={12} color={designTokens.colors.alertAmber} />
                <Text style={[styles.detailText, { color: theme.textSecondary }]} numberOfLines={1}>
                  {suggestion.savings_potential}
                </Text>
              </View>
            )}
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );

  const renderModeToggle = () => (
    <View style={styles.modeToggleContainer}>
      <View style={[styles.modeToggle, { backgroundColor: theme.bgTertiary }]}>
        <TouchableOpacity
          style={[
            styles.modeToggleButton,
            !smartMode && styles.modeToggleButtonActive,
            { backgroundColor: !smartMode ? theme.cardBackground : 'transparent' }
          ]}
          onPress={() => setSmartMode(false)}
        >
          <Ionicons 
            name="list" 
            size={16} 
            color={!smartMode ? designTokens.colors.heroGreen : theme.textSecondary} 
          />
          <Text style={[
            styles.modeToggleText,
            { color: !smartMode ? designTokens.colors.heroGreen : theme.textSecondary }
          ]}>
            Manual
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.modeToggleButton,
            smartMode && styles.modeToggleButtonActive,
            { backgroundColor: smartMode ? theme.cardBackground : 'transparent' }
          ]}
          onPress={() => {
            if (!isPremium) {
              Alert.alert(
                'Premium Feature',
                'Smart Shopping Lists are available for premium users only.',
                [
                  { text: 'Maybe Later', style: 'cancel' },
                  { text: 'Upgrade Now', onPress: () => navigation.navigate('Premium', { source: 'smart_shopping' }) }
                ]
              );
            } else {
              setSmartMode(true);
            }
          }}
        >
          <Animated.View style={{
            opacity: sparkleAnimation.interpolate({
              inputRange: [0, 1],
              outputRange: [0.6, 1]
            })
          }}>
            <Ionicons 
              name={isPremium ? "sparkles" : "lock-closed"} 
              size={16} 
              color={smartMode ? designTokens.colors.heroGreen : theme.textSecondary} 
            />
          </Animated.View>
          <Text style={[
            styles.modeToggleText,
            { color: smartMode ? designTokens.colors.heroGreen : theme.textSecondary }
          ]}>
            Smart {!isPremium && '🔒'}
          </Text>
          {smartLoading && smartMode && (
            <View style={styles.loadingDot}>
              <Animated.View style={[
                styles.loadingDotInner,
                { opacity: sparkleAnimation }
              ]} />
            </View>
          )}
        </TouchableOpacity>
      </View>

      {smartMode && isPremium && smartSuggestions.length > 0 && (
        <TouchableOpacity
          style={styles.bulkAddButton}
          onPress={bulkAddSuggestions}
        >
          <Ionicons name="add-circle" size={16} color={designTokens.colors.heroGreen} />
          <Text style={[styles.bulkAddText, { color: designTokens.colors.heroGreen }]}>
            Add All ({smartSuggestions.length})
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderSmartPreview = () => (
    <View style={styles.smartPreviewContainer}>
      <LinearGradient
        colors={[designTokens.colors.heroGreen, designTokens.colors.green[600]]}
        style={styles.smartPreviewGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Animated.View style={[
          styles.smartPreviewContent,
          { transform: [{ scale: pulseAnimation }] }
        ]}>
          <View style={styles.smartPreviewHeader}>
            <Ionicons name="sparkles" size={24} color="white" />
            <Text style={styles.smartPreviewTitle}>🤖 Smart Shopping Lists</Text>
          </View>
          
          <Text style={styles.smartPreviewSubtitle}>
            AI-powered recommendations based on your fridge contents, usage patterns, and recipes
          </Text>

          <View style={styles.smartFeaturesList}>
            <View style={styles.smartFeature}>
              <Ionicons name="bulb" size={16} color="white" />
              <Text style={styles.smartFeatureText}>Usage pattern analysis</Text>
            </View>
            <View style={styles.smartFeature}>
              <Ionicons name="restaurant" size={16} color="white" />
              <Text style={styles.smartFeatureText}>Recipe integration</Text>
            </View>
            <View style={styles.smartFeature}>
              <Ionicons name="leaf" size={16} color="white" />
              <Text style={styles.smartFeatureText}>Expiry rescue suggestions</Text>
            </View>
            <View style={styles.smartFeature}>
              <Ionicons name="trending-up" size={16} color="white" />
              <Text style={styles.smartFeatureText}>Budget optimization</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.smartUpgradeButton}
            onPress={() => navigation.navigate('Premium', { source: 'smart_shopping' })}
          >
            <Text style={styles.smartUpgradeText}>Unlock Smart Shopping</Text>
            <Ionicons name="arrow-forward" size={16} color={designTokens.colors.heroGreen} />
          </TouchableOpacity>
        </Animated.View>
      </LinearGradient>
    </View>
  );

  const renderItem = ({ item }: { item: ShoppingListItem }) => {
    const category = categories.find(c => c.name === item.category);
    
    return (
      <Animated.View style={[styles.itemCard, { transform: [{ scale: scaleAnim }] }]}>
        <LinearGradient
          colors={item.completed 
            ? [theme.bgTertiary, theme.bgSecondary]
            : [theme.cardBackground, theme.bgSecondary]
          }
          style={[styles.itemGradient, { borderColor: theme.borderPrimary }]}
        >
          <View style={styles.itemContent}>
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => toggleCompleted(item)}
            >
              <View style={[
                styles.checkbox,
                {
                  backgroundColor: item.completed ? designTokens.colors.heroGreen : 'transparent',
                  borderColor: item.completed ? designTokens.colors.heroGreen : theme.borderPrimary
                }
              ]}>
                {item.completed && (
                  <Ionicons name="checkmark" size={16} color="white" />
                )}
              </View>
            </TouchableOpacity>

            <View style={styles.itemInfo}>
              <View style={styles.itemHeader}>
                <Text style={[
                  styles.itemName,
                  {
                    color: item.completed ? theme.textTertiary : theme.textPrimary,
                    textDecorationLine: item.completed ? 'line-through' : 'none'
                  }
                ]}>
                  {item.name}
                </Text>
                
                {item.priority && item.priority !== 'low' && (
                  <View style={[
                    styles.priorityBadge,
                    { backgroundColor: getUrgencyColor(item.priority) }
                  ]}>
                    <Ionicons 
                      name={getUrgencyIcon(item.priority)} 
                      size={10} 
                      color="white" 
                    />
                  </View>
                )}
              </View>

              <View style={styles.itemDetails}>
                <Text style={[styles.itemCategory, { color: theme.textSecondary }]}>
                  {item.category} • {item.quantity} {item.unit}
                </Text>
                
                {item.estimated_price && (
                  <Text style={[styles.itemPrice, { color: designTokens.colors.heroGreen }]}>
                    ${item.estimated_price.toFixed(2)}
                  </Text>
                )}
              </View>

              {item.notes && (
                <Text style={[styles.itemNotes, { color: theme.textSecondary }]} numberOfLines={2}>
                  {item.notes}
                </Text>
              )}

              {item.auto_generated && (
                <View style={styles.aiGeneratedBadge}>
                  <Ionicons name="sparkles" size={12} color={designTokens.colors.ocean} />
                  <Text style={[styles.aiGeneratedText, { color: designTokens.colors.ocean }]}>
                    AI Suggested
                  </Text>
                </View>
              )}
            </View>

            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => deleteItem(item.id)}
            >
              <Ionicons name="trash-outline" size={20} color={designTokens.colors.expiredRed} />
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </Animated.View>
    );
  };

  const renderCategoryFilter = (category: Category | { name: string; icon: string; color: string }) => (
    <TouchableOpacity
      key={category.name}
      style={[
        styles.categoryFilter,
        {
          backgroundColor: selectedCategory === category.name 
            ? category.color 
            : theme.bgTertiary,
          borderColor: selectedCategory === category.name 
            ? category.color 
            : theme.borderPrimary
        }
      ]}
      onPress={() => setSelectedCategory(category.name)}
    >
      <Ionicons 
        name={category.icon as any} 
        size={16} 
        color={selectedCategory === category.name 
          ? designTokens.colors.pureWhite 
          : category.color
        } 
      />
      <Text style={[
        styles.categoryFilterText,
        {
          color: selectedCategory === category.name 
            ? designTokens.colors.pureWhite 
            : theme.textPrimary
        }
      ]}>
        {category.name}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.bgPrimary }]}>
      {/* Header */}
      <LinearGradient
        colors={[theme.cardBackground, theme.bgSecondary]}
        style={[styles.header, { borderBottomColor: theme.borderPrimary }]}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[styles.backButton, { backgroundColor: theme.bgTertiary }]}
          >
            <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => setShowFilters(!showFilters)}
              style={[styles.headerButton, { backgroundColor: theme.bgTertiary }]}
            >
              <Ionicons name="options-outline" size={24} color={designTokens.colors.heroGreen} />
            </TouchableOpacity>
            {completedCount > 0 && (
              <TouchableOpacity
                onPress={clearCompleted}
                style={[styles.headerButton, { backgroundColor: theme.bgTertiary }]}
              >
                <Ionicons name="trash-outline" size={24} color={designTokens.colors.expiredRed} />
              </TouchableOpacity>
            )}
          </View>
        </View>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>🛒 Shopping List</Text>
        <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
          {completedCount}/{totalCount} items completed
        </Text>

        {/* Progress Bar */}
        <View style={[styles.progressContainer, { backgroundColor: theme.bgTertiary }]}>
          <LinearGradient
            colors={[designTokens.colors.heroGreen, designTokens.colors.primary[600]]}
            style={[
              styles.progressBar,
              { width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }
            ]}
          />
        </View>

        {/* Filters */}
        {showFilters && (
          <View style={styles.filtersContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.filtersList}>
                {renderCategoryFilter({ name: 'All', icon: 'apps', color: designTokens.colors.primary[500] })}
                {categories.map(renderCategoryFilter)}
              </View>
            </ScrollView>
            <TouchableOpacity
              style={[
                styles.toggleCompleted,
                {
                  backgroundColor: showCompleted ? designTokens.colors.heroGreen : theme.bgTertiary,
                  borderColor: showCompleted ? designTokens.colors.heroGreen : theme.borderPrimary
                }
              ]}
              onPress={() => setShowCompleted(!showCompleted)}
            >
              <Ionicons 
                name={showCompleted ? "checkmark-circle" : "checkmark-circle-outline"} 
                size={16} 
                color={showCompleted ? designTokens.colors.pureWhite : theme.textSecondary} 
              />
              <Text style={[
                styles.toggleCompletedText,
                { color: showCompleted ? designTokens.colors.pureWhite : theme.textSecondary }
              ]}>
                Show Completed
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </LinearGradient>

      {/* Mode Toggle */}
      {renderModeToggle()}

      {/* Smart Mode Content */}
      {smartMode ? (
        isPremium ? (
          // Smart Suggestions for Premium Users
          <View style={styles.smartContainer}>
            {smartLoading && (
              <View style={styles.loadingContainer}>
                <Animated.View style={{ opacity: sparkleAnimation }}>
                  <Ionicons name="sparkles" size={24} color={designTokens.colors.heroGreen} />
                </Animated.View>
                <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
                  Generating smart suggestions...
                </Text>
              </View>
            )}

            {smartSuggestions.length > 0 && (
              <View style={styles.smartSuggestionsContainer}>
                <View style={styles.smartHeader}>
                  <View style={styles.smartHeaderRow}>
                    <View style={styles.smartHeaderInfo}>
                      <Text style={[styles.smartTitle, { color: theme.textPrimary }]}>
                        🤖 Smart Suggestions
                      </Text>
                      <Text style={[styles.smartSubtitle, { color: theme.textSecondary }]}>
                        {smartSuggestions.length} AI-powered recommendations
                      </Text>
                    </View>
                    {smartSuggestions.length > 1 && (
                      <TouchableOpacity
                        style={styles.addAllButton}
                        onPress={bulkAddSuggestions}
                      >
                        <Text style={[styles.addAllText, { color: designTokens.colors.heroGreen }]}>
                          Add All
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                <FlatList
                  data={smartSuggestions}
                  renderItem={renderSmartSuggestion}
                  keyExtractor={(item) => item.id}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.suggestionsList}
                  refreshControl={
                    <RefreshControl
                      refreshing={smartLoading}
                      onRefresh={generateSmartSuggestions}
                      tintColor={theme.textSecondary}
                    />
                  }
                />
              </View>
            )}

            {!smartLoading && smartSuggestions.length === 0 && (
              <View style={styles.emptySmartContainer}>
                <LinearGradient
                  colors={[
                    `${designTokens.colors.heroGreen}08`,
                    `${designTokens.colors.ocean}05`,
                    theme.cardBackground
                  ]}
                  style={styles.emptySmartGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.emptySmartContent}>
                    {/* Professional Icon */}
                    <View style={styles.emptySmartIconContainer}>
                      <LinearGradient
                        colors={[designTokens.colors.heroGreen, designTokens.colors.green[600]]}
                        style={styles.emptySmartIconGradient}
                      >
                        <Ionicons name="bulb-outline" size={32} color="white" />
                      </LinearGradient>
                    </View>

                    {/* Title & Description */}
                    <Text style={[styles.emptySmartTitle, { color: theme.textPrimary }]}>
                      No Smart Suggestions Available
                    </Text>
                    <Text style={[styles.emptySmartSubtitle, { color: theme.textSecondary }]}>
                      Our AI needs more data to generate personalized recommendations. Add items to your fridge to unlock intelligent shopping suggestions.
                    </Text>

                    {/* Feature Pills */}
                    <View style={styles.emptySmartFeatures}>
                      <View style={[styles.featurePill, { backgroundColor: `${designTokens.colors.heroGreen}15` }]}>
                        <Ionicons name="analytics-outline" size={14} color={designTokens.colors.heroGreen} />
                        <Text style={[styles.featurePillText, { color: designTokens.colors.heroGreen }]}>
                          Usage Patterns
                        </Text>
                      </View>
                      <View style={[styles.featurePill, { backgroundColor: `${designTokens.colors.ocean}15` }]}>
                        <Ionicons name="restaurant-outline" size={14} color={designTokens.colors.ocean} />
                        <Text style={[styles.featurePillText, { color: designTokens.colors.ocean }]}>
                          Recipe Integration
                        </Text>
                      </View>
                      <View style={[styles.featurePill, { backgroundColor: `${designTokens.colors.sunset}15` }]}>
                        <Ionicons name="leaf-outline" size={14} color={designTokens.colors.sunset} />
                        <Text style={[styles.featurePillText, { color: designTokens.colors.sunset }]}>
                          Waste Prevention
                        </Text>
                      </View>
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.emptySmartActions}>
                      <TouchableOpacity
                        style={styles.primaryActionButton}
                        onPress={() => navigation.navigate('Main', { screen: 'AddItem' })}
                      >
                        <LinearGradient
                          colors={[designTokens.colors.heroGreen, designTokens.colors.green[600]]}
                          style={styles.primaryActionGradient}
                        >
                          <Ionicons name="add" size={18} color="white" />
                          <Text style={styles.primaryActionText}>Add Items to Fridge</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                      
                      <TouchableOpacity
                        style={[styles.secondaryActionButton, { borderColor: theme.borderPrimary }]}
                        onPress={() => generateSmartSuggestions()}
                      >
                        <Ionicons name="refresh" size={16} color={designTokens.colors.ocean} />
                        <Text style={[styles.secondaryActionText, { color: designTokens.colors.ocean }]}>
                          Refresh Suggestions
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {/* Help Text */}
                    <Text style={[styles.emptySmartHelpText, { color: theme.textTertiary }]}>
                      💡 The more items you track, the smarter our recommendations become
                    </Text>
                  </View>
                </LinearGradient>
              </View>
            )}
          </View>
        ) : (
          // Smart Preview for Free Users
          renderSmartPreview()
        )
      ) : (
        // Manual Mode - Regular Shopping List
        <FlatList
          data={filteredItems}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchShoppingList();
              }}
              tintColor={theme.textSecondary}
            />
          }
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🛍️</Text>
              <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>
                {selectedCategory === 'All' ? 'No items yet' : `No ${selectedCategory.toLowerCase()} items`}
              </Text>
              <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                {selectedCategory === 'All' 
                  ? 'Add your first item to start shopping'
                  : 'Try selecting a different category or add new items'
                }
              </Text>
            </View>
          )}
        />
      )}

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowAddModal(true)}
      >
        <LinearGradient
          colors={[designTokens.colors.heroGreen, designTokens.colors.green[600]]}
          style={styles.fabGradient}
        >
          <Ionicons name="add" size={24} color={designTokens.colors.pureWhite} />
        </LinearGradient>
      </TouchableOpacity>

      {/* Add Item Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.bgPrimary }]}>
          <View style={[styles.modalHeader, { backgroundColor: theme.cardBackground, borderBottomColor: theme.borderPrimary }]}>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <Text style={[styles.modalCancel, { color: designTokens.colors.expiredRed }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Add Item</Text>
            <TouchableOpacity onPress={addItem}>
              <Text style={[styles.modalSave, { color: designTokens.colors.heroGreen }]}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: theme.textPrimary }]}>Item Name</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: theme.bgTertiary, borderColor: theme.borderPrimary, color: theme.textPrimary }]}
                value={newItemName}
                onChangeText={setNewItemName}
                placeholder="Enter item name"
                placeholderTextColor={theme.textTertiary}
              />
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 2 }]}>
                <Text style={[styles.formLabel, { color: theme.textPrimary }]}>Quantity</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: theme.bgTertiary, borderColor: theme.borderPrimary, color: theme.textPrimary }]}
                  value={newItemQuantity}
                  onChangeText={setNewItemQuantity}
                  placeholder="1"
                  placeholderTextColor={theme.textTertiary}
                  keyboardType="numeric"
                />
              </View>
              <View style={[styles.formGroup, { flex: 3 }]}>
                <Text style={[styles.formLabel, { color: theme.textPrimary }]}>Unit</Text>
                <TouchableOpacity style={[styles.formInput, styles.formPicker, { backgroundColor: theme.bgTertiary, borderColor: theme.borderPrimary }]}>
                  <Text style={[styles.formPickerText, { color: theme.textPrimary }]}>{newItemUnit}</Text>
                  <Ionicons name="chevron-down" size={20} color={theme.textTertiary} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: theme.textPrimary }]}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.categoryPills}>
                  {categories.map((category) => (
                    <TouchableOpacity
                      key={category.id}
                      style={[
                        styles.categoryPill,
                        styles.categoryPillLarge,
                        {
                          backgroundColor: newItemCategory === category.name 
                            ? category.color 
                            : theme.bgTertiary,
                          borderColor: newItemCategory === category.name 
                            ? category.color 
                            : theme.borderPrimary
                        }
                      ]}
                      onPress={() => setNewItemCategory(category.name)}
                    >
                      <Ionicons 
                        name={category.icon as any} 
                        size={16} 
                        color={newItemCategory === category.name 
                          ? designTokens.colors.pureWhite 
                          : category.color
                        } 
                      />
                      <Text style={[
                        styles.categoryPillText,
                        {
                          color: newItemCategory === category.name 
                            ? designTokens.colors.pureWhite 
                            : theme.textPrimary
                        }
                      ]}>
                        {category.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: theme.textPrimary }]}>Notes (Optional)</Text>
              <TextInput
                style={[styles.formInput, styles.formTextArea, { backgroundColor: theme.bgTertiary, borderColor: theme.borderPrimary, color: theme.textPrimary }]}
                value={newItemNotes}
                onChangeText={setNewItemNotes}
                placeholder="Any special notes..."
                placeholderTextColor={theme.textTertiary}
                multiline
                numberOfLines={3}
              />
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: designTokens.colors.gray[50],
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.colors.gray[200],
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: designTokens.colors.gray[100],
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: designTokens.colors.gray[100],
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: designTokens.colors.deepCharcoal,
    fontFamily: 'Poppins',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: designTokens.colors.gray[600],
    fontFamily: 'Inter',
    marginBottom: 16,
  },
  progressContainer: {
    height: 4,
    backgroundColor: designTokens.colors.gray[200],
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
  filtersContainer: {
    marginTop: 16,
  },
  filtersList: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 20,
  },
  categoryFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  categoryFilterText: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'Inter',
  },
  toggleCompleted: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  toggleCompletedText: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'Inter',
  },
  listContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  itemCard: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  itemGradient: {
    borderWidth: 1,
    borderColor: designTokens.colors.gray[200],
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  checkboxContainer: {
    marginRight: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter',
    flex: 1,
  },
  itemDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  itemCategory: {
    fontSize: 14,
    fontFamily: 'Inter',
  },
  itemPrice: {
    fontSize: 14,
    fontFamily: 'Inter',
  },
  itemNotes: {
    fontSize: 12,
    fontStyle: 'italic',
    fontFamily: 'Inter',
  },
  deleteButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: designTokens.colors.gray[100],
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    borderRadius: 30,
    elevation: 8,
    shadowColor: designTokens.colors.heroGreen,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
  },
  fabGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    fontFamily: 'Poppins',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
    fontFamily: 'Inter',
    lineHeight: 24,
    maxWidth: 280,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: designTokens.colors.gray[50],
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.colors.gray[200],
  },
  modalCancel: {
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'Inter',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Poppins',
  },
  modalSave: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter',
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 1,
    borderColor: designTokens.colors.gray[300],
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    fontFamily: 'Inter',
  },
  formPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  formPickerText: {
    fontSize: 16,
    fontFamily: 'Inter',
  },
  formTextArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  categoryPills: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 20,
  },
  suggestionCard: {
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  suggestionGradient: {
    borderWidth: 1,
    borderColor: designTokens.colors.gray[200],
  },
  suggestionContent: {
    padding: 14,
  },
  suggestionMainRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  suggestionInfo: {
    flex: 1,
    marginRight: 12,
  },
  suggestionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  suggestionName: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter',
    flex: 1,
    marginRight: 8,
  },
  urgencyBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  suggestionMeta: {
    fontSize: 13,
    fontFamily: 'Inter',
    marginBottom: 4,
  },
  suggestionReason: {
    fontSize: 12,
    fontStyle: 'italic',
    fontFamily: 'Inter',
    lineHeight: 16,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: designTokens.colors.heroGreen,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  addButtonGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  suggestionDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 12,
    fontFamily: 'Inter',
  },
  modeToggleContainer: {
    marginTop: 16,
    marginBottom: 20,
  },
  modeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: designTokens.colors.gray[200],
  },
  modeToggleButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: designTokens.colors.gray[100],
  },
  modeToggleButtonActive: {
    backgroundColor: designTokens.colors.gray[200],
  },
  modeToggleText: {
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'Inter',
  },
  loadingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: designTokens.colors.gray[200],
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: designTokens.colors.gray[300],
  },
  bulkAddButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: designTokens.colors.gray[100],
  },
  bulkAddText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  smartPreviewContainer: {
    marginTop: 16,
    marginBottom: 20,
  },
  smartPreviewGradient: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  smartPreviewContent: {
    padding: 16,
  },
  smartPreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  smartPreviewTitle: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Poppins',
    marginRight: 8,
  },
  smartPreviewSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter',
  },
  smartFeaturesList: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  smartFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  smartFeatureText: {
    fontSize: 14,
    fontFamily: 'Inter',
  },
  smartUpgradeButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: designTokens.colors.gray[100],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  smartUpgradeText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter',
    marginRight: 8,
  },
  priorityBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiGeneratedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  aiGeneratedText: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'Inter',
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  categoryPillLarge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'Inter',
  },
  smartContainer: {
    flex: 1,
    backgroundColor: designTokens.colors.gray[50],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'Inter',
    marginTop: 12,
    textAlign: 'center',
  },
  smartSuggestionsContainer: {
    flex: 1,
  },
  smartHeader: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  smartHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  smartHeaderInfo: {
    flex: 1,
  },
  smartTitle: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Poppins',
    marginBottom: 4,
  },
  smartSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter',
  },
  addAllButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: `${designTokens.colors.heroGreen}15`,
    borderWidth: 1,
    borderColor: `${designTokens.colors.heroGreen}30`,
  },
  addAllText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  emptySmartContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptySmartGradient: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  emptySmartContent: {
    padding: 20,
  },
  emptySmartIconContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  emptySmartIconGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptySmartIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptySmartTitle: {
    fontSize: 20,
    fontWeight: '600',
    fontFamily: 'Poppins',
    marginBottom: 8,
  },
  emptySmartSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    fontFamily: 'Inter',
    lineHeight: 24,
    maxWidth: 280,
  },
  emptySmartFeatures: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
    justifyContent: 'center',
  },
  featurePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 4,
  },
  featurePillText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  emptySmartActions: {
    gap: 12,
    marginBottom: 20,
  },
  primaryActionButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: designTokens.colors.heroGreen,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryActionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 8,
  },
  primaryActionText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter',
    color: 'white',
  },
  secondaryActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  secondaryActionText: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Inter',
  },
  emptySmartHelpText: {
    fontSize: 12,
    fontFamily: 'Inter',
    textAlign: 'center',
  },
  suggestionsList: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
}); 