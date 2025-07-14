import { supabase } from './supabase';
import { stripeService } from './stripe';
import { aiRecipeService } from './ai-recipe-service';
import { recipeMatchingService } from './recipe-matching';

interface FridgeItem {
  id: string;
  name: string;
  category: string;
  expiry_date: string;
  quantity: number;
  unit?: string;
  status: string;
  household_id: string;
}

interface UsagePattern {
  item_name: string;
  category: string;
  average_consumption_rate: number; // items per week
  preferred_quantity: number;
  preferred_unit: string;
  last_purchased: string;
  purchase_frequency_days: number;
  seasonal_modifier: number;
}

interface PantryStaple {
  name: string;
  category: string;
  minimum_stock: number;
  preferred_brands?: string[];
  typical_price_range: { min: number; max: number };
  shelf_life_days: number;
}

export interface SmartSuggestion {
  id: string;
  name: string;
  category: string;
  reason: string;
  urgency: 'critical' | 'high' | 'medium' | 'low';
  confidence_score: number; // 0-1
  suggested_quantity: number;
  suggested_unit: string;
  estimated_price: number;
  savings_potential: string;
  recipe_compatibility: string[];
  expiry_prevention: boolean;
  ai_generated: boolean;
  source: 'usage_pattern' | 'recipe_need' | 'expiry_rescue' | 'pantry_restock' | 'seasonal' | 'deal_opportunity';
  metadata: {
    current_stock?: number;
    days_until_empty?: number;
    recipe_matches?: number;
    substitute_for?: string;
    bulk_discount?: boolean;
  };
}

interface ShoppingListPreferences {
  budget_range: 'budget' | 'moderate' | 'premium';
  dietary_restrictions: string[];
  favorite_stores: string[];
  bulk_buying_preference: boolean;
  organic_preference: boolean;
  brand_loyalty: Record<string, string>; // category -> preferred brand
  max_expiry_days: number;
  weekly_meal_count: number;
}

export interface WeeklyShoppingPlan {
  total_estimated_cost: number;
  waste_reduction_score: number;
  meal_coverage_score: number;
  suggestions: SmartSuggestion[];
  meal_plan_integration: {
    planned_meals: string[];
    missing_ingredients: string[];
    expiry_rescue_opportunities: string[];
  };
  budget_breakdown: {
    essentials: number;
    fresh_produce: number;
    proteins: number;
    pantry_items: number;
    extras: number;
  };
}

export class SmartShoppingService {
  private pantryStaples: PantryStaple[] = [
    {
      name: 'Olive Oil',
      category: 'Pantry',
      minimum_stock: 1,
      preferred_brands: ['Extra Virgin', 'Cold Pressed'],
      typical_price_range: { min: 6.99, max: 15.99 },
      shelf_life_days: 730
    },
    {
      name: 'Rice',
      category: 'Grains',
      minimum_stock: 1,
      typical_price_range: { min: 2.99, max: 8.99 },
      shelf_life_days: 1095
    },
    {
      name: 'Pasta',
      category: 'Grains',
      minimum_stock: 2,
      typical_price_range: { min: 1.49, max: 4.99 },
      shelf_life_days: 730
    },
    {
      name: 'Canned Tomatoes',
      category: 'Pantry',
      minimum_stock: 2,
      typical_price_range: { min: 1.29, max: 3.49 },
      shelf_life_days: 900
    },
    {
      name: 'Eggs',
      category: 'Dairy',
      minimum_stock: 1,
      typical_price_range: { min: 2.99, max: 6.99 },
      shelf_life_days: 28
    },
    {
      name: 'Milk',
      category: 'Dairy',
      minimum_stock: 1,
      typical_price_range: { min: 3.49, max: 5.99 },
      shelf_life_days: 7
    },
    {
      name: 'Bread',
      category: 'Grains',
      minimum_stock: 1,
      typical_price_range: { min: 2.49, max: 5.99 },
      shelf_life_days: 7
    },
    {
      name: 'Onions',
      category: 'Vegetables',
      minimum_stock: 2,
      typical_price_range: { min: 1.99, max: 4.99 },
      shelf_life_days: 30
    },
    {
      name: 'Garlic',
      category: 'Vegetables',
      minimum_stock: 1,
      typical_price_range: { min: 0.99, max: 2.99 },
      shelf_life_days: 90
    },
    {
      name: 'Salt',
      category: 'Pantry',
      minimum_stock: 1,
      typical_price_range: { min: 0.99, max: 3.99 },
      shelf_life_days: 1825
    },
    {
      name: 'Black Pepper',
      category: 'Pantry',
      minimum_stock: 1,
      typical_price_range: { min: 1.99, max: 5.99 },
      shelf_life_days: 1095
    },
    {
      name: 'Butter',
      category: 'Dairy',
      minimum_stock: 1,
      typical_price_range: { min: 3.99, max: 7.99 },
      shelf_life_days: 90
    },
    {
      name: 'Flour',
      category: 'Pantry',
      minimum_stock: 1,
      typical_price_range: { min: 2.49, max: 5.99 },
      shelf_life_days: 365
    },
    {
      name: 'Sugar',
      category: 'Pantry',
      minimum_stock: 1,
      typical_price_range: { min: 1.99, max: 4.99 },
      shelf_life_days: 1095
    },
    {
      name: 'Chicken Broth',
      category: 'Pantry',
      minimum_stock: 2,
      typical_price_range: { min: 1.49, max: 3.99 },
      shelf_life_days: 730
    }
  ];

  constructor() {}

