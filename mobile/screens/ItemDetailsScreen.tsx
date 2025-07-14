import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Platform,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '../lib/supabase';
import { useTheme } from '../contexts/ThemeContext';
import { designTokens } from '../constants/DesignTokens';

const { width: screenWidth } = Dimensions.get('window');

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

const CATEGORIES = [
  '🥬 Produce',
  '🥛 Dairy', 
  '🥩 Meat',
  '🐟 Seafood',
  '❄️ Frozen',
  '🥫 Pantry',
  '🥤 Beverages',
  '🍞 Bakery',
  '🧂 Condiments',
  '🍿 Snacks',
  '📦 Other',
];

export default function ItemDetailsScreen({ route, navigation }: any) {
  const { itemId } = route.params;
  const { theme } = useTheme();
  const [item, setItem] = useState<FridgeItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedQuantity, setEditedQuantity] = useState('');
  const [editedExpiryDate, setEditedExpiryDate] = useState(new Date());
  const [editedCategory, setEditedCategory] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));

  // Auto-refresh when screen is focused
  useFocusEffect(
    useCallback(() => {
      console.log('📱 ItemDetailsScreen focused - refreshing data');
      fetchItem();
    }, [itemId])
  );

  useEffect(() => {
    fetchItem();
  }, [itemId]);

  useEffect(() => {
    if (!loading) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [loading]);

  const fetchItem = async () => {
    try {
      const { data, error } = await supabase
        .from('items')
        .select('*, nutrition_data, storage_tips')
        .eq('id', itemId)
        .single();

      if (error) {
        console.error('Error fetching item:', error);
        Alert.alert('Error', 'Failed to load item details');
        navigation.goBack();
      } else {
        setItem(data);
        setEditedName(data.name);
        setEditedQuantity(data.quantity.toString());
        setEditedExpiryDate(new Date(data.expiry_date));
        setEditedCategory(data.category);
      }
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'Something went wrong');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const getDaysUntilExpiry = (expiryDate: string): number => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getExpiryColor = (daysUntilExpiry: number): string => {
    if (daysUntilExpiry < 0) return designTokens.colors.expiredRed;
    if (daysUntilExpiry <= 1) return designTokens.colors.alertAmber;
    if (daysUntilExpiry <= 3) return designTokens.colors.sunset;
    return designTokens.colors.heroGreen;
  };

  const getExpiryText = (days: number): string => {
    if (days < 0) return `Expired ${Math.abs(days)} day${Math.abs(days) !== 1 ? 's' : ''} ago`;
    if (days === 0) return 'Expires today';
    if (days === 1) return 'Expires tomorrow';
    return `Expires in ${days} days`;
  };

  const saveChanges = async () => {
    if (!editedName.trim()) {
      Alert.alert('Error', 'Item name cannot be empty');
      return;
    }

    if (!editedQuantity || parseInt(editedQuantity) <= 0) {
      Alert.alert('Error', 'Please enter a valid quantity');
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from('items')
        .update({
          name: editedName.trim(),
          quantity: parseInt(editedQuantity),
          expiry_date: editedExpiryDate.toISOString().split('T')[0],
          category: editedCategory,
        })
        .eq('id', itemId);

      if (error) {
        Alert.alert('Error', 'Failed to save changes');
      } else {
        setItem({
          ...item!,
          name: editedName.trim(),
          quantity: parseInt(editedQuantity),
          expiry_date: editedExpiryDate.toISOString().split('T')[0],
          category: editedCategory,
        });
        setEditing(false);
        Alert.alert('Success', 'Item updated successfully!');
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const deleteItem = async () => {
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
                Alert.alert('Success', 'Item deleted successfully', [
                  { text: 'OK', onPress: () => navigation.goBack() }
                ]);
              }
            } catch (error) {
              Alert.alert('Error', 'Something went wrong');
            }
          }
        }
      ]
    );
  };

  const markAsUsed = async () => {
    try {
      const { error } = await supabase
        .from('items')
        .update({ status: 'used' })
        .eq('id', itemId);

      if (error) {
        Alert.alert('Error', 'Failed to mark item as used');
      } else {
        Alert.alert('Success', 'Item marked as used! 🎉', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong');
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setEditedExpiryDate(selectedDate);
    }
  };

  if (loading || !item) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.bgPrimary }]}>
        <StatusBar barStyle="dark-content" backgroundColor={theme.bgPrimary} />
        <View style={styles.loadingContainer}>
          <View style={[styles.loadingCard, { backgroundColor: theme.cardBackground }]}>
            <Ionicons name="time-outline" size={32} color={theme.textTertiary} />
            <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
              Loading item details...
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const daysUntilExpiry = getDaysUntilExpiry(item.expiry_date);
  const expiryColor = getExpiryColor(daysUntilExpiry);
  const hasNutrition = item.nutrition_data && Object.keys(item.nutrition_data).length > 1;

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
        
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Item Details</Text>
          {hasNutrition && (
            <View style={styles.nutritionBadge}>
              <Ionicons name="nutrition" size={12} color="white" />
              <Text style={styles.nutritionBadgeText}>Nutrition</Text>
            </View>
          )}
        </View>

        <View style={styles.headerActions}>
          {editing ? (
            <>
              <TouchableOpacity
                style={[styles.headerButton, styles.cancelButton]}
                onPress={() => setEditing(false)}
              >
                <Ionicons name="close" size={20} color={theme.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={saveChanges}
              >
                <LinearGradient
                  colors={[designTokens.colors.heroGreen, designTokens.colors.green[600]]}
                  style={styles.saveButtonGradient}
                >
                  <Ionicons name="checkmark" size={20} color="white" />
                </LinearGradient>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => setEditing(true)}
            >
              <Ionicons name="create-outline" size={20} color={designTokens.colors.heroGreen} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          {/* Main Item Card */}
          <View style={[styles.itemCard, { backgroundColor: theme.cardBackground }]}>
            {/* Item Header */}
            <View style={styles.itemHeader}>
              <View style={styles.itemNameSection}>
                <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Item Name</Text>
                {editing ? (
                  <TextInput
                    style={[styles.nameInput, { 
                      backgroundColor: theme.bgTertiary, 
                      borderColor: theme.borderSecondary, 
                      color: theme.textPrimary 
                    }]}
                    value={editedName}
                    onChangeText={setEditedName}
                    placeholder="Enter item name"
                    placeholderTextColor={theme.textTertiary}
                  />
                ) : (
                  <Text style={[styles.itemName, { color: theme.textPrimary }]}>{item.name}</Text>
                )}
              </View>

              <View style={[styles.expiryBadge, { backgroundColor: expiryColor }]}>
                <Text style={styles.expiryText}>{getExpiryText(daysUntilExpiry)}</Text>
              </View>
            </View>

            {/* Details Grid */}
            <View style={styles.detailsGrid}>
              {/* Category */}
              <View style={styles.detailSection}>
                <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Category</Text>
                {editing ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                    <View style={styles.categoryRow}>
                      {CATEGORIES.map((category) => (
                        <TouchableOpacity
                          key={category}
                          style={[
                            styles.categoryChip,
                            { 
                              backgroundColor: editedCategory === category ? designTokens.colors.heroGreen : theme.bgTertiary,
                              borderColor: editedCategory === category ? designTokens.colors.heroGreen : theme.borderSecondary
                            }
                          ]}
                          onPress={() => setEditedCategory(category)}
                        >
                          <Text 
                            style={[
                              styles.categoryChipText,
                              { 
                                color: editedCategory === category ? 'white' : theme.textPrimary
                              }
                            ]}
                            numberOfLines={1}
                          >
                            {category}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                ) : (
                  <Text style={[styles.detailValue, { color: theme.textPrimary }]}>{item.category}</Text>
                )}
              </View>

              {/* Quantity and Expiry Row */}
              <View style={styles.detailRow}>
                <View style={styles.detailHalf}>
                  <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Quantity</Text>
                  {editing ? (
                    <TextInput
                      style={[styles.quantityInput, { 
                        backgroundColor: theme.bgTertiary, 
                        borderColor: theme.borderSecondary, 
                        color: theme.textPrimary 
                      }]}
                      value={editedQuantity}
                      onChangeText={setEditedQuantity}
                      placeholder="1"
                      placeholderTextColor={theme.textTertiary}
                      keyboardType="numeric"
                    />
                  ) : (
                    <Text style={[styles.detailValue, { color: theme.textPrimary }]}>{item.quantity}x</Text>
                  )}
                </View>

                <View style={styles.detailHalf}>
                  <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Expiry Date</Text>
                  {editing ? (
                    <TouchableOpacity
                      style={[styles.dateSelector, { backgroundColor: theme.bgTertiary, borderColor: theme.borderSecondary }]}
                      onPress={() => setShowDatePicker(true)}
                    >
                      <Text style={[styles.dateText, { color: theme.textPrimary }]}>
                        {editedExpiryDate.toLocaleDateString()}
                      </Text>
                      <Ionicons name="calendar-outline" size={18} color={theme.textSecondary} />
                    </TouchableOpacity>
                  ) : (
                    <Text style={[styles.detailValue, { color: theme.textPrimary }]}>
                      {new Date(item.expiry_date).toLocaleDateString()}
                    </Text>
                  )}
                </View>
              </View>
            </View>

            {/* Item Meta */}
            <View style={[styles.metaSection, { borderTopColor: theme.borderSecondary }]}>
              <Text style={[styles.metaText, { color: theme.textTertiary }]}>
                Added on {new Date(item.created_at).toLocaleDateString()}
              </Text>
            </View>
          </View>

          {/* Storage Tips */}
          {item.storage_tips && (
            <View style={[styles.tipsCard, { backgroundColor: theme.cardBackground }]}>
              <View style={styles.tipsHeader}>
                <Ionicons name="bulb-outline" size={20} color={designTokens.colors.heroGreen} />
                <Text style={[styles.tipsTitle, { color: theme.textPrimary }]}>Storage Tips</Text>
              </View>
              <Text style={[styles.tipsText, { color: theme.textSecondary }]}>{item.storage_tips}</Text>
            </View>
          )}

          {/* Nutrition Information Card */}
          {hasNutrition && item.nutrition_data && (
            <View style={[styles.nutritionCard, { backgroundColor: theme.cardBackground }]}>
              <View style={styles.nutritionHeader}>
                <View style={styles.nutritionTitle}>
                  <Ionicons name="nutrition" size={20} color={designTokens.colors.heroGreen} />
                  <Text style={[styles.nutritionTitleText, { color: theme.textPrimary }]}>Nutrition Facts</Text>
                </View>
                <Text style={[styles.nutritionSubtitle, { color: theme.textSecondary }]}>per 100g</Text>
              </View>

              <View style={styles.nutritionGrid}>
                {item.nutrition_data.energy_kcal && (
                  <View style={[styles.nutritionItem, { backgroundColor: theme.bgTertiary }]}>
                    <Text style={[styles.nutritionValue, { color: designTokens.colors.heroGreen }]}>
                      {Math.round(item.nutrition_data.energy_kcal)}
                    </Text>
                    <Text style={[styles.nutritionLabel, { color: theme.textSecondary }]}>calories</Text>
                  </View>
                )}
                {item.nutrition_data.proteins_g && typeof item.nutrition_data.proteins_g === 'number' && (
                  <View style={[styles.nutritionItem, { backgroundColor: theme.bgTertiary }]}>
                    <Text style={[styles.nutritionValue, { color: designTokens.colors.heroGreen }]}>
                      {item.nutrition_data.proteins_g.toFixed(1)}g
                    </Text>
                    <Text style={[styles.nutritionLabel, { color: theme.textSecondary }]}>protein</Text>
                  </View>
                )}
                {item.nutrition_data.carbohydrates_g && typeof item.nutrition_data.carbohydrates_g === 'number' && (
                  <View style={[styles.nutritionItem, { backgroundColor: theme.bgTertiary }]}>
                    <Text style={[styles.nutritionValue, { color: designTokens.colors.heroGreen }]}>
                      {item.nutrition_data.carbohydrates_g.toFixed(1)}g
                    </Text>
                    <Text style={[styles.nutritionLabel, { color: theme.textSecondary }]}>carbs</Text>
                  </View>
                )}
                {item.nutrition_data.fat_g && typeof item.nutrition_data.fat_g === 'number' && (
                  <View style={[styles.nutritionItem, { backgroundColor: theme.bgTertiary }]}>
                    <Text style={[styles.nutritionValue, { color: designTokens.colors.heroGreen }]}>
                      {item.nutrition_data.fat_g.toFixed(1)}g
                    </Text>
                    <Text style={[styles.nutritionLabel, { color: theme.textSecondary }]}>fat</Text>
                  </View>
                )}
              </View>

              {/* Additional Nutrition Details */}
              {(item.nutrition_data.fiber_g || item.nutrition_data.sodium_mg || item.nutrition_data.sugars_g) && (
                <View style={[styles.additionalNutrition, { borderTopColor: theme.borderSecondary }]}>
                  {item.nutrition_data.fiber_g && typeof item.nutrition_data.fiber_g === 'number' && (
                    <View style={styles.nutritionRow}>
                      <Text style={[styles.nutritionRowLabel, { color: theme.textSecondary }]}>Fiber</Text>
                      <Text style={[styles.nutritionRowValue, { color: theme.textPrimary }]}>
                        {item.nutrition_data.fiber_g.toFixed(1)}g
                      </Text>
                    </View>
                  )}
                  {item.nutrition_data.sugars_g && typeof item.nutrition_data.sugars_g === 'number' && (
                    <View style={styles.nutritionRow}>
                      <Text style={[styles.nutritionRowLabel, { color: theme.textSecondary }]}>Sugars</Text>
                      <Text style={[styles.nutritionRowValue, { color: theme.textPrimary }]}>
                        {item.nutrition_data.sugars_g.toFixed(1)}g
                      </Text>
                    </View>
                  )}
                  {item.nutrition_data.sodium_mg && (
                    <View style={styles.nutritionRow}>
                      <Text style={[styles.nutritionRowLabel, { color: theme.textSecondary }]}>Sodium</Text>
                      <Text style={[styles.nutritionRowValue, { color: theme.textPrimary }]}>
                        {Math.round(item.nutrition_data.sodium_mg)}mg
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          )}
        </Animated.View>
      </ScrollView>

      {/* Bottom Action Buttons */}
      {!editing && (
        <View style={[styles.bottomContainer, { backgroundColor: theme.bgPrimary }]}>
          <TouchableOpacity
            style={styles.primaryAction}
            onPress={markAsUsed}
          >
            <LinearGradient
              colors={[designTokens.colors.heroGreen, designTokens.colors.green[600]]}
              style={styles.actionButtonGradient}
            >
              <Ionicons name="checkmark-circle" size={20} color="white" />
              <Text style={styles.primaryActionText}>Mark as Used</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryAction}
            onPress={deleteItem}
          >
            <LinearGradient
              colors={[designTokens.colors.expiredRed, '#d73027']}
              style={styles.actionButtonGradient}
            >
              <Ionicons name="trash-outline" size={20} color="white" />
              <Text style={styles.secondaryActionText}>Delete Item</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={editedExpiryDate}
          mode="date"
          display="default"
          onChange={onDateChange}
          minimumDate={new Date()}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: designTokens.colors.gray[50],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingCard: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    gap: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
  },

  // Header
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
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  nutritionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: designTokens.colors.heroGreen,
    gap: 4,
  },
  nutritionBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'white',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  cancelButton: {
    backgroundColor: designTokens.colors.gray[200],
  },
  editButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
    backgroundColor: designTokens.colors.green[100],
  },
  saveButton: {
    borderRadius: 22,
    overflow: 'hidden',
  },
  saveButtonGradient: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Content
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  content: {
    gap: 20,
  },

  // Item Card
  itemCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  itemHeader: {
    marginBottom: 24,
  },
  itemNameSection: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  itemName: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 30,
  },
  nameInput: {
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 18,
    fontWeight: '600',
  },
  expiryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  expiryText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'white',
  },

  // Details
  detailsGrid: {
    gap: 20,
  },
  detailSection: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    gap: 16,
  },
  detailHalf: {
    flex: 1,
    gap: 8,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  quantityInput: {
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '500',
  },
  dateSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '500',
  },

  // Category selection
  categoryScroll: {
    marginTop: 4,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 4,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Meta section
  metaSection: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '500',
  },

  // Tips card
  tipsCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  tipsText: {
    fontSize: 14,
    lineHeight: 20,
  },

  // Nutrition card
  nutritionCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  nutritionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  nutritionTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nutritionTitleText: {
    fontSize: 18,
    fontWeight: '700',
  },
  nutritionSubtitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  nutritionGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  nutritionItem: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    minHeight: 60,
    justifyContent: 'center',
  },
  nutritionValue: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  nutritionLabel: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },
  additionalNutrition: {
    borderTopWidth: 1,
    paddingTop: 16,
    gap: 8,
  },
  nutritionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  nutritionRowLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  nutritionRowValue: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Bottom actions
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    gap: 12,
  },
  primaryAction: {
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  secondaryAction: {
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 8,
  },
  primaryActionText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
  },
  secondaryActionText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
  },
}); 