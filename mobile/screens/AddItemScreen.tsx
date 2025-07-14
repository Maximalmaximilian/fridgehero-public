import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Platform,
  Animated,
  SafeAreaView,
  StatusBar,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Camera } from 'expo-camera';
// Conditional import for barcode scanner with error handling
let BarCodeScanner: any = null;
let barcodeAvailable = false;
try {
  const barcodeScannerModule = require('expo-barcode-scanner');
  BarCodeScanner = barcodeScannerModule.BarCodeScanner;
  barcodeAvailable = true;
} catch (error) {
  console.log('📱 Barcode scanner not available');
}
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useHousehold } from '../contexts/HouseholdContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase';
import { designTokens } from '../constants/DesignTokens';
import { notificationService } from '../lib/notifications';
import { stripeService } from '../lib/stripe';
import { barcodeService, type ProductData } from '../lib/barcode-service';
import { Picker } from '@react-native-picker/picker';
import { BlurView } from 'expo-blur';
import ProfileAvatar from '../components/ProfileAvatar';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const CATEGORIES = [
  'Select Category',
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

export default function AddItemScreen({ navigation, route }: any) {
  const [itemName, setItemName] = useState('');
  const [category, setCategory] = useState('');
  const [expiredIn, setExpiredIn] = useState('');
  const [customExpiry, setCustomExpiry] = useState('');
  const [showCustomExpiry, setShowCustomExpiry] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductData | null>(null);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [showPermissionScreen, setShowPermissionScreen] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [checkingPremium, setCheckingPremium] = useState(true);
  const [currentItemCount, setCurrentItemCount] = useState(0);
  const [loadingItemCount, setLoadingItemCount] = useState(true);

  const { user } = useAuth();
  const { households, selectedHousehold, selectHousehold } = useHousehold();
  const { theme } = useTheme();

  const expiryOptions = [
    { label: 'Select expiry time', value: '' },
    { label: '1 day', value: '1' },
    { label: '3 days', value: '3' },
    { label: '1 week', value: '7' },
    { label: '2 weeks', value: '14' },
    { label: '1 month', value: '30' },
    { label: '3 months', value: '90' },
    { label: '6 months', value: '180' },
    { label: 'Custom', value: 'custom' },
  ];

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    if (user) {
      checkPremiumStatus();
    }
  }, [user]);

  useEffect(() => {
    if (selectedHousehold) {
      checkCurrentItemCount();
    }
  }, [selectedHousehold]);

  // Refresh item count whenever the screen is focused
  useFocusEffect(
    React.useCallback(() => {
      if (selectedHousehold) {
        console.log('📱 AddItemScreen focused - refreshing item count and premium status');
        checkCurrentItemCount();
      }
      if (user) {
        checkPremiumStatus();
      }
    }, [selectedHousehold, user])
  );

  const checkCurrentItemCount = async () => {
    if (!selectedHousehold) {
      setLoadingItemCount(false);
      return;
    }

    try {
      setLoadingItemCount(true);
      const { count, error } = await supabase
        .from('items')
        .select('*', { count: 'exact', head: true })
        .eq('household_id', selectedHousehold.household_id)
        .eq('status', 'active');

      if (error) {
        console.error('Error checking item count:', error);
        setCurrentItemCount(0);
      } else {
        setCurrentItemCount(count || 0);
        console.log('📱 Current household item count:', count);
      }
    } catch (error) {
      console.error('Error checking item count:', error);
      setCurrentItemCount(0);
    } finally {
      setLoadingItemCount(false);
    }
  };

  const checkPremiumStatus = async () => {
    try {
      const status = await stripeService.getSubscriptionStatus();
      setIsPremium(status.isActive);
      console.log('📱 AddItem premium status:', status.isActive);
    } catch (error) {
      console.error('Error checking premium status:', error);
      setIsPremium(false);
    } finally {
      setCheckingPremium(false);
    }
  };

  // Handle selected product from FoodSearchScreen
  useEffect(() => {
    if (route.params?.selectedProduct) {
      const product = route.params.selectedProduct;
      console.log('📦 Received selected product:', product.name);
      
      setSelectedProduct(product);
      setItemName(product.name);
      if (product.category) {
        setCategory(product.category);
      }
      
      // Clear the route params to prevent re-triggering
      navigation.setParams({ selectedProduct: null });
    }
  }, [route.params?.selectedProduct]);

  const getCameraPermissions = async () => {
    // Check premium restrictions for free users
    if (!isPremium) {
      Alert.alert(
        '🔒 Barcode Scanner - Premium Feature',
        'Barcode scanning with nutrition data is a premium feature. Upgrade to Premium to instantly add items by scanning barcodes.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Upgrade to Premium', 
            onPress: () => navigation.navigate('Premium', { source: 'barcode_scanner' })
          }
        ]
      );
      return;
    }

    if (!barcodeAvailable) {
      Alert.alert('Camera Not Available', 'Barcode scanning is not available on this device.');
      return;
    }

    // Show permission screen while checking
    setShowPermissionScreen(true);

    try {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');

      if (status === 'granted') {
        setShowPermissionScreen(false);
        setScanning(true);
      } else {
        // Keep showing permission screen so user can try again
        Alert.alert('Permission Denied', 'Camera permission is required to scan barcodes.');
      }
    } catch (error) {
      console.error('Permission request error:', error);
      setShowPermissionScreen(false);
      Alert.alert('Error', 'Failed to request camera permission.');
    }
  };

  const handleBarcodeScanned = async ({ type, data }: any) => {
    setScanning(false);
    setIsLoading(true);

    try {
      console.log('📱 Barcode scanned:', data);
      const productData = await barcodeService.getProductFromBarcode(data);
      
      if (productData) {
        setSelectedProduct(productData);
        setItemName(productData.name);
        if (productData.category) {
          setCategory(productData.category);
        }
        if (productData.expiry_estimate_days) {
          setExpiredIn(productData.expiry_estimate_days.toString());
        }
        Alert.alert('Product Found!', `Added "${productData.name}" to your list.`);
      } else {
        Alert.alert('Product Not Found', 'We couldn\'t find this product in our database. You can add it manually.');
      }
    } catch (error) {
      console.error('Barcode lookup error:', error);
      Alert.alert('Error', 'Something went wrong while looking up the product.');
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToSearch = () => {
    // Check premium restrictions for free users
    if (!isPremium) {
      Alert.alert(
        '🔒 Nutrition Data - Premium Feature',
        'Searching for nutrition data from food databases is a premium feature. Upgrade to Premium to access detailed nutrition information.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Upgrade to Premium', 
            onPress: () => navigation.navigate('Premium', { source: 'nutrition_search' })
          }
        ]
      );
      return;
    }

    navigation.navigate('FoodSearch');
  };

  const clearSelectedProduct = () => {
    setSelectedProduct(null);
    setItemName('');
    setCategory('');
    setExpiredIn('');
  };

  const addItem = async () => {
    if (!itemName.trim()) {
      Alert.alert('Error', 'Please enter an item name');
      return;
    }

    if (!category) {
      Alert.alert('Error', 'Please select a category');
      return;
    }

    let finalExpiredIn = expiredIn;
    if (expiredIn === 'custom') {
      if (!customExpiry || isNaN(parseInt(customExpiry))) {
        Alert.alert('Error', 'Please enter a valid number of days for custom expiry');
        return;
      }
      finalExpiredIn = customExpiry;
    }

    if (!finalExpiredIn) {
      Alert.alert('Error', 'Please select an expiry time');
      return;
    }

    if (!selectedHousehold) {
      Alert.alert('Error', 'Please select a household');
      return;
    }

    // Check free tier item limit (20 items)
    if (!isPremium && currentItemCount >= 20) {
      Alert.alert(
        '🔒 Item Limit Reached - Premium Feature',
        `Free users can only have 20 items per household. You currently have ${currentItemCount} items.\n\nUpgrade to Premium for unlimited items and more features!`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Upgrade to Premium', 
            onPress: () => navigation.navigate('Premium', { source: 'item_limit' })
          }
        ]
      );
      return;
    }

    setIsLoading(true);

    try {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + parseInt(finalExpiredIn));

      const itemData: any = {
        name: itemName.trim(),
        category,
        expiry_date: expiryDate.toISOString().split('T')[0], // Format as YYYY-MM-DD
        quantity: 1,
        household_id: selectedHousehold.household_id,
        added_by: user?.id,
        status: 'active',
        notes: null,
        barcode: null,
      };

      // Add nutrition data if available from selected product
      if (selectedProduct?.nutrition) {
        itemData.nutrition_data = selectedProduct.nutrition;
      }

      // Add barcode if from scanned product
      if (selectedProduct?.barcode) {
        itemData.barcode = selectedProduct.barcode;
      }

      const { error } = await supabase.from('items').insert([itemData]);

      if (error) {
        console.error('Error adding item:', error);
        Alert.alert('Error', 'Failed to add item to your fridge');
        return;
      }

      Alert.alert('Success', 'Item added to your fridge!', [
        {
          text: 'OK',
          onPress: () => {
            // Reset form
            setItemName('');
            setCategory('');
            setExpiredIn('');
            setCustomExpiry('');
            setShowCustomExpiry(false);
            setSelectedProduct(null);
            // Update item count after successful addition
            checkCurrentItemCount();
            // Navigate back
            navigation.goBack();
          },
        },
      ]);
    } catch (error) {
      console.error('Error adding item:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Show permission screen only when explicitly requested
  if (showPermissionScreen) {
    return (
      <SafeAreaView style={[styles.centerContainer, { backgroundColor: theme.bgPrimary }]}>
        <StatusBar barStyle="dark-content" backgroundColor={theme.bgPrimary} />
        <Ionicons name="camera-outline" size={64} color={theme.textTertiary} />
        <Text style={[styles.permissionTitle, { color: theme.textPrimary }]}>
          Camera Access Required
        </Text>
        <Text style={[styles.permissionText, { color: theme.textSecondary }]}>
          Allow camera access to scan barcodes for quick item addition
        </Text>
        <View style={styles.permissionButtons}>
          <TouchableOpacity
            style={[styles.permissionButton, styles.secondaryButton]}
            onPress={() => setShowPermissionScreen(false)}
          >
            <Text style={[styles.secondaryButtonText, { color: theme.textPrimary }]}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={getCameraPermissions}
          >
            <LinearGradient
              colors={[designTokens.colors.heroGreen, designTokens.colors.green[600]]}
              style={styles.permissionButtonGradient}
            >
              <Text style={styles.permissionButtonText}>Grant Permission</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (scanning) {
    return (
      <View style={styles.scannerContainer}>
        <StatusBar barStyle="light-content" backgroundColor="black" />
        {barcodeAvailable && BarCodeScanner && (
          <BarCodeScanner
            onBarcodeScanned={handleBarcodeScanned}
            style={StyleSheet.absoluteFillObject}
            barCodeTypes={[BarCodeScanner.Constants.BarCodeType.ean13, BarCodeScanner.Constants.BarCodeType.ean8]}
          />
        )}
        
        {/* Scanner Overlay */}
        <View style={styles.scannerOverlay}>
          <View style={styles.scannerHeader}>
            <TouchableOpacity
              style={styles.scannerCloseButton}
              onPress={() => setScanning(false)}
            >
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.scannerTitle}>Scan Barcode</Text>
            <View style={styles.scannerSpacer} />
          </View>
          
          <View style={styles.scannerFrame}>
            <View style={styles.scannerCorner} />
            <View style={[styles.scannerCorner, styles.scannerCornerTR]} />
            <View style={[styles.scannerCorner, styles.scannerCornerBL]} />
            <View style={[styles.scannerCorner, styles.scannerCornerBR]} />
          </View>
          
          <View style={styles.scannerBottom}>
            <Text style={styles.scannerInstructions}>
              Position the barcode within the frame
            </Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bgPrimary }]}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.bgPrimary} />
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.bgPrimary, borderBottomColor: theme.borderPrimary }]}>
        <ProfileAvatar 
          size={44} 
          onPress={() => navigation.navigate('AccountDetails')}
          isPremium={isPremium}
        />
        
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Add Item</Text>
          {!loadingItemCount && selectedHousehold && (
            <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
              {isPremium 
                ? `${currentItemCount} items • Premium ✨`
                : `${currentItemCount}/20 items ${currentItemCount >= 18 ? '• Almost at limit!' : ''}`
              }
            </Text>
          )}
        </View>
        
        <TouchableOpacity
          style={[styles.headerButton, !isPremium && styles.lockedButton]}
          onPress={getCameraPermissions}
        >
          <Ionicons 
            name={!isPremium ? "lock-closed" : "camera"} 
            size={24} 
            color={!isPremium ? designTokens.colors.gray[400] : designTokens.colors.heroGreen} 
          />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        <Animated.View style={[styles.formContainer, { opacity: fadeAnim }]}>
          
          {/* Item Limit Warning for Free Users */}
          {!isPremium && currentItemCount >= 17 && currentItemCount < 20 && (
            <View style={[styles.limitWarning, { backgroundColor: designTokens.colors.amber[50], borderColor: designTokens.colors.amber[200] }]}>
              <View style={styles.limitWarningContent}>
                <Ionicons name="warning" size={20} color={designTokens.colors.amber[600]} />
                <View style={styles.limitWarningText}>
                  <Text style={[styles.limitWarningTitle, { color: designTokens.colors.amber[800] }]}>
                    ⚠️ Approaching Item Limit
                  </Text>
                  <Text style={[styles.limitWarningSubtitle, { color: designTokens.colors.amber[700] }]}>
                    {20 - currentItemCount} items remaining. Upgrade to Premium for unlimited items.
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.upgradeButton, { backgroundColor: designTokens.colors.heroGreen }]}
                onPress={() => navigation.navigate('Premium', { source: 'item_limit_warning' })}
              >
                <Text style={styles.upgradeButtonText}>Upgrade</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Selected Product Card */}
          {selectedProduct && (
            <View style={[styles.selectedProductCard, { backgroundColor: theme.cardBackground, borderColor: designTokens.colors.heroGreen }]}>
              <View style={styles.selectedProductHeader}>
                <View style={styles.selectedProductInfo}>
                  <Text style={[styles.selectedProductName, { color: theme.textPrimary }]}>
                    ✅ {selectedProduct.name}
                  </Text>
                  {selectedProduct.brand && (
                    <Text style={[styles.selectedProductBrand, { color: theme.textSecondary }]}>
                      {selectedProduct.brand}
                    </Text>
                  )}
                  <View style={[styles.selectedProductSource, {
                    backgroundColor: selectedProduct.source === 'openfoodfacts' 
                      ? designTokens.colors.green[100] 
                      : designTokens.colors.primary[100]
                  }]}>
                    <Text style={[styles.selectedProductSourceText, {
                      color: selectedProduct.source === 'openfoodfacts' 
                        ? designTokens.colors.green[700] 
                        : designTokens.colors.primary[700]
                    }]}>
                      From {selectedProduct.source === 'openfoodfacts' ? 'OpenFoodFacts' : 
                            selectedProduct.source === 'usda' ? 'USDA' : 'Database'}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.clearProductButton}
                  onPress={clearSelectedProduct}
                >
                  <Ionicons name="close-circle" size={24} color={theme.textTertiary} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Search Section */}
          <View style={[styles.inputSection, { backgroundColor: theme.cardBackground }]}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
              Find or Add Item
            </Text>
            
            <TouchableOpacity
              style={[styles.searchButton, { borderColor: theme.borderSecondary }, !isPremium && styles.lockedSearchButton]}
              onPress={navigateToSearch}
            >
              <Ionicons 
                name={!isPremium ? "lock-closed" : "search"} 
                size={20} 
                color={!isPremium ? designTokens.colors.gray[400] : designTokens.colors.heroGreen} 
              />
              <Text style={[styles.searchButtonText, { color: theme.textSecondary }]}>
                {!isPremium 
                  ? '🔒 Nutrition data search (Premium)' 
                  : 'Search food database for nutrition info'
                }
              </Text>
              <Ionicons 
                name="arrow-forward" 
                size={16} 
                color={!isPremium ? designTokens.colors.gray[400] : theme.textTertiary} 
              />
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={[styles.dividerLine, { backgroundColor: theme.borderSecondary }]} />
              <Text style={[styles.dividerText, { color: theme.textTertiary, backgroundColor: theme.cardBackground }]}>
                or enter manually
              </Text>
              <View style={[styles.dividerLine, { backgroundColor: theme.borderSecondary }]} />
            </View>

            <View style={[styles.inputContainer, { borderColor: theme.borderSecondary }]}>
              <Ionicons name="nutrition-outline" size={20} color={theme.textTertiary} />
              <TextInput
                style={[styles.textInput, { color: theme.textPrimary }]}
                value={itemName}
                onChangeText={setItemName}
                placeholder="Item name"
                placeholderTextColor={theme.textTertiary}
              />
            </View>
          </View>

          {/* Category Section */}
          <View style={[styles.inputSection, { backgroundColor: theme.cardBackground }]}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
              Category
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
              <View style={styles.categoryRow}>
                {CATEGORIES.slice(1).map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryChip,
                      { 
                        backgroundColor: category === cat ? designTokens.colors.heroGreen : theme.bgTertiary,
                        borderColor: category === cat ? designTokens.colors.heroGreen : theme.borderSecondary
                      }
                    ]}
                    onPress={() => setCategory(cat)}
                  >
                    <Text
                      style={[
                        styles.categoryText,
                        { 
                          color: category === cat ? 'white' : theme.textPrimary
                        }
                      ]}
                      numberOfLines={1}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Expiry Section */}
          <View style={[styles.inputSection, { backgroundColor: theme.cardBackground }]}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
              Expires In
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.expiryScroll}>
              <View style={styles.expiryRow}>
                {expiryOptions.slice(1).map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.expiryChip,
                      { 
                        backgroundColor: expiredIn === option.value ? designTokens.colors.heroGreen : theme.bgTertiary,
                        borderColor: expiredIn === option.value ? designTokens.colors.heroGreen : theme.borderSecondary
                      }
                    ]}
                    onPress={() => {
                      setExpiredIn(option.value);
                      setShowCustomExpiry(option.value === 'custom');
                    }}
                  >
                    <Text
                      style={[
                        styles.expiryText,
                        { 
                          color: expiredIn === option.value ? 'white' : theme.textPrimary
                        }
                      ]}
                      numberOfLines={1}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {showCustomExpiry && (
              <View style={[styles.inputContainer, { borderColor: theme.borderSecondary, marginTop: 12 }]}>
                <Ionicons name="calendar-outline" size={20} color={theme.textTertiary} />
                <TextInput
                  style={[styles.textInput, { color: theme.textPrimary }]}
                  value={customExpiry}
                  onChangeText={setCustomExpiry}
                  placeholder="Number of days"
                  placeholderTextColor={theme.textTertiary}
                  keyboardType="numeric"
                />
              </View>
            )}
          </View>
        </Animated.View>
      </ScrollView>

      {/* Bottom Button */}
      <View style={[styles.bottomContainer, { backgroundColor: theme.bgPrimary }]}>
        <TouchableOpacity
          style={[
            styles.addButton, 
            { opacity: isLoading ? 0.7 : 1 },
            (!isPremium && currentItemCount >= 20) && styles.disabledButton
          ]}
          onPress={addItem}
          disabled={isLoading || (!isPremium && currentItemCount >= 20)}
        >
          <LinearGradient
            colors={(!isPremium && currentItemCount >= 20) 
              ? [designTokens.colors.gray[400], designTokens.colors.gray[500]]
              : [designTokens.colors.heroGreen, designTokens.colors.green[600]]
            }
            style={styles.addButtonGradient}
          >
            {isLoading ? (
              <Text style={styles.addButtonText}>Adding Item...</Text>
            ) : (!isPremium && currentItemCount >= 20) ? (
              <>
                <Ionicons name="lock-closed" size={20} color="white" />
                <Text style={styles.addButtonText}>Item Limit Reached</Text>
              </>
            ) : (
              <>
                <Ionicons name="add" size={20} color="white" />
                <Text style={styles.addButtonText}>Add to Fridge</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: designTokens.colors.gray[50],
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: designTokens.colors.deepCharcoal,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    color: designTokens.colors.gray[600],
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  permissionButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  permissionButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  permissionButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
  },
  permissionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  secondaryButton: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: designTokens.colors.gray[300],
    backgroundColor: 'transparent',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
  },

  // Scanner
  scannerContainer: {
    flex: 1,
    backgroundColor: 'black',
  },
  scannerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  scannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  scannerCloseButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  scannerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
    textAlign: 'center',
  },
  scannerSpacer: {
    width: 44,
  },
  scannerFrame: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 60,
    position: 'relative',
  },
  scannerCorner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderWidth: 3,
    borderColor: 'white',
    top: -2,
    left: -2,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  scannerCornerTR: {
    top: -2,
    right: -2,
    left: 'auto',
    borderLeftWidth: 0,
    borderRightWidth: 3,
    borderBottomWidth: 0,
  },
  scannerCornerBL: {
    bottom: -2,
    left: -2,
    top: 'auto',
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomWidth: 3,
  },
  scannerCornerBR: {
    bottom: -2,
    right: -2,
    top: 'auto',
    left: 'auto',
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderRightWidth: 3,
    borderBottomWidth: 3,
  },
  scannerBottom: {
    paddingHorizontal: 20,
    paddingVertical: 30,
    alignItems: 'center',
  },
  scannerInstructions: {
    fontSize: 16,
    color: 'white',
    textAlign: 'center',
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

  // Content
  scrollContainer: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  formContainer: {
    gap: 24,
  },
  
  // Selected product card
  selectedProductCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
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
  selectedProductHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedProductInfo: {
    flex: 1,
  },
  selectedProductName: {
    fontSize: 16,
    fontWeight: '600',
    color: designTokens.colors.deepCharcoal,
    marginBottom: 4,
  },
  selectedProductBrand: {
    fontSize: 14,
    color: designTokens.colors.gray[500],
    marginBottom: 8,
  },
  selectedProductSource: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  selectedProductSourceText: {
    fontSize: 12,
    fontWeight: '600',
  },
  clearProductButton: {
    padding: 4,
  },

  // Input section
  inputSection: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: designTokens.colors.gray[700],
    marginBottom: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: designTokens.colors.gray[50],
    borderWidth: 2,
    borderColor: designTokens.colors.gray[200],
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: designTokens.colors.deepCharcoal,
    paddingVertical: 0,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: designTokens.colors.gray[200],
  },
  dividerText: {
    fontSize: 14,
    color: designTokens.colors.gray[500],
    paddingHorizontal: 12,
  },

  // Search button
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 2,
    borderColor: designTokens.colors.gray[200],
    borderRadius: 12,
    gap: 8,
  },
  searchButtonText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: designTokens.colors.deepCharcoal,
  },

  // Category selection
  categoryScroll: {
    marginTop: 8,
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
    minWidth: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Expiry selection
  expiryScroll: {
    marginTop: 8,
  },
  expiryRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 4,
  },
  expiryChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
    minWidth: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expiryText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Bottom button
  bottomContainer: {
    padding: 20,
  },
  addButton: {
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
  addButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 8,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
  },

  // Locked button
  lockedButton: {
    backgroundColor: designTokens.colors.gray[100],
  },

  // Locked search button
  lockedSearchButton: {
    backgroundColor: designTokens.colors.gray[100],
  },

  // Item Limit Warning
  limitWarning: {
    padding: 16,
    borderWidth: 2,
    borderColor: designTokens.colors.amber[200],
    borderRadius: 12,
    marginBottom: 20,
  },
  limitWarningContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  limitWarningText: {
    flexDirection: 'column',
  },
  limitWarningTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: designTokens.colors.amber[800],
  },
  limitWarningSubtitle: {
    fontSize: 14,
    color: designTokens.colors.amber[700],
  },
  upgradeButton: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: designTokens.colors.heroGreen,
  },
  upgradeButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
  },

  // Disabled button
  disabledButton: {
    backgroundColor: designTokens.colors.gray[100],
  },
}); 