  /**
   * Generate comprehensive smart shopping suggestions
   */
  async generateSmartSuggestions(
    householdId: string,
    preferences?: Partial<ShoppingListPreferences>
  ): Promise<SmartSuggestion[]> {
    try {
      // Check premium status
      const premiumStatus = await stripeService.getSubscriptionStatus();
      if (!premiumStatus.isActive) {
        throw new Error('Smart Shopping Lists are a premium feature');
      }

      console.log('🤖 Generating smart shopping suggestions...');

      // Gather data
      const fridgeItems = await this.getFridgeItems(householdId);
      const existingShoppingItems = await this.getExistingShoppingListItems(householdId);
      const usagePatterns = await this.analyzeUsagePatterns(householdId);
      const shoppingHistory = await this.getShoppingHistory(householdId);
      const userPreferences = await this.getUserPreferences(householdId, preferences);

      // Generate different types of suggestions
      const suggestions: SmartSuggestion[] = [];

      // 1. Usage pattern based suggestions
      const usageSuggestions = await this.generateUsagePatternSuggestions(
        usagePatterns,
        fridgeItems,
        userPreferences,
        existingShoppingItems
      );
      suggestions.push(...usageSuggestions);

      // 2. Recipe integration suggestions
      const recipeSuggestions = await this.generateRecipeBasedSuggestions(
        householdId,
        fridgeItems,
        userPreferences,
        existingShoppingItems
      );
      suggestions.push(...recipeSuggestions);

      // 3. Expiry rescue suggestions
      const expirySuggestions = await this.generateExpiryRescueSuggestions(
        fridgeItems,
        userPreferences,
        existingShoppingItems
      );
      suggestions.push(...expirySuggestions);

      // 4. Pantry restocking suggestions
      const pantrySuggestions = await this.generatePantryRestockSuggestions(
        fridgeItems,
        userPreferences,
        existingShoppingItems
      );
      suggestions.push(...pantrySuggestions);

      // 5. Seasonal and deal suggestions
      const seasonalSuggestions = await this.generateSeasonalSuggestions(
        userPreferences,
        fridgeItems,
        existingShoppingItems
      );
      suggestions.push(...seasonalSuggestions);

      // 6. Starter suggestions for new users or empty fridges
      if (fridgeItems.length < 5) {
        const starterSuggestions = await this.generateStarterSuggestions(
          fridgeItems,
          userPreferences,
          existingShoppingItems
        );
        suggestions.push(...starterSuggestions);
      }

      // Filter out duplicates and items already on shopping list
      const filteredSuggestions = this.filterDuplicatesAndExisting(suggestions, existingShoppingItems);

      // Sort by priority and confidence
      const prioritizedSuggestions = this.prioritizeSuggestions(filteredSuggestions, userPreferences);

      // Cache suggestions for performance
      await this.cacheSuggestions(householdId, prioritizedSuggestions);

      console.log(`🤖 Generated ${prioritizedSuggestions.length} smart suggestions (filtered from ${suggestions.length} initial suggestions)`);
      return prioritizedSuggestions;

    } catch (error) {
      console.error('Error generating smart suggestions:', error);
      throw error;
    }
  }

  /**
   * Generate weekly shopping plan with meal integration
   */
  async generateWeeklyShoppingPlan(
    householdId: string,
    preferences?: Partial<ShoppingListPreferences>
  ): Promise<WeeklyShoppingPlan> {
    try {
      const suggestions = await this.generateSmartSuggestions(householdId, preferences);
      const userPrefs = await this.getUserPreferences(householdId, preferences);

      // Get meal plan integration
      const mealPlanData = await this.getMealPlanIntegration(householdId, userPrefs);

      // Calculate costs and scores
      const totalCost = suggestions.reduce((sum, item) => sum + item.estimated_price, 0);
      const wasteReductionScore = this.calculateWasteReductionScore(suggestions);
      const mealCoverageScore = this.calculateMealCoverageScore(suggestions, mealPlanData.planned_meals);

      // Budget breakdown
      const budgetBreakdown = this.calculateBudgetBreakdown(suggestions);

      return {
        total_estimated_cost: totalCost,
        waste_reduction_score: wasteReductionScore,
        meal_coverage_score: mealCoverageScore,
        suggestions,
        meal_plan_integration: mealPlanData,
        budget_breakdown: budgetBreakdown
      };

    } catch (error) {
      console.error('Error generating weekly shopping plan:', error);
      throw error;
    }
  }

  /**
   * Auto-add smart suggestions to shopping list
   */
  async autoPopulateShoppingList(
    householdId: string,
    suggestionIds: string[],
    userId: string
  ): Promise<void> {
    try {
      const suggestions = await this.getCachedSuggestions(householdId);
      const selectedSuggestions = suggestions.filter(s => suggestionIds.includes(s.id));

      const shoppingListItems = selectedSuggestions.map(suggestion => ({
        household_id: householdId,
        name: suggestion.name,
        category: suggestion.category,
        quantity: suggestion.suggested_quantity,
        unit: suggestion.suggested_unit,
        notes: `💡 ${suggestion.reason}`,
        added_by: userId,
        auto_generated: true,
        priority: suggestion.urgency,
        estimated_price: suggestion.estimated_price
      }));

      const { error } = await supabase
        .from('shopping_list_items')
        .insert(shoppingListItems);

      if (error) throw error;

      console.log(`✅ Auto-added ${shoppingListItems.length} smart suggestions to shopping list`);

    } catch (error) {
      console.error('Error auto-populating shopping list:', error);
      throw error;
    }
  }

