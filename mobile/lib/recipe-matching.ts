import { supabase } from './supabase';

interface FridgeItem {
  id: string;
  name: string;
  category: string;
  expiry_date: string;
  quantity: number;
  unit?: string;
  status: string;
}

interface Recipe {
  id: string;
  name: string;
  description?: string;
  ingredients: string[];
  instructions: string[];
  prep_time: number;
  cook_time: number;
  servings: number;
  difficulty: 'easy' | 'medium' | 'hard';
  cuisine_type?: string;
  diet_tags: string[];
  rating?: number;
  image_url?: string;
}

interface MatchedRecipe extends Recipe {
  matchScore: number;
  matchingItems: FridgeItem[];
  missingIngredients: string[];
  expiringItemsUsed: FridgeItem[];
  urgencyScore: number;
  availabilityScore: number;
}

interface RecipeMatchingOptions {
  maxResults?: number;
  minMatchScore?: number;
  prioritizeExpiring?: boolean;
  difficultyPreference?: 'easy' | 'medium' | 'hard' | 'any';
  dietaryRestrictions?: string[];
  maxCookTime?: number;
}

class RecipeMatchingService {
  private commonSubstitutions: Record<string, string[]> = {
    // Proteins
    'chicken': ['chicken breast', 'chicken thigh', 'chicken leg', 'rotisserie chicken'],
    'beef': ['ground beef', 'beef steak', 'beef roast', 'stew meat'],
    'fish': ['salmon', 'tuna', 'cod', 'tilapia', 'white fish'],
    'eggs': ['egg', 'chicken eggs'],
    
    // Vegetables
    'onion': ['yellow onion', 'white onion', 'red onion', 'green onion', 'scallions'],
    'pepper': ['bell pepper', 'red pepper', 'green pepper', 'yellow pepper'],
    'tomato': ['tomatoes', 'cherry tomatoes', 'roma tomatoes', 'fresh tomatoes'],
    'garlic': ['garlic cloves', 'minced garlic', 'garlic powder'],
    'ginger': ['fresh ginger', 'ground ginger', 'ginger root'],
    
    // Dairy
    'cheese': ['cheddar cheese', 'mozzarella', 'parmesan', 'swiss cheese', 'gouda'],
    'milk': ['whole milk', 'skim milk', '2% milk', 'almond milk', 'oat milk'],
    'yogurt': ['greek yogurt', 'plain yogurt', 'vanilla yogurt'],
    
    // Pantry items
    'oil': ['olive oil', 'vegetable oil', 'canola oil', 'coconut oil'],
    'vinegar': ['white vinegar', 'apple cider vinegar', 'balsamic vinegar'],
    'flour': ['all-purpose flour', 'whole wheat flour', 'bread flour'],
    
    // Fruits
    'berries': ['strawberries', 'blueberries', 'raspberries', 'blackberries'],
    'citrus': ['lemon', 'lime', 'orange', 'grapefruit'],
    
    // Herbs & Spices (usually available)
    'herbs': ['basil', 'parsley', 'cilantro', 'oregano', 'thyme', 'rosemary'],
    'spices': ['salt', 'pepper', 'cumin', 'paprika', 'garlic powder', 'onion powder']
  };

  private commonPantryItems = [
    'salt', 'pepper', 'olive oil', 'vegetable oil', 'flour', 'sugar', 
    'baking powder', 'baking soda', 'vanilla extract', 'soy sauce',
    'garlic powder', 'onion powder', 'paprika', 'cumin', 'oregano',
    'thyme', 'basil', 'black pepper', 'white pepper'
  ];

  /**
   * Get intelligent recipe recommendations based on user's fridge contents
   */
  async getSmartRecipeRecommendations(
    householdId: string, 
    options: RecipeMatchingOptions = {}
  ): Promise<MatchedRecipe[]> {
    try {
      // Get user's current fridge items
      const fridgeItems = await this.getFridgeItems(householdId);
      
      // Get all recipes from database
      const recipes = await this.getRecipes();
      
      // Match recipes with fridge items
      const matchedRecipes = this.matchRecipesWithFridgeItems(fridgeItems, recipes, options);
      
      // Sort by overall score (combination of match score and urgency)
      const sortedRecipes = matchedRecipes.sort((a, b) => {
        const scoreA = this.calculateOverallScore(a, options);
        const scoreB = this.calculateOverallScore(b, options);
        return scoreB - scoreA;
      });

      return sortedRecipes.slice(0, options.maxResults || 20);
    } catch (error) {
      console.error('Error getting smart recipe recommendations:', error);
      throw error;
    }
  }

  /**
   * Get user's fridge items from database
   */
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

