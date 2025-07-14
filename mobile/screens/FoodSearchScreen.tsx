import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Platform,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { designTokens } from '../constants/DesignTokens';
import { barcodeService, type ProductData } from '../lib/barcode-service';

interface FoodSearchScreenProps {
  navigation: any;
  route: any;
}

export default function FoodSearchScreen({ navigation, route }: FoodSearchScreenProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ProductData[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [loadingAnimation] = useState(new Animated.Value(0));
  
  const { theme } = useTheme();

  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTimeout]);

  const startLoadingAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(loadingAnimation, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(loadingAnimation, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const performSearch = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }

    setLoading(true);
    setHasSearched(true);
    startLoadingAnimation();

    try {
      console.log('🔍 Searching food databases for:', query);
      const results = await barcodeService.searchFoodSuggestions(query, 12);
      console.log('📊 Found results:', results.length);
      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setLoading(false);
      loadingAnimation.stopAnimation();
      loadingAnimation.setValue(0);
    }
  };

  const debouncedSearch = (query: string) => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    const timeout = setTimeout(() => {
      performSearch(query);
    }, 500);

    setSearchTimeout(timeout);
  };

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    
    if (text.length >= 2) {
      debouncedSearch(text);
    } else {
      setSearchResults([]);
      setHasSearched(false);
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    }
  };

  const selectProduct = (product: ProductData) => {
    console.log('✅ Selected product:', product.name);
    
    // Navigate back to Main tab navigator, specifically to AddItem tab
    navigation.navigate('Main', {
      screen: 'AddItem',
      params: {
        selectedProduct: product,
      },
    });
  };

  const renderProductCard = (product: ProductData, index: number) => (
    <TouchableOpacity
      key={`${product.source}-${index}`}
      style={[styles.productCard, { backgroundColor: theme.cardBackground, borderColor: theme.borderPrimary }]}
      onPress={() => selectProduct(product)}
      activeOpacity={0.7}
    >
      <View style={styles.productHeader}>
        <View style={styles.productInfo}>
          <Text style={[styles.productName, { color: theme.textPrimary }]} numberOfLines={2}>
            {product.name}
          </Text>
          {product.brand && (
            <Text style={[styles.productBrand, { color: theme.textSecondary }]} numberOfLines={1}>
              {product.brand}
            </Text>
          )}
          <View style={styles.productMeta}>
            <Text style={[styles.productCategory, { color: theme.textTertiary }]}>
              {product.category || 'Other'}
            </Text>
            <View style={[styles.sourceTag, {
              backgroundColor: product.source === 'openfoodfacts' 
                ? designTokens.colors.green[100] 
                : product.source === 'openfoodfacts_de'
                ? designTokens.colors.primary[100]
                : product.source === 'usda'
                ? designTokens.colors.amber[100]
                : designTokens.colors.gray[100]
            }]}>
              <Text style={[styles.sourceText, {
                color: product.source === 'openfoodfacts' 
                  ? designTokens.colors.green[700] 
                  : product.source === 'openfoodfacts_de'
                  ? designTokens.colors.primary[700]
                  : product.source === 'usda'
                  ? designTokens.colors.amber[700]
                  : designTokens.colors.gray[700]
              }]}>
                {product.source === 'openfoodfacts' ? 'OpenFood' : 
                 product.source === 'openfoodfacts_de' ? 'OpenFood DE' :
                 product.source === 'usda' ? 'USDA' :
                 product.source === 'cache' ? 'Cached' : 'DB'}
              </Text>
            </View>
          </View>
        </View>
        
        {product.nutrition?.energy_kcal && (
          <View style={styles.nutritionPreview}>
            <Text style={[styles.caloriesText, { color: designTokens.colors.heroGreen }]}>
              {Math.round(product.nutrition.energy_kcal)}
            </Text>
            <Text style={[styles.caloriesLabel, { color: theme.textTertiary }]}>cal</Text>
          </View>
        )}
      </View>

      {/* Nutrition Summary */}
      {product.nutrition && (
        <View style={[styles.nutritionSummary, { backgroundColor: theme.bgTertiary }]}>
          <View style={styles.nutritionRow}>
            {product.nutrition.proteins_g && typeof product.nutrition.proteins_g === 'number' && (
              <View style={styles.nutritionItem}>
                <Text style={[styles.nutritionValue, { color: designTokens.colors.heroGreen }]}>
                  {product.nutrition.proteins_g.toFixed(1)}g
                </Text>
                <Text style={[styles.nutritionLabel, { color: theme.textTertiary }]}>protein</Text>
              </View>
            )}
            {product.nutrition.carbohydrates_g && typeof product.nutrition.carbohydrates_g === 'number' && (
              <View style={styles.nutritionItem}>
                <Text style={[styles.nutritionValue, { color: designTokens.colors.heroGreen }]}>
                  {product.nutrition.carbohydrates_g.toFixed(1)}g
                </Text>
                <Text style={[styles.nutritionLabel, { color: theme.textTertiary }]}>carbs</Text>
              </View>
            )}
            {product.nutrition.fat_g && typeof product.nutrition.fat_g === 'number' && (
              <View style={styles.nutritionItem}>
                <Text style={[styles.nutritionValue, { color: designTokens.colors.heroGreen }]}>
                  {product.nutrition.fat_g.toFixed(1)}g
                </Text>
                <Text style={[styles.nutritionLabel, { color: theme.textTertiary }]}>fat</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Select Button */}
      <View style={styles.selectButtonContainer}>
        <LinearGradient
          colors={[designTokens.colors.heroGreen, designTokens.colors.green[600]]}
          style={styles.selectButton}
        >
          <Ionicons name="add" size={16} color="white" />
          <Text style={styles.selectButtonText}>Select Item</Text>
        </LinearGradient>
      </View>
    </TouchableOpacity>
  );

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
        
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Search Food Database</Text>
        
        <View style={styles.headerSpacer} />
      </View>

      {/* Search Section */}
      <View style={[styles.searchSection, { backgroundColor: theme.cardBackground }]}>
        <View style={[styles.searchContainer, { borderColor: theme.borderSecondary }]}>
          <Ionicons name="search" size={20} color={theme.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: theme.textPrimary }]}
            value={searchQuery}
            onChangeText={handleSearchChange}
            placeholder="Search for foods (e.g., 'banana', 'chicken breast')"
            placeholderTextColor={theme.textTertiary}
            returnKeyType="search"
            onSubmitEditing={() => performSearch(searchQuery)}
            autoFocus={true}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setSearchQuery('');
                setSearchResults([]);
                setHasSearched(false);
              }}
              style={styles.clearButton}
            >
              <Ionicons name="close-circle" size={20} color={theme.textTertiary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Search Tips */}
        <View style={styles.searchTips}>
          <Text style={[styles.searchTipsText, { color: theme.textSecondary }]}>
            💡 Try specific terms like "organic milk" or "chicken breast" for better results
          </Text>
        </View>
      </View>

      {/* Results Section */}
      <ScrollView 
        style={styles.resultsSection}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.resultsContainer}
      >
        {loading && (
          <View style={styles.loadingContainer}>
            <Animated.View style={[
              styles.loadingDot,
              {
                transform: [{
                  scaleX: loadingAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.5, 1.5],
                  }),
                }],
              },
            ]} />
            <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
              Searching food databases...
            </Text>
          </View>
        )}

        {!loading && hasSearched && searchResults.length === 0 && (
          <View style={styles.noResultsContainer}>
            <Ionicons name="search-outline" size={64} color={theme.textTertiary} />
            <Text style={[styles.noResultsTitle, { color: theme.textPrimary }]}>
              No results found
            </Text>
            <Text style={[styles.noResultsText, { color: theme.textSecondary }]}>
              Try a different search term or add the item manually on the previous screen
            </Text>
          </View>
        )}

        {!loading && searchResults.length > 0 && (
          <>
            <View style={styles.resultsHeader}>
              <Text style={[styles.resultsTitle, { color: theme.textPrimary }]}>
                Found {searchResults.length} item{searchResults.length !== 1 ? 's' : ''}
              </Text>
              <Text style={[styles.resultsSubtitle, { color: theme.textSecondary }]}>
                Tap any item to add it to your fridge
              </Text>
            </View>
            
            <View style={styles.productGrid}>
              {searchResults.map((product, index) => renderProductCard(product, index))}
            </View>
          </>
        )}

        {!hasSearched && (
          <View style={styles.welcomeContainer}>
            <Ionicons name="restaurant-outline" size={64} color={theme.textTertiary} />
            <Text style={[styles.welcomeTitle, { color: theme.textPrimary }]}>
              Search Food Database
            </Text>
            <Text style={[styles.welcomeText, { color: theme.textSecondary }]}>
              Search thousands of foods with nutrition data from USDA, OpenFoodFacts, and more
            </Text>
            
            <View style={styles.exampleSearches}>
              <Text style={[styles.exampleTitle, { color: theme.textSecondary }]}>
                Try searching for:
              </Text>
              {['Banana', 'Chicken breast', 'Greek yogurt', 'Brown rice'].map((example) => (
                <TouchableOpacity
                  key={example}
                  style={[styles.exampleChip, { backgroundColor: theme.bgTertiary, borderColor: theme.borderSecondary }]}
                  onPress={() => {
                    setSearchQuery(example);
                    performSearch(example);
                  }}
                >
                  <Text style={[styles.exampleText, { color: theme.textPrimary }]}>{example}</Text>
                </TouchableOpacity>
              ))}
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
    backgroundColor: designTokens.colors.gray[100],
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 44,
  },
  searchSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.colors.gray[200],
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: designTokens.colors.gray[50],
    borderWidth: 2,
    borderColor: designTokens.colors.gray[200],
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
  },
  clearButton: {
    padding: 4,
  },
  searchTips: {
    marginTop: 12,
  },
  searchTipsText: {
    fontSize: 14,
    lineHeight: 20,
  },
  resultsSection: {
    flex: 1,
  },
  resultsContainer: {
    padding: 20,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  loadingDot: {
    width: 30,
    height: 4,
    backgroundColor: designTokens.colors.heroGreen,
    borderRadius: 2,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
  },
  noResultsContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  noResultsTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  noResultsText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  welcomeContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  welcomeText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  exampleSearches: {
    alignItems: 'center',
    gap: 12,
  },
  exampleTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  exampleChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 8,
  },
  exampleText: {
    fontSize: 14,
    fontWeight: '500',
  },
  resultsHeader: {
    marginBottom: 20,
  },
  resultsTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  resultsSubtitle: {
    fontSize: 14,
  },
  productGrid: {
    gap: 16,
  },
  productCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
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
  productHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  productInfo: {
    flex: 1,
    marginRight: 12,
  },
  productName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
    lineHeight: 22,
  },
  productBrand: {
    fontSize: 14,
    marginBottom: 8,
  },
  productMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  productCategory: {
    fontSize: 12,
  },
  sourceTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  sourceText: {
    fontSize: 10,
    fontWeight: '600',
  },
  nutritionPreview: {
    alignItems: 'center',
  },
  caloriesText: {
    fontSize: 20,
    fontWeight: '700',
  },
  caloriesLabel: {
    fontSize: 12,
  },
  nutritionSummary: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  nutritionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  nutritionItem: {
    alignItems: 'center',
    flex: 1,
  },
  nutritionValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  nutritionLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  selectButtonContainer: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  selectButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: 'white',
  },
}); 