  /**
   * Learn from shopping behavior to improve suggestions
   */
  async learnFromPurchase(
    householdId: string,
    purchasedItems: Array<{
      name: string;
      category: string;
      quantity: number;
      price: number;
      was_suggested: boolean;
      suggestion_id?: string;
    }>
  ): Promise<void> {
    try {
      // Store purchase data for learning
      const learningData = purchasedItems.map(item => ({
        household_id: householdId,
        item_name: item.name,
        category: item.category,
        quantity: item.quantity,
        price: item.price,
        was_suggested: item.was_suggested,
        suggestion_id: item.suggestion_id,
        purchased_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('shopping_learning_data')
        .insert(learningData);

      if (error) throw error;

      console.log(`📚 Learned from ${purchasedItems.length} purchases`);

    } catch (error) {
      console.error('Error learning from purchases:', error);
    }
  }

  // Private helper methods

  private async getFridgeItems(householdId: string): Promise<FridgeItem[]> {
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .eq('household_id', householdId)
      .eq('status', 'active')
      .order('expiry_date', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  private async getExistingShoppingListItems(householdId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('shopping_list_items')
      .select('*')
      .eq('household_id', householdId)
      .eq('completed', false)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching existing shopping list items:', error);
      return [];
    }
    return data || [];
  }

  private filterDuplicatesAndExisting(
    suggestions: SmartSuggestion[], 
    existingShoppingItems: any[]
  ): SmartSuggestion[] {
    // Create a set of existing item names for quick lookup (case-insensitive)
    const existingItemNames = new Set(
      existingShoppingItems.map(item => item.name.toLowerCase().trim())
    );

    // Filter out suggestions that are already on the shopping list
    const filteredSuggestions = suggestions.filter(suggestion => {
      const suggestionName = suggestion.name.toLowerCase().trim();
      
      // Check if item is already on shopping list
      if (existingItemNames.has(suggestionName)) {
        console.log(`🚫 Filtering out "${suggestion.name}" - already on shopping list`);
        return false;
      }
      
      // Check for similar names (simple substring matching)
      for (const existingName of existingItemNames) {
        if (existingName.includes(suggestionName) || suggestionName.includes(existingName)) {
          console.log(`🚫 Filtering out "${suggestion.name}" - similar to "${existingName}" on shopping list`);
          return false;
        }
      }
      
      return true;
    });

    // Remove duplicates within suggestions themselves
    const seen = new Set<string>();
    const uniqueSuggestions = filteredSuggestions.filter(suggestion => {
      const key = suggestion.name.toLowerCase().trim();
      if (seen.has(key)) {
        console.log(`🚫 Filtering out duplicate "${suggestion.name}"`);
        return false;
      }
      seen.add(key);
      return true;
    });

    return uniqueSuggestions;
  }

  private async analyzeUsagePatterns(householdId: string): Promise<UsagePattern[]> {
    // Analyze item consumption patterns from historical data
    const { data, error } = await supabase
      .from('items')
      .select('name, category, quantity, created_at, updated_at, status')
      .eq('household_id', householdId)
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) {
      console.error('Error fetching usage patterns:', error);
      return [];
    }

    // Group by item name and analyze consumption
    const itemGroups = this.groupItemsByName(data || []);
    const patterns: UsagePattern[] = [];

    for (const [itemName, items] of Object.entries(itemGroups)) {
      if (items.length < 2) continue; // Need at least 2 data points

      const consumedItems = items.filter(item => item.status === 'consumed' || item.status === 'expired');
      if (consumedItems.length === 0) continue;

      // Calculate average consumption rate
      const avgConsumption = this.calculateConsumptionRate(consumedItems);
      const lastPurchased = this.getLastPurchaseDate(items);
      const frequency = this.calculatePurchaseFrequency(items);

      patterns.push({
        item_name: itemName,
        category: items[0].category,
        average_consumption_rate: avgConsumption,
        preferred_quantity: this.getPreferredQuantity(items),
        preferred_unit: this.getPreferredUnit(items),
        last_purchased: lastPurchased,
        purchase_frequency_days: frequency,
        seasonal_modifier: this.calculateSeasonalModifier(itemName, items)
      });
    }

    return patterns;
  }

  private async getShoppingHistory(householdId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('shopping_list_items')
      .select('*')
      .eq('household_id', householdId)
      .eq('completed', true)
      .order('completed_at', { ascending: false })
      .limit(200);

    if (error) {
      console.error('Error fetching shopping history:', error);
      return [];
    }

    return data || [];
  }

  private async getUserPreferences(
    householdId: string,
    overrides?: Partial<ShoppingListPreferences>
  ): Promise<ShoppingListPreferences> {
    // Get preferences from user profiles in household
    const { data: members } = await supabase
      .from('household_members')
      .select(`
        profiles!inner(
          preferences
        )
      `)
      .eq('household_id', householdId);

    // Default preferences
    const defaultPrefs: ShoppingListPreferences = {
      budget_range: 'moderate',
      dietary_restrictions: [],
      favorite_stores: [],
      bulk_buying_preference: false,
      organic_preference: false,
      brand_loyalty: {},
      max_expiry_days: 7,
      weekly_meal_count: 14,
      ...overrides
    };

    // Merge with user preferences
    if (members && members.length > 0) {
      const userPrefs = (members[0] as any)?.profiles?.preferences;
      if (userPrefs) {
        return { ...defaultPrefs, ...userPrefs, ...overrides };
      }
    }

    return defaultPrefs;
  }

  private async generateUsagePatternSuggestions(
    patterns: UsagePattern[],
    fridgeItems: FridgeItem[],
    preferences: ShoppingListPreferences,
    existingShoppingItems: any[]
  ): Promise<SmartSuggestion[]> {
    const suggestions: SmartSuggestion[] = [];
    const now = new Date();

    // Create a set of existing shopping list item names for quick lookup
    const existingItemNames = new Set(
      existingShoppingItems.map(item => item.name.toLowerCase().trim())
    );

    for (const pattern of patterns) {
      // Skip if item is already on shopping list
      if (existingItemNames.has(pattern.item_name.toLowerCase().trim())) {
        console.log(`⏭️ Skipping "${pattern.item_name}" - already on shopping list`);
        continue;
      }

      // Check current stock
      const currentStock = fridgeItems.filter(item => 
        item.name.toLowerCase().includes(pattern.item_name.toLowerCase()) ||
        pattern.item_name.toLowerCase().includes(item.name.toLowerCase())
      );

      const totalCurrentStock = currentStock.reduce((sum, item) => sum + item.quantity, 0);
      
      // Calculate days until empty based on consumption rate
      const daysUntilEmpty = totalCurrentStock / (pattern.average_consumption_rate / 7);
      
      // Suggest if running low or will run out soon
      if (daysUntilEmpty <= (preferences.max_expiry_days + 2) || totalCurrentStock === 0) {
        const urgency = this.calculateUrgency(daysUntilEmpty, totalCurrentStock);
        
        suggestions.push({
          id: `usage-${pattern.item_name}-${Date.now()}`,
          name: pattern.item_name,
          category: pattern.category,
          reason: totalCurrentStock === 0 
            ? `Out of stock - you typically consume ${pattern.average_consumption_rate} per week`
            : `Running low - will be empty in ${Math.ceil(daysUntilEmpty)} days`,
          urgency,
          confidence_score: 0.85,
          suggested_quantity: pattern.preferred_quantity,
          suggested_unit: pattern.preferred_unit,
          estimated_price: this.estimatePrice(pattern.item_name, pattern.category, pattern.preferred_quantity),
          savings_potential: this.calculateSavingsPotential(pattern),
          recipe_compatibility: [],
          expiry_prevention: false,
          ai_generated: true,
          source: 'usage_pattern',
          metadata: {
            current_stock: totalCurrentStock,
            days_until_empty: daysUntilEmpty,
            recipe_matches: 0
          }
        });
      }
    }

    return suggestions;
  }

  private async generateRecipeBasedSuggestions(
    householdId: string,
    fridgeItems: FridgeItem[],
    preferences: ShoppingListPreferences,
    existingShoppingItems: any[]
  ): Promise<SmartSuggestion[]> {
    try {
      // Get recipe recommendations
      const recipeMatches = await recipeMatchingService.getSmartRecipeRecommendations(
        householdId,
        { maxResults: 10, minMatchScore: 0.3 }
      );

      const suggestions: SmartSuggestion[] = [];

      for (const recipe of recipeMatches) {
        // Focus on missing ingredients that would complete high-match recipes
        if (recipe.missingIngredients.length > 0 && recipe.matchScore > 0.5) {
          for (const missingIngredient of recipe.missingIngredients.slice(0, 3)) {
            const estimated_price = this.estimatePrice(missingIngredient, 'Other', 1);
            
            suggestions.push({
              id: `recipe-${recipe.id}-${missingIngredient}-${Date.now()}`,
              name: missingIngredient,
              category: this.categorizeIngredient(missingIngredient),
              reason: `Needed for "${recipe.name}" (${Math.round(recipe.matchScore * 100)}% match with your fridge)`,
              urgency: recipe.expiringItemsUsed.length > 0 ? 'high' : 'medium',
              confidence_score: recipe.matchScore,
              suggested_quantity: 1,
              suggested_unit: this.getSuggestedUnit(missingIngredient),
              estimated_price,
              savings_potential: recipe.expiringItemsUsed.length > 0 
                ? 'Prevents food waste' 
                : 'Enables home cooking',
              recipe_compatibility: [recipe.name],
              expiry_prevention: recipe.expiringItemsUsed.length > 0,
              ai_generated: true,
              source: 'recipe_need',
              metadata: {
                recipe_matches: 1,
                substitute_for: undefined,
                bulk_discount: false
              }
            });
          }
        }
      }

      return suggestions;
    } catch (error) {
      console.error('Error generating recipe-based suggestions:', error);
      return [];
    }
  }

  private async generateExpiryRescueSuggestions(
    fridgeItems: FridgeItem[],
    preferences: ShoppingListPreferences,
    existingShoppingItems: any[]
  ): Promise<SmartSuggestion[]> {
    const suggestions: SmartSuggestion[] = [];
    const now = new Date();

    // Create a set of existing shopping list item names for quick lookup
    const existingItemNames = new Set(
      existingShoppingItems.map(item => item.name.toLowerCase().trim())
    );

    // Find items expiring soon
    const expiringItems = fridgeItems.filter(item => {
      const daysUntilExpiry = Math.ceil(
        (new Date(item.expiry_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysUntilExpiry <= 3 && daysUntilExpiry >= 0;
    });

    // Suggest complementary ingredients to use expiring items
    for (const expiringItem of expiringItems.slice(0, 5)) {
      const complementaryIngredients = this.getComplementaryIngredients(expiringItem.name, expiringItem.category);
      
      for (const ingredient of complementaryIngredients.slice(0, 2)) {
        // Skip if ingredient is already on shopping list
        if (existingItemNames.has(ingredient.toLowerCase().trim())) {
          console.log(`⏭️ Skipping "${ingredient}" - already on shopping list`);
          continue;
        }

        const alreadyHave = fridgeItems.some(item => 
          item.name.toLowerCase().includes(ingredient.toLowerCase())
        );
        
        if (!alreadyHave) {
          suggestions.push({
            id: `expiry-rescue-${expiringItem.id}-${ingredient}-${Date.now()}`,
            name: ingredient,
            category: this.categorizeIngredient(ingredient),
            reason: `Pairs with your expiring ${expiringItem.name} - rescue it before it spoils!`,
            urgency: 'high',
            confidence_score: 0.75,
            suggested_quantity: 1,
            suggested_unit: this.getSuggestedUnit(ingredient),
            estimated_price: this.estimatePrice(ingredient, this.categorizeIngredient(ingredient), 1),
            savings_potential: `Save $${(this.estimatePrice(expiringItem.name, expiringItem.category, expiringItem.quantity)).toFixed(2)} from waste`,
            recipe_compatibility: [],
            expiry_prevention: true,
            ai_generated: true,
            source: 'expiry_rescue',
            metadata: {
              substitute_for: `Rescue ingredient for ${expiringItem.name}`,
              recipe_matches: 0
            }
          });
        }
      }
    }

    return suggestions;
  }

  private async generatePantryRestockSuggestions(
    fridgeItems: FridgeItem[],
    preferences: ShoppingListPreferences,
    existingShoppingItems: any[]
  ): Promise<SmartSuggestion[]> {
    const suggestions: SmartSuggestion[] = [];

    // Create a set of existing shopping list item names for quick lookup
    const existingItemNames = new Set(
      existingShoppingItems.map(item => item.name.toLowerCase().trim())
    );

    for (const staple of this.pantryStaples) {
      // Skip if staple is already on shopping list
      if (existingItemNames.has(staple.name.toLowerCase().trim())) {
        console.log(`⏭️ Skipping "${staple.name}" - already on shopping list`);
        continue;
      }

      // Check if we have enough of this staple
      const currentStock = fridgeItems.filter(item => 
        item.name.toLowerCase().includes(staple.name.toLowerCase()) ||
        staple.name.toLowerCase().includes(item.name.toLowerCase())
      );

      const totalStock = currentStock.reduce((sum, item) => sum + item.quantity, 0);

      if (totalStock < staple.minimum_stock) {
        const quantityNeeded = staple.minimum_stock - totalStock;
        
        suggestions.push({
          id: `pantry-${staple.name}-${Date.now()}`,
          name: staple.name,
          category: staple.category,
          reason: `Pantry staple running low (${totalStock}/${staple.minimum_stock})`,
          urgency: totalStock === 0 ? 'high' : 'low',
          confidence_score: 0.9,
          suggested_quantity: quantityNeeded,
          suggested_unit: 'units',
          estimated_price: (staple.typical_price_range.min + staple.typical_price_range.max) / 2,
          savings_potential: 'Always handy for cooking',
          recipe_compatibility: [],
          expiry_prevention: false,
          ai_generated: true,
          source: 'pantry_restock',
          metadata: {
            current_stock: totalStock,
            bulk_discount: quantityNeeded > 2
          }
        });
      }
    }

    return suggestions;
  }

  private async generateSeasonalSuggestions(
    preferences: ShoppingListPreferences,
    fridgeItems: FridgeItem[],
    existingShoppingItems: any[]
  ): Promise<SmartSuggestion[]> {
    const suggestions: SmartSuggestion[] = [];
    const currentMonth = new Date().getMonth();
    
    // Create a set of existing shopping list item names for quick lookup
    const existingItemNames = new Set(
      existingShoppingItems.map(item => item.name.toLowerCase().trim())
    );
    
    // Seasonal produce suggestions
    const seasonalProduce = this.getSeasonalProduce(currentMonth);
    
    for (const produce of seasonalProduce.slice(0, 3)) {
      // Skip if produce is already on shopping list
      if (existingItemNames.has(produce.name.toLowerCase().trim())) {
        console.log(`⏭️ Skipping "${produce.name}" - already on shopping list`);
        continue;
      }

      const alreadyHave = fridgeItems.some(item => 
        item.name.toLowerCase().includes(produce.name.toLowerCase())
      );
      
      if (!alreadyHave) {
        suggestions.push({
          id: `seasonal-${produce.name}-${Date.now()}`,
          name: produce.name,
          category: produce.category,
          reason: `${produce.name} is in peak season - fresh, affordable, and nutritious!`,
          urgency: 'low',
          confidence_score: 0.6,
          suggested_quantity: 1,
          suggested_unit: produce.unit,
          estimated_price: produce.price,
          savings_potential: `Peak season pricing - save ${produce.savings}`,
          recipe_compatibility: produce.recipes,
          expiry_prevention: false,
          ai_generated: true,
          source: 'seasonal',
          metadata: {
            recipe_matches: produce.recipes.length
          }
        });
      }
    }

    return suggestions;
  }

  private async generateStarterSuggestions(
    fridgeItems: FridgeItem[],
    preferences: ShoppingListPreferences,
    existingShoppingItems: any[]
  ): Promise<SmartSuggestion[]> {
    const suggestions: SmartSuggestion[] = [];
    
    // Create a set of existing shopping list item names for quick lookup
    const existingItemNames = new Set(
      existingShoppingItems.map(item => item.name.toLowerCase().trim())
    );

    // Essential starter items for new households
    const starterItems = [
      {
        name: 'Bananas',
        category: 'Fruits',
        reason: 'Perfect for breakfast, snacks, and smoothies - versatile and nutritious',
        urgency: 'medium',
        quantity: 1,
        unit: 'bunch',
        price: 2.99,
        recipes: ['Banana Bread', 'Smoothies', 'Pancakes']
      },
      {
        name: 'Chicken Breast',
        category: 'Meat',
        reason: 'Lean protein source - perfect for countless healthy meals',
        urgency: 'medium',
        quantity: 1,
        unit: 'lb',
        price: 6.99,
        recipes: ['Grilled Chicken', 'Chicken Stir Fry', 'Chicken Salad']
      },
      {
        name: 'Greek Yogurt',
        category: 'Dairy',
        reason: 'High-protein breakfast base and cooking ingredient',
        urgency: 'low',
        quantity: 1,
        unit: 'container',
        price: 4.49,
        recipes: ['Parfait', 'Smoothies', 'Marinades']
      },
      {
        name: 'Mixed Greens',
        category: 'Vegetables',
        reason: 'Foundation for healthy salads and quick meals',
        urgency: 'medium',
        quantity: 1,
        unit: 'bag',
        price: 3.99,
        recipes: ['Garden Salad', 'Smoothies', 'Sandwiches']
      },
      {
        name: 'Lemons',
        category: 'Fruits',
        reason: 'Essential for cooking, drinks, and food preservation',
        urgency: 'low',
        quantity: 1,
        unit: 'bag',
        price: 2.49,
        recipes: ['Lemon Water', 'Dressings', 'Marinades']
      },
      {
        name: 'Avocados',
        category: 'Fruits',
        reason: 'Healthy fats for toast, salads, and countless dishes',
        urgency: 'medium',
        quantity: 3,
        unit: 'each',
        price: 4.99,
        recipes: ['Avocado Toast', 'Guacamole', 'Salads']
      }
    ];

    // Check what user already has and add missing essentials
    for (const item of starterItems) {
      // Skip if item is already on shopping list
      if (existingItemNames.has(item.name.toLowerCase().trim())) {
        console.log(`⏭️ Skipping starter "${item.name}" - already on shopping list`);
        continue;
      }

      // Check if user already has this item in fridge
      const alreadyHave = fridgeItems.some(fridgeItem => 
        fridgeItem.name.toLowerCase().includes(item.name.toLowerCase()) ||
        item.name.toLowerCase().includes(fridgeItem.name.toLowerCase())
      );

      if (!alreadyHave) {
        suggestions.push({
          id: `starter-${item.name}-${Date.now()}`,
          name: item.name,
          category: item.category,
          reason: item.reason,
          urgency: item.urgency as 'critical' | 'high' | 'medium' | 'low',
          confidence_score: 0.8,
          suggested_quantity: item.quantity,
          suggested_unit: item.unit,
          estimated_price: item.price,
          savings_potential: 'Kitchen essential',
          recipe_compatibility: item.recipes,
          expiry_prevention: false,
          ai_generated: true,
          source: 'pantry_restock',
          metadata: {
            recipe_matches: item.recipes.length
          }
        });
      }
    }

    // Add meal inspiration based on current season
    const currentMonth = new Date().getMonth();
    const seasonalMealSuggestions = this.getSeasonalMealSuggestions(currentMonth);
    
    for (const meal of seasonalMealSuggestions.slice(0, 2)) {
      const missingIngredients = meal.ingredients.filter((ingredient: string) => {
        // Check if already have this ingredient
        const alreadyHave = fridgeItems.some(fridgeItem => 
          fridgeItem.name.toLowerCase().includes(ingredient.toLowerCase()) ||
          ingredient.toLowerCase().includes(fridgeItem.name.toLowerCase())
        );
        
        // Check if already on shopping list
        const onShoppingList = existingItemNames.has(ingredient.toLowerCase().trim());
        
        return !alreadyHave && !onShoppingList;
      });

      if (missingIngredients.length > 0 && missingIngredients.length <= 3) {
        for (const ingredient of missingIngredients.slice(0, 2)) {
          suggestions.push({
            id: `meal-${ingredient}-${Date.now()}`,
            name: ingredient,
            category: this.categorizeIngredient(ingredient),
            reason: `Perfect for making ${meal.name} - ${meal.description}`,
            urgency: 'low',
            confidence_score: 0.7,
            suggested_quantity: 1,
            suggested_unit: this.getSuggestedUnit(ingredient),
            estimated_price: this.estimatePrice(ingredient, this.categorizeIngredient(ingredient), 1),
            savings_potential: 'Meal inspiration',
            recipe_compatibility: [meal.name],
            expiry_prevention: false,
            ai_generated: true,
            source: 'recipe_need',
            metadata: {
              recipe_matches: 1
            }
          });
        }
      }
    }

    return suggestions.slice(0, 8); // Limit to 8 starter suggestions
  }

  private getSeasonalMealSuggestions(month: number) {
    const mealMap: Record<number, any[]> = {
      0: [ // January
        { name: 'Comfort Soup', description: 'warm and nourishing', ingredients: ['Potatoes', 'Carrots', 'Broth'] },
        { name: 'Citrus Salad', description: 'fresh and vitamin-rich', ingredients: ['Oranges', 'Mixed Greens', 'Walnuts'] }
      ],
      1: [ // February
        { name: 'Stir Fry', description: 'quick and healthy', ingredients: ['Broccoli', 'Soy Sauce', 'Rice'] },
        { name: 'Winter Salad', description: 'crunchy and fresh', ingredients: ['Cabbage', 'Carrots', 'Dressing'] }
      ],
      2: [ // March
        { name: 'Spring Pasta', description: 'light and fresh', ingredients: ['Asparagus', 'Pasta', 'Parmesan'] },
        { name: 'Green Smoothie', description: 'energizing and nutritious', ingredients: ['Spinach', 'Banana', 'Greek Yogurt'] }
      ],
      3: [ // April
        { name: 'Berry Bowl', description: 'sweet and antioxidant-rich', ingredients: ['Strawberries', 'Granola', 'Yogurt'] },
        { name: 'Spring Soup', description: 'light and seasonal', ingredients: ['Peas', 'Broth', 'Herbs'] }
      ],
      4: [ // May
        { name: 'Garden Salad', description: 'fresh and crisp', ingredients: ['Lettuce', 'Tomatoes', 'Cucumber'] },
        { name: 'Herb Chicken', description: 'flavorful and light', ingredients: ['Chicken', 'Spring Onions', 'Herbs'] }
      ],
      5: [ // June
        { name: 'Summer Pasta', description: 'light and fresh', ingredients: ['Tomatoes', 'Basil', 'Pasta'] },
        { name: 'Berry Pancakes', description: 'weekend breakfast treat', ingredients: ['Blueberries', 'Flour', 'Eggs'] }
      ],
      6: [ // July
        { name: 'Grilled Vegetables', description: 'smoky and healthy', ingredients: ['Corn', 'Bell Peppers', 'Zucchini'] },
        { name: 'Peach Smoothie', description: 'refreshing summer drink', ingredients: ['Peaches', 'Yogurt', 'Honey'] }
      ],
      7: [ // August
        { name: 'Summer Salad', description: 'refreshing and hydrating', ingredients: ['Watermelon', 'Feta', 'Mint'] },
        { name: 'Ratatouille', description: 'Mediterranean classic', ingredients: ['Eggplant', 'Tomatoes', 'Herbs'] }
      ],
      8: [ // September
        { name: 'Apple Crisp', description: 'warm fall dessert', ingredients: ['Apples', 'Oats', 'Cinnamon'] },
        { name: 'Roasted Vegetables', description: 'hearty autumn side', ingredients: ['Carrots', 'Cauliflower', 'Olive Oil'] }
      ],
      9: [ // October
        { name: 'Pumpkin Soup', description: 'warming fall comfort', ingredients: ['Pumpkin', 'Broth', 'Cream'] },
        { name: 'Fall Salad', description: 'seasonal and nutritious', ingredients: ['Pears', 'Beets', 'Goat Cheese'] }
      ],
      10: [ // November
        { name: 'Holiday Sides', description: 'traditional favorites', ingredients: ['Cranberries', 'Potatoes', 'Herbs'] },
        { name: 'Turkey Soup', description: 'post-holiday comfort', ingredients: ['Turkey', 'Vegetables', 'Broth'] }
      ],
      11: [ // December
        { name: 'Winter Salad', description: 'festive and colorful', ingredients: ['Pomegranate', 'Mixed Greens', 'Nuts'] },
        { name: 'Holiday Soup', description: 'warming winter comfort', ingredients: ['Winter Squash', 'Broth', 'Spices'] }
      ]
    };

    return mealMap[month] || mealMap[0]; // Fallback to January if month not found
  }

  private prioritizeSuggestions(
    suggestions: SmartSuggestion[],
    preferences: ShoppingListPreferences
  ): SmartSuggestion[] {
    return suggestions
      .sort((a, b) => {
        // Priority order: critical > high > medium > low
        const urgencyOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        const urgencyDiff = urgencyOrder[b.urgency] - urgencyOrder[a.urgency];
        
        if (urgencyDiff !== 0) return urgencyDiff;
        
        // Then by confidence score
        const confidenceDiff = b.confidence_score - a.confidence_score;
        if (confidenceDiff !== 0) return confidenceDiff;
        
        // Then by estimated price (lower is better for budget-conscious)
        if (preferences.budget_range === 'budget') {
          return a.estimated_price - b.estimated_price;
        }
        
        return 0;
      })
      .slice(0, 20); // Limit to top 20 suggestions
  }

  private async getMealPlanIntegration(
    householdId: string,
    preferences: ShoppingListPreferences
  ): Promise<any> {
    // This would integrate with meal planning if implemented
    return {
      planned_meals: [],
      missing_ingredients: [],
      expiry_rescue_opportunities: []
    };
  }

  private calculateWasteReductionScore(suggestions: SmartSuggestion[]): number {
    const expiryPreventionCount = suggestions.filter(s => s.expiry_prevention).length;
    return Math.min(100, (expiryPreventionCount / suggestions.length) * 100);
  }

  private calculateMealCoverageScore(suggestions: SmartSuggestion[], plannedMeals: string[]): number {
    const recipeIngredientCount = suggestions.reduce((sum, s) => sum + s.recipe_compatibility.length, 0);
    return Math.min(100, (recipeIngredientCount / Math.max(1, plannedMeals.length)) * 100);
  }

  private calculateBudgetBreakdown(suggestions: SmartSuggestion[]) {
    const breakdown = {
      essentials: 0,
      fresh_produce: 0,
      proteins: 0,
      pantry_items: 0,
      extras: 0
    };

    for (const suggestion of suggestions) {
      const price = suggestion.estimated_price;
      
      switch (suggestion.category) {
        case 'Vegetables':
        case 'Fruits':
          breakdown.fresh_produce += price;
          break;
        case 'Meat':
        case 'Dairy':
        case 'Eggs':
          breakdown.proteins += price;
          break;
        case 'Pantry':
        case 'Grains':
          breakdown.pantry_items += price;
          break;
        default:
          if (suggestion.source === 'pantry_restock' || suggestion.urgency === 'critical') {
            breakdown.essentials += price;
          } else {
            breakdown.extras += price;
          }
      }
    }

    return breakdown;
  }

  // Helper methods for data processing
  private groupItemsByName(items: any[]): Record<string, any[]> {
    return items.reduce((groups, item) => {
      const key = item.name.toLowerCase();
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
      return groups;
    }, {});
  }

  private calculateConsumptionRate(items: any[]): number {
    // Simple calculation - could be more sophisticated
    return items.length / Math.max(1, items.length * 0.5); // rough weekly rate
  }

  private getLastPurchaseDate(items: any[]): string {
    return items
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
      ?.created_at || new Date().toISOString();
  }

  private calculatePurchaseFrequency(items: any[]): number {
    if (items.length < 2) return 7; // default to weekly
    
    const dates = items.map(item => new Date(item.created_at).getTime()).sort();
    const intervals = [];
    
    for (let i = 1; i < dates.length; i++) {
      intervals.push((dates[i] - dates[i-1]) / (1000 * 60 * 60 * 24));
    }
    
    return intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
  }

  private calculateSeasonalModifier(itemName: string, items: any[]): number {
    // Simple seasonal modifier - could be enhanced with real seasonal data
    return 1.0;
  }

  private getPreferredQuantity(items: any[]): number {
    const quantities = items.map(item => item.quantity).filter(q => q > 0);
    return quantities.length > 0 
      ? Math.round(quantities.reduce((sum, q) => sum + q, 0) / quantities.length)
      : 1;
  }

  private getPreferredUnit(items: any[]): string {
    const units = items.map(item => item.unit).filter(u => u);
    const unitCounts = units.reduce((counts, unit) => {
      counts[unit] = (counts[unit] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);
    
    return Object.keys(unitCounts).sort((a, b) => unitCounts[b] - unitCounts[a])[0] || 'pcs';
  }

  private calculateUrgency(daysUntilEmpty: number, currentStock: number): 'critical' | 'high' | 'medium' | 'low' {
    if (currentStock === 0) return 'critical';
    if (daysUntilEmpty <= 1) return 'high';
    if (daysUntilEmpty <= 3) return 'medium';
    return 'low';
  }

  private estimatePrice(itemName: string, category: string, quantity: number): number {
    // Price estimation based on category and item type
    const priceRanges: Record<string, { min: number; max: number }> = {
      'Vegetables': { min: 1.99, max: 4.99 },
      'Fruits': { min: 2.49, max: 6.99 },
      'Meat': { min: 4.99, max: 15.99 },
      'Dairy': { min: 2.99, max: 7.99 },
      'Grains': { min: 1.99, max: 5.99 },
      'Pantry': { min: 1.49, max: 8.99 },
      'Other': { min: 2.99, max: 6.99 }
    };

    const range = priceRanges[category] || priceRanges['Other'];
    const basePrice = (range.min + range.max) / 2;
    
    // Apply quantity multiplier with bulk discount
    const multiplier = quantity > 3 ? quantity * 0.85 : quantity;
    
    return Math.round(basePrice * multiplier * 100) / 100;
  }

  private calculateSavingsPotential(pattern: UsagePattern): string {
    const weeklyValue = this.estimatePrice(pattern.item_name, pattern.category, pattern.average_consumption_rate);
    return `~$${weeklyValue.toFixed(2)}/week value`;
  }

  private categorizeIngredient(ingredient: string): string {
    const normalizedName = ingredient.toLowerCase();
    
    if (['chicken', 'beef', 'pork', 'fish', 'salmon', 'tuna'].some(meat => normalizedName.includes(meat))) {
      return 'Meat';
    }
    if (['tomato', 'onion', 'pepper', 'lettuce', 'spinach', 'carrot'].some(veg => normalizedName.includes(veg))) {
      return 'Vegetables';
    }
    if (['apple', 'banana', 'orange', 'berry', 'grape'].some(fruit => normalizedName.includes(fruit))) {
      return 'Fruits';
    }
    if (['milk', 'cheese', 'yogurt', 'butter', 'cream'].some(dairy => normalizedName.includes(dairy))) {
      return 'Dairy';
    }
    if (['rice', 'pasta', 'bread', 'flour', 'oats'].some(grain => normalizedName.includes(grain))) {
      return 'Grains';
    }
    if (['oil', 'vinegar', 'sauce', 'spice', 'herb'].some(pantry => normalizedName.includes(pantry))) {
      return 'Pantry';
    }
    
    return 'Other';
  }

  private getSuggestedUnit(ingredient: string): string {
    const normalizedName = ingredient.toLowerCase();
    
    if (['milk', 'juice', 'oil', 'vinegar'].some(liquid => normalizedName.includes(liquid))) {
      return 'bottle';
    }
    if (['bread', 'cheese', 'butter'].some(packaged => normalizedName.includes(packaged))) {
      return 'package';
    }
    if (['chicken', 'beef', 'fish'].some(meat => normalizedName.includes(meat))) {
      return 'lb';
    }
    
    return 'pcs';
  }

  private getComplementaryIngredients(itemName: string, category: string): string[] {
    const complementaryMap: Record<string, string[]> = {
      'tomato': ['basil', 'mozzarella', 'olive oil'],
      'chicken': ['rice', 'vegetables', 'herbs'],
      'pasta': ['tomato sauce', 'cheese', 'herbs'],
      'rice': ['soy sauce', 'vegetables', 'protein'],
      'bread': ['butter', 'jam', 'cheese'],
      'egg': ['cheese', 'vegetables', 'bread'],
      'spinach': ['garlic', 'lemon', 'cheese'],
      'mushroom': ['garlic', 'herbs', 'cream'],
      'onion': ['garlic', 'herbs', 'oil'],
      'banana': ['peanut butter', 'oats', 'yogurt']
    };

    const normalizedName = itemName.toLowerCase();
    for (const [key, complements] of Object.entries(complementaryMap)) {
      if (normalizedName.includes(key)) {
        return complements;
      }
    }

    return [];
  }

  private getSeasonalProduce(month: number) {
    const seasonalMap: Record<number, any[]> = {
      0: [ // January
        { name: 'Oranges', category: 'Fruits', unit: 'bag', price: 3.99, savings: '30%', recipes: ['Orange Chicken', 'Fruit Salad'] },
        { name: 'Brussels Sprouts', category: 'Vegetables', unit: 'bag', price: 4.49, savings: '25%', recipes: ['Roasted Vegetables'] },
        { name: 'Sweet Potatoes', category: 'Vegetables', unit: 'bag', price: 2.99, savings: '20%', recipes: ['Baked Sweet Potato'] }
      ],
      1: [ // February
        { name: 'Broccoli', category: 'Vegetables', unit: 'head', price: 2.49, savings: '25%', recipes: ['Stir Fry', 'Steamed Broccoli'] },
        { name: 'Grapefruit', category: 'Fruits', unit: 'bag', price: 3.49, savings: '30%', recipes: ['Citrus Salad'] },
        { name: 'Cabbage', category: 'Vegetables', unit: 'head', price: 1.99, savings: '35%', recipes: ['Coleslaw', 'Stir Fry'] }
      ],
      2: [ // March
        { name: 'Asparagus', category: 'Vegetables', unit: 'bunch', price: 3.99, savings: '40%', recipes: ['Roasted Asparagus', 'Spring Salad'] },
        { name: 'Artichokes', category: 'Vegetables', unit: 'each', price: 2.49, savings: '30%', recipes: ['Stuffed Artichokes'] },
        { name: 'Spinach', category: 'Vegetables', unit: 'bag', price: 2.99, savings: '20%', recipes: ['Spinach Salad', 'Green Smoothie'] }
      ],
      3: [ // April
        { name: 'Strawberries', category: 'Fruits', unit: 'container', price: 4.99, savings: '35%', recipes: ['Berry Parfait', 'Strawberry Shortcake'] },
        { name: 'Radishes', category: 'Vegetables', unit: 'bunch', price: 1.49, savings: '25%', recipes: ['Spring Salad'] },
        { name: 'Peas', category: 'Vegetables', unit: 'bag', price: 3.49, savings: '30%', recipes: ['Pea Soup', 'Stir Fry'] }
      ],
      4: [ // May
        { name: 'Lettuce', category: 'Vegetables', unit: 'head', price: 1.99, savings: '20%', recipes: ['Garden Salad', 'Lettuce Wraps'] },
        { name: 'Rhubarb', category: 'Fruits', unit: 'bunch', price: 3.99, savings: '40%', recipes: ['Rhubarb Pie'] },
        { name: 'Spring Onions', category: 'Vegetables', unit: 'bunch', price: 1.99, savings: '25%', recipes: ['Stir Fry', 'Salads'] }
      ],
      5: [ // June
        { name: 'Tomatoes', category: 'Vegetables', unit: 'lb', price: 3.49, savings: '30%', recipes: ['Caprese Salad', 'Pasta Sauce'] },
        { name: 'Blueberries', category: 'Fruits', unit: 'container', price: 4.99, savings: '25%', recipes: ['Blueberry Pancakes', 'Smoothies'] },
        { name: 'Zucchini', category: 'Vegetables', unit: 'each', price: 1.49, savings: '35%', recipes: ['Zucchini Bread', 'Grilled Vegetables'] }
      ],
      6: [ // July
        { name: 'Corn', category: 'Vegetables', unit: 'ears', price: 2.99, savings: '40%', recipes: ['Grilled Corn', 'Corn Salad'] },
        { name: 'Peaches', category: 'Fruits', unit: 'bag', price: 4.49, savings: '30%', recipes: ['Peach Cobbler', 'Fruit Salad'] },
        { name: 'Bell Peppers', category: 'Vegetables', unit: 'bag', price: 3.99, savings: '25%', recipes: ['Stuffed Peppers', 'Fajitas'] }
      ],
      7: [ // August
        { name: 'Watermelon', category: 'Fruits', unit: 'whole', price: 5.99, savings: '35%', recipes: ['Watermelon Salad', 'Fresh Juice'] },
        { name: 'Eggplant', category: 'Vegetables', unit: 'each', price: 2.99, savings: '30%', recipes: ['Eggplant Parmesan', 'Ratatouille'] },
        { name: 'Cucumbers', category: 'Vegetables', unit: 'bag', price: 2.49, savings: '20%', recipes: ['Cucumber Salad', 'Gazpacho'] }
      ],
      8: [ // September
        { name: 'Apples', category: 'Fruits', unit: 'bag', price: 3.99, savings: '25%', recipes: ['Apple Pie', 'Apple Sauce'] },
        { name: 'Carrots', category: 'Vegetables', unit: 'bag', price: 2.49, savings: '30%', recipes: ['Roasted Carrots', 'Carrot Cake'] },
        { name: 'Cauliflower', category: 'Vegetables', unit: 'head', price: 3.49, savings: '35%', recipes: ['Cauliflower Rice', 'Roasted Cauliflower'] }
      ],
      9: [ // October
        { name: 'Pumpkin', category: 'Vegetables', unit: 'each', price: 4.99, savings: '40%', recipes: ['Pumpkin Soup', 'Pumpkin Pie'] },
        { name: 'Pears', category: 'Fruits', unit: 'bag', price: 4.49, savings: '25%', recipes: ['Poached Pears', 'Pear Tart'] },
        { name: 'Beets', category: 'Vegetables', unit: 'bunch', price: 2.99, savings: '30%', recipes: ['Beet Salad', 'Roasted Beets'] }
      ],
      10: [ // November
        { name: 'Cranberries', category: 'Fruits', unit: 'bag', price: 3.49, savings: '35%', recipes: ['Cranberry Sauce', 'Holiday Stuffing'] },
        { name: 'Turkey', category: 'Meat', unit: 'lb', price: 12.99, savings: '20%', recipes: ['Thanksgiving Turkey', 'Turkey Soup'] },
        { name: 'Potatoes', category: 'Vegetables', unit: 'bag', price: 3.99, savings: '25%', recipes: ['Mashed Potatoes', 'Baked Potato'] }
      ],
      11: [ // December
        { name: 'Pomegranate', category: 'Fruits', unit: 'each', price: 2.99, savings: '30%', recipes: ['Winter Salad', 'Holiday Punch'] },
        { name: 'Winter Squash', category: 'Vegetables', unit: 'each', price: 3.49, savings: '35%', recipes: ['Roasted Squash', 'Squash Soup'] },
        { name: 'Chestnuts', category: 'Nuts', unit: 'bag', price: 5.99, savings: '25%', recipes: ['Roasted Chestnuts', 'Holiday Stuffing'] }
      ]
    };

    return seasonalMap[month] || [];
  }

  private async cacheSuggestions(householdId: string, suggestions: SmartSuggestion[]): Promise<void> {
    try {
      // Store suggestions in a simple cache (could be enhanced with proper storage)
      const cacheKey = `smart_suggestions_${householdId}`;
      const cacheData = {
        suggestions,
        timestamp: Date.now(),
        expires: Date.now() + (30 * 60 * 1000) // 30 minutes
      };
      
      // For now, just log the caching (in production, you'd use AsyncStorage or similar)
      console.log(`💾 Cached ${suggestions.length} suggestions for household ${householdId}`);
      
      // Store in memory for this session
      this.suggestionCache = this.suggestionCache || new Map();
      this.suggestionCache.set(cacheKey, cacheData);
      
    } catch (error) {
      console.error('Error caching suggestions:', error);
    }
  }

  private async getCachedSuggestions(householdId: string): Promise<SmartSuggestion[]> {
    try {
      const cacheKey = `smart_suggestions_${householdId}`;
      this.suggestionCache = this.suggestionCache || new Map();
      
      const cached = this.suggestionCache.get(cacheKey);
      
      if (cached && cached.expires > Date.now()) {
        console.log(`🎯 Using cached suggestions for household ${householdId}`);
        return cached.suggestions;
      }
      
      console.log(`⏰ Cache expired or missing for household ${householdId}`);
      return [];
      
    } catch (error) {
      console.error('Error retrieving cached suggestions:', error);
      return [];
    }
  }

  /**
   * Invalidate cached suggestions when shopping list changes
   */
  async invalidateSuggestionsCache(householdId: string): Promise<void> {
    try {
      const cacheKey = `smart_suggestions_${householdId}`;
      this.suggestionCache = this.suggestionCache || new Map();
      this.suggestionCache.delete(cacheKey);
      console.log(`🗑️ Invalidated suggestions cache for household ${householdId}`);
    } catch (error) {
      console.error('Error invalidating cache:', error);
    }
  }

  // Add cache storage
  private suggestionCache?: Map<string, any>;
}

export const smartShoppingService = new SmartShoppingService(); 