  /**
   * Get recipes from database
   */
  private async getRecipes(): Promise<Recipe[]> {
    const { data, error } = await supabase
      .from('recipes')
      .select('*')
      .order('rating', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Match recipes with available fridge items
   */
  private matchRecipesWithFridgeItems(
    fridgeItems: FridgeItem[],
    recipes: Recipe[],
    options: RecipeMatchingOptions
  ): MatchedRecipe[] {
    return recipes
      .map(recipe => this.analyzeRecipeMatch(recipe, fridgeItems, options))
      .filter(match => match.matchScore >= (options.minMatchScore || 0.2))
      .filter(match => this.passesFilters(match, options));
  }

  /**
   * Analyze how well a recipe matches with available items
   */
  private analyzeRecipeMatch(
    recipe: Recipe, 
    fridgeItems: FridgeItem[], 
    options: RecipeMatchingOptions
  ): MatchedRecipe {
    const matchingItems: FridgeItem[] = [];
    const missingIngredients: string[] = [];
    const expiringItemsUsed: FridgeItem[] = [];
    
    let totalIngredients = recipe.ingredients.length;
    let matchedIngredients = 0;

    // Analyze each recipe ingredient
    for (const ingredient of recipe.ingredients) {
      const normalizedIngredient = this.normalizeIngredientName(ingredient);
      
      // Check if we have this ingredient (or a substitute)
      const matchedItem = this.findMatchingFridgeItem(normalizedIngredient, fridgeItems);
      
      if (matchedItem) {
        matchingItems.push(matchedItem);
        matchedIngredients++;
        
        // Check if this item is expiring soon (within 3 days)
        const daysUntilExpiry = this.getDaysUntilExpiry(matchedItem.expiry_date);
        if (daysUntilExpiry <= 3) {
          expiringItemsUsed.push(matchedItem);
        }
      } else {
        // Check if it's a common pantry item (assume available)
        if (this.isCommonPantryItem(normalizedIngredient)) {
          matchedIngredients++;
        } else {
          missingIngredients.push(ingredient);
        }
      }
    }

    // Calculate scores
    const availabilityScore = matchedIngredients / totalIngredients;
    const urgencyScore = this.calculateUrgencyScore(expiringItemsUsed, fridgeItems);
    const matchScore = this.calculateMatchScore(availabilityScore, urgencyScore, matchingItems.length);

    return {
      ...recipe,
      matchScore,
      matchingItems: this.removeDuplicateItems(matchingItems),
      missingIngredients,
      expiringItemsUsed: this.removeDuplicateItems(expiringItemsUsed),
      urgencyScore,
      availabilityScore
    };
  }

  /**
   * Find matching fridge item for an ingredient
   */
  private findMatchingFridgeItem(ingredient: string, fridgeItems: FridgeItem[]): FridgeItem | null {
    const ingredientLower = ingredient.toLowerCase();
    
    // Direct name match
    let match = fridgeItems.find(item => 
      item.name.toLowerCase().includes(ingredientLower) ||
      ingredientLower.includes(item.name.toLowerCase())
    );
    
    if (match) return match;

    // Check substitutions
    for (const [key, substitutes] of Object.entries(this.commonSubstitutions)) {
      if (ingredientLower.includes(key) || substitutes.some(sub => ingredientLower.includes(sub))) {
        match = fridgeItems.find(item => 
          substitutes.some(sub => 
            item.name.toLowerCase().includes(sub.toLowerCase()) ||
            sub.toLowerCase().includes(item.name.toLowerCase())
          ) ||
          item.name.toLowerCase().includes(key) ||
          key.includes(item.name.toLowerCase())
        );
        
        if (match) return match;
      }
    }

    // Category-based matching for produce
    if (ingredientLower.includes('vegetable') || ingredientLower.includes('fruit')) {
      match = fridgeItems.find(item => 
        item.category.toLowerCase().includes('vegetable') ||
        item.category.toLowerCase().includes('fruit') ||
        item.category.toLowerCase().includes('produce')
      );
    }

    return match || null;
  }

  /**
   * Normalize ingredient name for better matching
   */
  private normalizeIngredientName(ingredient: string): string {
    return ingredient
      .toLowerCase()
      .replace(/^\d+\s*(cup|cups|tbsp|tsp|oz|lb|g|kg|ml|l)\s*/i, '') // Remove quantities
      .replace(/\b(fresh|frozen|dried|canned|organic)\b/gi, '') // Remove descriptors
      .replace(/\b(chopped|diced|sliced|minced|grated)\b/gi, '') // Remove prep methods
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .trim();
  }

  /**
   * Check if ingredient is typically available in pantry
   */
  private isCommonPantryItem(ingredient: string): boolean {
    return this.commonPantryItems.some(pantryItem => 
      ingredient.toLowerCase().includes(pantryItem.toLowerCase())
    );
  }

  /**
   * Calculate urgency score based on expiring items
   */
  private calculateUrgencyScore(expiringItems: FridgeItem[], allItems: FridgeItem[]): number {
    if (expiringItems.length === 0) return 0;
    
    let urgencyScore = 0;
    
    for (const item of expiringItems) {
      const daysUntilExpiry = this.getDaysUntilExpiry(item.expiry_date);
      
      // Higher score for items expiring sooner
      if (daysUntilExpiry <= 0) urgencyScore += 1.0;      // Expired
      else if (daysUntilExpiry <= 1) urgencyScore += 0.8;  // Expires today/tomorrow
      else if (daysUntilExpiry <= 2) urgencyScore += 0.6;  // Expires in 2 days
      else if (daysUntilExpiry <= 3) urgencyScore += 0.4;  // Expires in 3 days
    }
    
    return Math.min(urgencyScore / allItems.length, 1); // Normalize to 0-1
  }

  /**
   * Calculate overall match score
   */
  private calculateMatchScore(
    availabilityScore: number, 
    urgencyScore: number, 
    matchingItemsCount: number
  ): number {
    // Weighted combination of different factors
    const availabilityWeight = 0.6;
    const urgencyWeight = 0.3;
    const quantityWeight = 0.1;
    
    const quantityScore = Math.min(matchingItemsCount / 5, 1); // Bonus for using more items
    
    return (
      availabilityScore * availabilityWeight +
      urgencyScore * urgencyWeight +
      quantityScore * quantityWeight
    );
  }

  /**
   * Calculate overall score for sorting
   */
  private calculateOverallScore(recipe: MatchedRecipe, options: RecipeMatchingOptions): number {
    let score = recipe.matchScore;
    
    // Boost score for expiring items usage
    if (options.prioritizeExpiring && recipe.expiringItemsUsed.length > 0) {
      score += 0.2 * recipe.expiringItemsUsed.length;
    }
    
    // Difficulty preference bonus
    if (options.difficultyPreference && recipe.difficulty === options.difficultyPreference) {
      score += 0.1;
    }
    
    // Rating bonus
    if (recipe.rating) {
      score += (recipe.rating / 5) * 0.1;
    }
    
    return score;
  }

  /**
   * Check if recipe passes user filters
   */
  private passesFilters(recipe: MatchedRecipe, options: RecipeMatchingOptions): boolean {
    // Check cooking time limit
    if (options.maxCookTime && (recipe.prep_time + recipe.cook_time) > options.maxCookTime) {
      return false;
    }
    
    // Check dietary restrictions
    if (options.dietaryRestrictions && options.dietaryRestrictions.length > 0) {
      const hasRestrictedTag = options.dietaryRestrictions.some(restriction =>
        !recipe.diet_tags.includes(restriction)
      );
      if (hasRestrictedTag) return false;
    }
    
    return true;
  }

  /**
   * Get days until expiry
   */
  private getDaysUntilExpiry(expiryDate: string): number {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Remove duplicate items from array
   */
  private removeDuplicateItems(items: FridgeItem[]): FridgeItem[] {
    const seen = new Set();
    return items.filter(item => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }

  /**
   * Get recipes for specific expiring items
   */
  async getRecipesForExpiringItems(householdId: string, days: number = 3): Promise<MatchedRecipe[]> {
    const fridgeItems = await this.getFridgeItems(householdId);
    
    // Filter to only expiring items
    const expiringItems = fridgeItems.filter(item => {
      const daysUntilExpiry = this.getDaysUntilExpiry(item.expiry_date);
      return daysUntilExpiry <= days && daysUntilExpiry >= 0;
    });

    if (expiringItems.length === 0) return [];

    return this.getSmartRecipeRecommendations(householdId, {
      prioritizeExpiring: true,
      minMatchScore: 0.3,
      maxResults: 10
    });
  }

  /**
   * Mark recipe ingredients as used
   */
  async markIngredientsAsUsed(recipeId: string, householdId: string, ingredientIds: string[]): Promise<void> {
    try {
      // Update items status to 'used'
      const { error } = await supabase
        .from('items')
        .update({ 
          status: 'used',
          used_at: new Date().toISOString()
        })
        .in('id', ingredientIds)
        .eq('household_id', householdId);

      if (error) throw error;

      // Log recipe interaction
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('user_recipe_interactions')
          .upsert({
            user_id: user.id,
            recipe_id: recipeId,
            interaction_type: 'cooked',
            created_at: new Date().toISOString()
          });
      }
    } catch (error) {
      console.error('Error marking ingredients as used:', error);
      throw error;
    }
  }
}

export const recipeMatchingService = new RecipeMatchingService();
export type { Recipe, MatchedRecipe, RecipeMatchingOptions, FridgeItem }; 