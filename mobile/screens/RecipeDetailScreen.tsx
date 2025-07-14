import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { designTokens } from '../constants/DesignTokens';
import { EnhancedRecipe, SmartRecipeMatch, IngredientDetail } from '../lib/enhanced-recipe-ai';

const { width } = Dimensions.get('window');

interface RecipeDetailScreenProps {
  navigation?: any;
  route?: {
    params?: {
      recipe?: EnhancedRecipe;
      matchData?: SmartRecipeMatch;
    };
  };
}

export default function RecipeDetailScreen({ navigation, route }: RecipeDetailScreenProps) {
  // Provide default values to prevent errors
  const recipe = route?.params?.recipe;
  const matchData = route?.params?.matchData;
  
  // If no recipe is provided, show error or navigate back
  if (!recipe) {
    return (
      <View style={[styles.container, { backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ fontSize: 18, color: '#666' }}>Recipe not found</Text>
        <TouchableOpacity 
          style={{ marginTop: 20, padding: 10, backgroundColor: '#22C55E', borderRadius: 8 }}
          onPress={() => navigation?.goBack()}
        >
          <Text style={{ color: 'white', fontWeight: '600' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { theme, isDark } = useTheme();
  const [expandedSections, setExpandedSections] = useState({
    ingredients: true,
    instructions: true,
    nutrition: false,
    requirements: false,
    info: false,
  });

  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const renderHeader = () => (
    <View style={[styles.header, { backgroundColor: theme.bgPrimary }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.bgPrimary} />
      <SafeAreaView>
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation?.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Recipe Details</Text>
          <TouchableOpacity style={styles.shareButton}>
            <Ionicons name="share-outline" size={24} color={theme.textPrimary} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );

  const renderRecipeHero = () => (
    <Animated.View
      style={[
        styles.heroSection,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <LinearGradient
        colors={[theme.cardBackground, theme.bgSecondary]}
        style={styles.heroGradient}
      >
        <View style={styles.heroContent}>
          <Text style={[styles.recipeName, { color: theme.textPrimary }]}>
            {recipe.name}
          </Text>
          
          {recipe.description && (
            <Text style={[styles.recipeDescription, { color: theme.textSecondary }]}>
              {recipe.description}
            </Text>
          )}

          {/* Quick Info Badges */}
          <View style={styles.badgeContainer}>
            <View style={[styles.badge, styles.mealTypeBadge]}>
              <Ionicons name="time-outline" size={14} color="white" />
              <Text style={styles.badgeText}>{recipe.meal_type}</Text>
            </View>
            
            <View style={[styles.badge, styles.difficultyBadge, 
              { backgroundColor: getDifficultyColor(recipe.difficulty) }]}>
              <Ionicons name="bar-chart-outline" size={14} color="white" />
              <Text style={styles.badgeText}>{recipe.difficulty}</Text>
            </View>
            
            <View style={[styles.badge, styles.costBadge, 
              { backgroundColor: getCostColor(recipe.cost_level) }]}>
              <Ionicons name="wallet-outline" size={14} color="white" />
              <Text style={styles.badgeText}>{recipe.cost_level}</Text>
            </View>
          </View>

          {/* Recipe Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.stat}>
              <Ionicons name="time-outline" size={20} color={designTokens.colors.heroGreen} />
              <Text style={[styles.statLabel, { color: theme.textTertiary }]}>Prep</Text>
              <Text style={[styles.statValue, { color: theme.textPrimary }]}>{recipe.prep_time}m</Text>
            </View>
            
            <View style={styles.stat}>
              <Ionicons name="flame-outline" size={20} color={designTokens.colors.sunset} />
              <Text style={[styles.statLabel, { color: theme.textTertiary }]}>Cook</Text>
              <Text style={[styles.statValue, { color: theme.textPrimary }]}>{recipe.cook_time}m</Text>
            </View>
            
            <View style={styles.stat}>
              <Ionicons name="people-outline" size={20} color={designTokens.colors.ocean} />
              <Text style={[styles.statLabel, { color: theme.textTertiary }]}>Serves</Text>
              <Text style={[styles.statValue, { color: theme.textPrimary }]}>{recipe.servings}</Text>
            </View>

            {recipe.rating && (
              <View style={styles.stat}>
                <Ionicons name="star" size={20} color={designTokens.colors.amber[500]} />
                <Text style={[styles.statLabel, { color: theme.textTertiary }]}>Rating</Text>
                <Text style={[styles.statValue, { color: theme.textPrimary }]}>{recipe.rating}</Text>
              </View>
            )}
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );

  const renderCollapsibleSection = (
    title: string,
    sectionKey: keyof typeof expandedSections,
    icon: string,
    children: React.ReactNode
  ) => (
    <View style={[styles.section, { backgroundColor: theme.cardBackground }]}>
      <TouchableOpacity
        style={styles.sectionHeader}
        onPress={() => toggleSection(sectionKey)}
      >
        <View style={styles.sectionHeaderLeft}>
          <Ionicons name={icon as any} size={20} color={designTokens.colors.heroGreen} />
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>{title}</Text>
        </View>
        <Ionicons
          name={expandedSections[sectionKey] ? "chevron-up" : "chevron-down"}
          size={20}
          color={theme.textTertiary}
        />
      </TouchableOpacity>
      
      {expandedSections[sectionKey] && (
        <View style={styles.sectionContent}>
          {children}
        </View>
      )}
    </View>
  );

  const renderIngredients = () => (
    renderCollapsibleSection(
      "Ingredients",
      "ingredients",
      "list-outline",
      <View>
        {recipe.ingredients.map((ingredient, index) => (
          <View key={index} style={styles.ingredientItem}>
            <View style={styles.ingredientHeader}>
              <View style={styles.ingredientMain}>
                <View style={[
                  styles.categoryDot,
                  { backgroundColor: getCategoryColor(ingredient.category) }
                ]} />
                <Text style={[styles.ingredientName, { color: theme.textPrimary }]}>
                  {ingredient.quantity} {ingredient.unit} {ingredient.name}
                </Text>
              </View>
              
              <View style={styles.ingredientBadges}>
                {ingredient.optional && (
                  <View style={[styles.optionalBadge]}>
                    <Text style={styles.optionalText}>Optional</Text>
                  </View>
                )}
                
                <View style={[
                  styles.importanceBadge,
                  { backgroundColor: getImportanceColor(ingredient.importance) }
                ]}>
                  <Text style={styles.importanceText}>{ingredient.importance}</Text>
                </View>
              </View>
            </View>

            {ingredient.substitutes && ingredient.substitutes.length > 0 && (
              <View style={styles.substitutes}>
                <Text style={[styles.substituteLabel, { color: theme.textTertiary }]}>
                  Substitutes: {ingredient.substitutes.join(', ')}
                </Text>
              </View>
            )}
          </View>
        ))}

        {/* Match Data */}
        {matchData && (
          <View style={styles.matchDataContainer}>
            {matchData.availableIngredients.length > 0 && (
              <View style={styles.matchSection}>
                <LinearGradient
                  colors={[designTokens.colors.green[50], designTokens.colors.green[100]]}
                  style={styles.matchSectionGradient}
                >
                  <View style={styles.matchSectionHeader}>
                    <Ionicons name="checkmark-circle" size={16} color={designTokens.colors.green[600]} />
                    <Text style={[styles.matchSectionTitle, { color: designTokens.colors.green[800] }]}>
                      You have these ingredients ({matchData.availableIngredients.length})
                    </Text>
                  </View>
                </LinearGradient>
              </View>
            )}

            {matchData.missingIngredients.length > 0 && (
              <View style={styles.matchSection}>
                <LinearGradient
                  colors={[designTokens.colors.amber[50], designTokens.colors.amber[100]]}
                  style={styles.matchSectionGradient}
                >
                  <View style={styles.matchSectionHeader}>
                    <Ionicons name="bag-add" size={16} color={designTokens.colors.amber[600]} />
                    <Text style={[styles.matchSectionTitle, { color: designTokens.colors.amber[800] }]}>
                      Need to buy ({matchData.missingIngredients.length})
                    </Text>
                  </View>
                </LinearGradient>
              </View>
            )}

            {matchData.substitutionSuggestions.length > 0 && (
              <View style={styles.matchSection}>
                <LinearGradient
                  colors={[designTokens.colors.gray[50], designTokens.colors.gray[100]]}
                  style={styles.matchSectionGradient}
                >
                  <View style={styles.matchSectionHeader}>
                    <Ionicons name="swap-horizontal" size={16} color={designTokens.colors.ocean} />
                    <Text style={[styles.matchSectionTitle, { color: designTokens.colors.gray[800] }]}>
                      Smart Substitutions ({matchData.substitutionSuggestions.length})
                    </Text>
                  </View>
                  {matchData.substitutionSuggestions.map((sub, index) => (
                    <View key={index} style={styles.substitutionItem}>
                      <Text style={[styles.substitutionText, { color: designTokens.colors.gray[700] }]}>
                        {sub.originalIngredient} → {sub.substitute}
                      </Text>
                      <Text style={[styles.substitutionNote, { color: designTokens.colors.gray[600] }]}>
                        {sub.explanation}
                      </Text>
                    </View>
                  ))}
                </LinearGradient>
              </View>
            )}
          </View>
        )}
      </View>
    )
  );

  const renderInstructions = () => (
    renderCollapsibleSection(
      "Instructions",
      "instructions",
      "list",
      <View>
        {recipe.instructions.map((instruction, index) => (
          <View key={index} style={styles.instructionItem}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>{index + 1}</Text>
            </View>
            <Text style={[styles.instructionText, { color: theme.textPrimary }]}>
              {instruction}
            </Text>
          </View>
        ))}
      </View>
    )
  );

  const renderNutrition = () => (
    renderCollapsibleSection(
      "Nutrition Information",
      "nutrition",
      "fitness-outline",
      <View>
        {recipe.nutrition_info ? (
          <View style={styles.nutritionGrid}>
            <View style={styles.nutritionItem}>
              <Ionicons name="flame" size={20} color={designTokens.colors.red[500]} />
              <Text style={[styles.nutritionLabel, { color: theme.textTertiary }]}>Calories</Text>
              <Text style={[styles.nutritionValue, { color: theme.textPrimary }]}>
                {recipe.nutrition_info.calories}
              </Text>
            </View>
            
            <View style={styles.nutritionItem}>
              <Ionicons name="barbell" size={20} color={designTokens.colors.ocean} />
              <Text style={[styles.nutritionLabel, { color: theme.textTertiary }]}>Protein</Text>
              <Text style={[styles.nutritionValue, { color: theme.textPrimary }]}>
                {recipe.nutrition_info.protein}g
              </Text>
            </View>
            
            <View style={styles.nutritionItem}>
              <Ionicons name="leaf" size={20} color={designTokens.colors.green[500]} />
              <Text style={[styles.nutritionLabel, { color: theme.textTertiary }]}>Carbs</Text>
              <Text style={[styles.nutritionValue, { color: theme.textPrimary }]}>
                {recipe.nutrition_info.carbs}g
              </Text>
            </View>
            
            <View style={styles.nutritionItem}>
              <Ionicons name="water" size={20} color={designTokens.colors.amber[500]} />
              <Text style={[styles.nutritionLabel, { color: theme.textTertiary }]}>Fat</Text>
              <Text style={[styles.nutritionValue, { color: theme.textPrimary }]}>
                {recipe.nutrition_info.fat}g
              </Text>
            </View>
            
            <View style={styles.nutritionItem}>
              <Ionicons name="stats-chart" size={20} color={designTokens.colors.lavender} />
              <Text style={[styles.nutritionLabel, { color: theme.textTertiary }]}>Fiber</Text>
              <Text style={[styles.nutritionValue, { color: theme.textPrimary }]}>
                {recipe.nutrition_info.fiber}g
              </Text>
            </View>
            
            <View style={styles.nutritionItem}>
              <Ionicons name="ellipse" size={20} color={designTokens.colors.gray[500]} />
              <Text style={[styles.nutritionLabel, { color: theme.textTertiary }]}>Sodium</Text>
              <Text style={[styles.nutritionValue, { color: theme.textPrimary }]}>
                {recipe.nutrition_info.sodium}mg
              </Text>
            </View>
          </View>
        ) : (
          <Text style={[styles.noDataText, { color: theme.textTertiary }]}>
            Nutrition information not available
          </Text>
        )}
      </View>
    )
  );

  const renderRequirements = () => (
    renderCollapsibleSection(
      "Requirements & Equipment",
      "requirements",
      "construct-outline",
      <View>
        {recipe.skill_requirements.length > 0 && (
          <View style={styles.requirementCategory}>
            <Text style={[styles.requirementTitle, { color: theme.textPrimary }]}>
              Skills Required
            </Text>
            <View style={styles.tagContainer}>
              {recipe.skill_requirements.map((skill, index) => (
                <View key={index} style={[styles.tag, styles.skillTag]}>
                  <Text style={styles.tagText}>{skill}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {recipe.equipment_needed.length > 0 && (
          <View style={styles.requirementCategory}>
            <Text style={[styles.requirementTitle, { color: theme.textPrimary }]}>
              Equipment Needed
            </Text>
            <View style={styles.tagContainer}>
              {recipe.equipment_needed.map((equipment, index) => (
                <View key={index} style={[styles.tag, styles.equipmentTag]}>
                  <Text style={styles.tagText}>{equipment}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {recipe.seasonality.length > 0 && (
          <View style={styles.requirementCategory}>
            <Text style={[styles.requirementTitle, { color: theme.textPrimary }]}>
              Best Seasons
            </Text>
            <View style={styles.tagContainer}>
              {recipe.seasonality.map((season, index) => (
                <View key={index} style={[styles.tag, styles.seasonTag]}>
                  <Text style={styles.tagText}>{season}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
    )
  );

  const renderAdditionalInfo = () => (
    renderCollapsibleSection(
      "Additional Information",
      "info",
      "information-circle-outline",
      <View>
        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <Text style={[styles.infoLabel, { color: theme.textTertiary }]}>Cuisine</Text>
            <Text style={[styles.infoValue, { color: theme.textPrimary }]}>
              {recipe.cuisine_type}
            </Text>
          </View>
          
          {recipe.diet_tags.length > 0 && (
            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: theme.textTertiary }]}>Dietary Tags</Text>
              <View style={styles.tagContainer}>
                {recipe.diet_tags.map((tag, index) => (
                  <View key={index} style={[styles.tag, styles.dietTag]}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {recipe.tags.length > 0 && (
            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: theme.textTertiary }]}>Tags</Text>
              <View style={styles.tagContainer}>
                {recipe.tags.map((tag, index) => (
                  <View key={index} style={[styles.tag, styles.generalTag]}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {matchData && (
            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: theme.textTertiary }]}>Match Score</Text>
              <Text style={[styles.infoValue, { color: theme.textPrimary }]}>
                {Math.round(matchData.matchScore * 100)}%
              </Text>
            </View>
          )}

          {matchData?.estimatedCost && (
            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: theme.textTertiary }]}>Estimated Cost</Text>
              <Text style={[styles.infoValue, { color: theme.textPrimary }]}>
                ${matchData.estimatedCost.toFixed(2)}
              </Text>
            </View>
          )}
        </View>

        {matchData?.reasonsToMake && matchData.reasonsToMake.length > 0 && (
          <View style={styles.reasonsContainer}>
            <Text style={[styles.reasonsTitle, { color: theme.textPrimary }]}>
              Why cook this recipe?
            </Text>
            {matchData.reasonsToMake.map((reason, index) => (
              <View key={index} style={styles.reasonItem}>
                <Ionicons name="checkmark-circle" size={16} color={designTokens.colors.green[500]} />
                <Text style={[styles.reasonText, { color: theme.textSecondary }]}>
                  {reason}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    )
  );

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return designTokens.colors.green[500];
      case 'medium': return designTokens.colors.amber[500];
      case 'hard': return designTokens.colors.red[500];
      default: return designTokens.colors.gray[500];
    }
  };

  const getCostColor = (cost: string) => {
    switch (cost) {
      case 'budget': return designTokens.colors.green[500];
      case 'moderate': return designTokens.colors.amber[500];
      case 'premium': return designTokens.colors.lavender;
      default: return designTokens.colors.gray[500];
    }
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      protein: designTokens.colors.red[400],
      vegetable: designTokens.colors.green[400],
      fruit: designTokens.colors.lavender,
      grain: designTokens.colors.amber[400],
      dairy: designTokens.colors.ocean,
      spice: designTokens.colors.sunset,
      oil: designTokens.colors.amber[400],
      condiment: designTokens.colors.red[300],
      herb: designTokens.colors.green[400],
      pantry: designTokens.colors.gray[400],
    };
    return colors[category as keyof typeof colors] || designTokens.colors.gray[400];
  };

  const getImportanceColor = (importance: string) => {
    switch (importance) {
      case 'critical': return designTokens.colors.red[500];
      case 'important': return designTokens.colors.amber[500];
      case 'optional': return designTokens.colors.gray[500];
      default: return designTokens.colors.gray[500];
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bgPrimary }]}>
      {renderHeader()}
      
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {renderRecipeHero()}
        {renderIngredients()}
        {renderInstructions()}
        {renderNutrition()}
        {renderRequirements()}
        {renderAdditionalInfo()}
        
        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 0,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.colors.gray[200],
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  shareButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  heroSection: {
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  heroGradient: {
    padding: 20,
  },
  heroContent: {
    alignItems: 'center',
  },
  recipeName: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: 'Inter',
    textAlign: 'center',
    marginBottom: 8,
  },
  recipeDescription: {
    fontSize: 16,
    fontFamily: 'Inter',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  badgeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  mealTypeBadge: {
    backgroundColor: designTokens.colors.ocean,
  },
  difficultyBadge: {
    // Color set dynamically
  },
  costBadge: {
    // Color set dynamically
  },
  aiBadge: {
    backgroundColor: designTokens.colors.lavender,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 20,
  },
  stat: {
    alignItems: 'center',
    gap: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  aiScoreContainer: {
    width: '100%',
    marginTop: 10,
  },
  aiScoreLabel: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 8,
  },
  aiScoreBar: {
    height: 4,
    backgroundColor: designTokens.colors.gray[200],
    borderRadius: 2,
    overflow: 'hidden',
  },
  aiScoreFill: {
    height: '100%',
    backgroundColor: designTokens.colors.lavender,
  },
  section: {
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.colors.gray[100],
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  sectionContent: {
    padding: 16,
  },
  ingredientItem: {
    marginBottom: 16,
  },
  ingredientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  ingredientMain: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  ingredientName: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  ingredientBadges: {
    flexDirection: 'row',
    gap: 4,
  },
  optionalBadge: {
    backgroundColor: designTokens.colors.gray[200],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  optionalText: {
    fontSize: 10,
    color: designTokens.colors.gray[600],
    fontWeight: '500',
  },
  importanceBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  importanceText: {
    fontSize: 10,
    color: 'white',
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  substitutes: {
    marginTop: 4,
    marginLeft: 16,
  },
  substituteLabel: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  matchDataContainer: {
    marginTop: 20,
    gap: 8,
  },
  matchSection: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  matchSectionGradient: {
    padding: 12,
  },
  matchSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  matchSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  substitutionItem: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.3)',
  },
  substitutionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  substitutionNote: {
    fontSize: 12,
    marginTop: 2,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: designTokens.colors.heroGreen,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  stepNumberText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  instructionText: {
    fontSize: 16,
    lineHeight: 24,
    flex: 1,
  },
  nutritionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  nutritionItem: {
    alignItems: 'center',
    width: (width - 72) / 3,
    gap: 4,
  },
  nutritionLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  nutritionValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  noDataText: {
    textAlign: 'center',
    fontSize: 14,
    fontStyle: 'italic',
  },
  requirementCategory: {
    marginBottom: 20,
  },
  requirementTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  skillTag: {
    backgroundColor: designTokens.colors.primary[100],
  },
  equipmentTag: {
    backgroundColor: designTokens.colors.gray[100],
  },
  seasonTag: {
    backgroundColor: designTokens.colors.green[100],
  },
  dietTag: {
    backgroundColor: designTokens.colors.amber[100],
  },
  generalTag: {
    backgroundColor: designTokens.colors.gray[100],
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500',
    color: designTokens.colors.gray[700],
    textTransform: 'capitalize',
  },
  infoGrid: {
    gap: 16,
  },
  infoItem: {
    gap: 4,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  reasonsContainer: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: designTokens.colors.gray[200],
  },
  reasonsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  reasonText: {
    fontSize: 14,
    flex: 1,
  },
  bottomPadding: {
    height: 40,
  },
}); 