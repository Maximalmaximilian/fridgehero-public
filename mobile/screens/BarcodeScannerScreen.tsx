import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Animated,
  Dimensions,
  Modal,
  ScrollView,
  TextInput,
} from 'react-native';

// Conditional import with error handling
let BarCodeScanner: any = null;
let barcodeAvailable = false;
try {
  const barcodeScannerModule = require('expo-barcode-scanner');
  BarCodeScanner = barcodeScannerModule.BarCodeScanner;
  barcodeAvailable = true;
} catch (error) {
  console.log('📱 Barcode scanner not available in this environment (Expo Go)');
  barcodeAvailable = false;
}

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useHousehold } from '../contexts/HouseholdContext';
import { supabase } from '../lib/supabase';
import { barcodeService, type ProductData } from '../lib/barcode-service';
import { designTokens } from '../constants/DesignTokens';

const { width, height } = Dimensions.get('window');

export default function BarcodeScannerScreen({ navigation }: any) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [scanning, setScanning] = useState(true);
  const [productData, setProductData] = useState<ProductData | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Form state for adding item
  const [itemName, setItemName] = useState('');
  const [itemCategory, setItemCategory] = useState('');
  const [expiryDays, setExpiryDays] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [notes, setNotes] = useState('');

  const { theme } = useTheme();
  const { user } = useAuth();
  const { selectedHousehold } = useHousehold();

  const scanAnimation = new Animated.Value(0);

  useEffect(() => {
    getCameraPermissions();
    startScanAnimation();
  }, []);

  const getCameraPermissions = async () => {
    if (!barcodeAvailable) {
      setHasPermission(false);
      return;
    }
    const { status } = await BarCodeScanner.requestPermissionsAsync();
    setHasPermission(status === 'granted');
  };

  const startScanAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnimation, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(scanAnimation, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
    setScanned(true);
    setScanning(false);
    setLoading(true);

    console.log(`📸 Scanned barcode: ${data} (type: ${type})`);

    try {
      const product = await barcodeService.getProductFromBarcode(data);
      
      if (product) {
        console.log('✅ Found product:', product.name);
        setProductData(product);
        setItemName(product.name);
        setItemCategory(product.category || 'Other');
        setExpiryDays(product.expiry_estimate_days?.toString() || '14');
        setNotes(product.storage_tips || '');
        setShowProductModal(true);
      } else {
        console.log('❌ Product not found in database');
        // Show manual entry modal with barcode pre-filled
        setProductData({
          barcode: data,
          name: '',
          source: 'manual'
        });
        setItemName('');
        setItemCategory('Other');
        setExpiryDays('14');
        setNotes('');
        setShowProductModal(true);
      }
    } catch (error) {
      console.error('Error looking up product:', error);
      Alert.alert(
        'Lookup Failed',
        'Could not find product information. You can still add it manually.',
        [
          { text: 'Cancel', onPress: () => resetScanner() },
          { 
            text: 'Add Manually', 
            onPress: () => {
              setProductData({
                barcode: data,
                name: '',
                source: 'manual'
              });
              setShowProductModal(true);
            }
          }
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  const resetScanner = () => {
    setScanned(false);
    setScanning(true);
    setProductData(null);
    setShowProductModal(false);
  };

  const addItemToFridge = async () => {
    if (!itemName.trim()) {
      Alert.alert('Error', 'Please enter an item name');
      return;
    }

    if (!selectedHousehold) {
      Alert.alert('Error', 'No household selected');
      return;
    }

    try {
      setLoading(true);

      // Calculate expiry date
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + parseInt(expiryDays) || 14);

      const { error } = await supabase
        .from('items')
        .insert([{
          name: itemName.trim(),
          category: itemCategory,
          expiry_date: expiryDate.toISOString().split('T')[0],
          quantity: parseInt(quantity) || 1,
          notes: notes.trim() || null,
          barcode: productData?.barcode || null,
          nutrition_data: productData?.nutrition || null,
          household_id: selectedHousehold.household_id,
          added_by: user?.id,
          status: 'active'
        }]);

      if (error) throw error;

      Alert.alert(
        '✅ Item Added!',
        `${itemName} has been added to your fridge`,
        [
          { text: 'Add Another', onPress: resetScanner },
          { text: 'Done', onPress: () => navigation.goBack() }
        ]
      );

    } catch (error) {
      console.error('Error adding item:', error);
      Alert.alert('Error', 'Failed to add item to fridge');
    } finally {
      setLoading(false);
    }
  };

  // Show Expo Go fallback if barcode scanner is not available
  if (!barcodeAvailable) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.bgPrimary }]}>
        <LinearGradient
          colors={[designTokens.colors.primary[100], designTokens.colors.primary[200]]}
          style={styles.expoGoCard}
        >
          <Ionicons name="scan-outline" size={64} color={designTokens.colors.primary[600]} />
          <Text style={[styles.expoGoTitle, { color: theme.textPrimary }]}>
            📱 Barcode Scanner Unavailable
          </Text>
          <Text style={[styles.expoGoMessage, { color: theme.textSecondary }]}>
            Barcode scanning requires native code that's not available in Expo Go.
          </Text>
          <Text style={[styles.expoGoSolution, { color: theme.textSecondary }]}>
            To use barcode scanning:
          </Text>
          <View style={styles.solutionList}>
            <Text style={[styles.solutionItem, { color: theme.textSecondary }]}>
              • Create a development build with EAS
            </Text>
            <Text style={[styles.solutionItem, { color: theme.textSecondary }]}>
              • Use the manual entry form instead
            </Text>
          </View>
          
          <View style={styles.expoGoActions}>
            <TouchableOpacity
              style={styles.manualEntryButton}
              onPress={() => {
                // Navigate to manual entry (AddItem screen)
                navigation.replace('AddItem');
              }}
            >
              <LinearGradient
                colors={[designTokens.colors.heroGreen, designTokens.colors.green[600]]}
                style={styles.manualEntryGradient}
              >
                <Ionicons name="create" size={20} color="white" />
                <Text style={styles.manualEntryButtonText}>Manual Entry</Text>
              </LinearGradient>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={[styles.backButtonText, { color: theme.textSecondary }]}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    );
  }

  if (hasPermission === null) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.bgPrimary }]}>
        <Text style={[styles.message, { color: theme.textSecondary }]}>
          Requesting camera permission...
        </Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.bgPrimary }]}>
        <Ionicons name="camera-outline" size={64} color={theme.textTertiary} />
        <Text style={[styles.message, { color: theme.textPrimary }]}>
          Camera access is required
        </Text>
        <Text style={[styles.submessage, { color: theme.textSecondary }]}>
          Please enable camera permissions in your device settings
        </Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={getCameraPermissions}
        >
          <LinearGradient
            colors={[designTokens.colors.heroGreen, designTokens.colors.green[600]]}
            style={styles.retryButtonGradient}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Camera View */}
      {scanning && barcodeAvailable && (
        <BarCodeScanner
          onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
          style={StyleSheet.absoluteFillObject}
        />
      )}

      {/* Overlay */}
      <View style={styles.overlay}>
        {/* Header */}
        <LinearGradient
          colors={['rgba(0,0,0,0.8)', 'rgba(0,0,0,0.4)', 'transparent']}
          style={styles.header}
        >
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Scan Barcode</Text>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => {
              // Toggle flashlight functionality could go here
            }}
          >
            <Ionicons name="flash-off" size={24} color="white" />
          </TouchableOpacity>
        </LinearGradient>

        {/* Scanning Frame */}
        {scanning && (
          <View style={styles.scanFrame}>
            <View style={styles.scanBorder}>
              <View style={styles.corner} />
              <View style={[styles.corner, styles.cornerTopRight]} />
              <View style={[styles.corner, styles.cornerBottomLeft]} />
              <View style={[styles.corner, styles.cornerBottomRight]} />
            </View>
            
            {/* Animated scan line */}
            <Animated.View
              style={[
                styles.scanLine,
                {
                  transform: [
                    {
                      translateY: scanAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 200],
                      }),
                    },
                  ],
                },
              ]}
            />
          </View>
        )}

        {/* Instructions */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.8)']}
          style={styles.instructions}
        >
          <Text style={styles.instructionText}>
            {loading 
              ? '🔍 Looking up product...' 
              : scanning 
              ? 'Position barcode within the frame'
              : 'Barcode scanned!'
            }
          </Text>
          <Text style={styles.instructionSubtext}>
            {scanning 
              ? 'Hold steady for automatic detection'
              : 'Processing...'
            }
          </Text>
        </LinearGradient>
      </View>

      {/* Product Information Modal */}
      <Modal
        visible={showProductModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowProductModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.bgPrimary }]}>
          <View style={[styles.modalHeader, { backgroundColor: theme.cardBackground, borderBottomColor: theme.borderPrimary }]}>
            <TouchableOpacity onPress={() => setShowProductModal(false)}>
              <Text style={[styles.modalCancel, { color: designTokens.colors.expiredRed }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
              {productData?.source === 'manual' ? 'Add Item Manually' : 'Confirm Product'}
            </Text>
            <TouchableOpacity onPress={addItemToFridge} disabled={loading}>
              <Text style={[styles.modalSave, { 
                color: loading ? theme.textTertiary : designTokens.colors.heroGreen 
              }]}>
                {loading ? 'Adding...' : 'Add'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Product Info Header */}
            {productData && productData.source !== 'manual' && (
              <View style={[styles.productInfoCard, { backgroundColor: theme.cardBackground }]}>
                <View style={styles.productInfoHeader}>
                  <View style={styles.productInfoMain}>
                    <Text style={[styles.productName, { color: theme.textPrimary }]}>
                      {productData.name}
                    </Text>
                    {productData.brand && (
                      <Text style={[styles.productBrand, { color: theme.textSecondary }]}>
                        by {productData.brand}
                      </Text>
                    )}
                  </View>
                  <View style={[styles.sourceBadge, { backgroundColor: designTokens.colors.primary[100] }]}>
                    <Text style={[styles.sourceBadgeText, { color: designTokens.colors.primary[700] }]}>
                      {productData.source === 'openfoodfacts' ? 'Open Food Facts' : 'USDA'}
                    </Text>
                  </View>
                </View>
                
                {productData.nutrition && (
                  <View style={styles.nutritionPreview}>
                    <Text style={[styles.nutritionTitle, { color: theme.textPrimary }]}>
                      Nutrition (per 100g)
                    </Text>
                    <View style={styles.nutritionGrid}>
                      {productData.nutrition.energy_kcal && (
                        <Text style={[styles.nutritionItem, { color: theme.textSecondary }]}>
                          🔥 {productData.nutrition.energy_kcal} kcal
                        </Text>
                      )}
                      {productData.nutrition.proteins_g && (
                        <Text style={[styles.nutritionItem, { color: theme.textSecondary }]}>
                          💪 {productData.nutrition.proteins_g}g protein
                        </Text>
                      )}
                      {productData.nutrition.carbohydrates_g && (
                        <Text style={[styles.nutritionItem, { color: theme.textSecondary }]}>
                          🍞 {productData.nutrition.carbohydrates_g}g carbs
                        </Text>
                      )}
                      {productData.nutrition.fat_g && (
                        <Text style={[styles.nutritionItem, { color: theme.textSecondary }]}>
                          🥑 {productData.nutrition.fat_g}g fat
                        </Text>
                      )}
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* Form Fields */}
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: theme.textPrimary }]}>Item Name *</Text>
              <TextInput
                style={[styles.formInput, { 
                  backgroundColor: theme.bgTertiary, 
                  borderColor: theme.borderPrimary, 
                  color: theme.textPrimary 
                }]}
                value={itemName}
                onChangeText={setItemName}
                placeholder="Enter item name"
                placeholderTextColor={theme.textTertiary}
              />
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={[styles.formLabel, { color: theme.textPrimary }]}>Category</Text>
                <TextInput
                  style={[styles.formInput, { 
                    backgroundColor: theme.bgTertiary, 
                    borderColor: theme.borderPrimary, 
                    color: theme.textPrimary 
                  }]}
                  value={itemCategory}
                  onChangeText={setItemCategory}
                  placeholder="Category"
                  placeholderTextColor={theme.textTertiary}
                />
              </View>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={[styles.formLabel, { color: theme.textPrimary }]}>Quantity</Text>
                <TextInput
                  style={[styles.formInput, { 
                    backgroundColor: theme.bgTertiary, 
                    borderColor: theme.borderPrimary, 
                    color: theme.textPrimary 
                  }]}
                  value={quantity}
                  onChangeText={setQuantity}
                  placeholder="1"
                  placeholderTextColor={theme.textTertiary}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: theme.textPrimary }]}>
                Expires in (days)
              </Text>
              <TextInput
                style={[styles.formInput, { 
                  backgroundColor: theme.bgTertiary, 
                  borderColor: theme.borderPrimary, 
                  color: theme.textPrimary 
                }]}
                value={expiryDays}
                onChangeText={setExpiryDays}
                placeholder="14"
                placeholderTextColor={theme.textTertiary}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: theme.textPrimary }]}>
                Notes (Optional)
              </Text>
              <TextInput
                style={[styles.formInput, styles.formTextArea, { 
                  backgroundColor: theme.bgTertiary, 
                  borderColor: theme.borderPrimary, 
                  color: theme.textPrimary 
                }]}
                value={notes}
                onChangeText={setNotes}
                placeholder={productData?.storage_tips || "Storage tips or notes..."}
                placeholderTextColor={theme.textTertiary}
                multiline
                numberOfLines={3}
              />
            </View>

            {productData?.barcode && (
              <View style={[styles.barcodeInfo, { backgroundColor: theme.bgTertiary }]}>
                <Text style={[styles.barcodeLabel, { color: theme.textSecondary }]}>
                  Barcode: {productData.barcode}
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  message: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  submessage: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  retryButton: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  retryButtonGradient: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  overlay: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  scanFrame: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanBorder: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: designTokens.colors.heroGreen,
    borderWidth: 3,
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    left: undefined,
    borderLeftWidth: 0,
    borderRightWidth: 3,
    borderBottomWidth: 0,
  },
  cornerBottomLeft: {
    bottom: 0,
    top: undefined,
    borderTopWidth: 3,
    borderBottomWidth: 0,
    borderRightWidth: 0,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    top: undefined,
    left: undefined,
    borderTopWidth: 3,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderRightWidth: 3,
  },
  scanLine: {
    position: 'absolute',
    left: 10,
    right: 10,
    height: 2,
    backgroundColor: designTokens.colors.heroGreen,
    shadowColor: designTokens.colors.heroGreen,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  instructions: {
    paddingHorizontal: 20,
    paddingVertical: 40,
    alignItems: 'center',
  },
  instructionText: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    textAlign: 'center',
    marginBottom: 8,
  },
  instructionSubtext: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalCancel: {
    fontSize: 16,
    fontWeight: '500',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalSave: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  productInfoCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  productInfoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  productInfoMain: {
    flex: 1,
    marginRight: 12,
  },
  productName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  productBrand: {
    fontSize: 14,
  },
  sourceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  sourceBadgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  nutritionPreview: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: designTokens.colors.gray[200],
  },
  nutritionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  nutritionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  nutritionItem: {
    fontSize: 13,
    minWidth: '45%',
  },
  formGroup: {
    marginBottom: 16,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  formTextArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  barcodeInfo: {
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  barcodeLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  expoGoCard: {
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  expoGoTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  expoGoMessage: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  expoGoSolution: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  solutionList: {
    marginBottom: 20,
  },
  solutionItem: {
    fontSize: 14,
    marginBottom: 4,
  },
  expoGoActions: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  manualEntryButton: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  manualEntryGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  manualEntryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
}); 