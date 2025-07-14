import { supabase } from './supabase';
import { stripeService } from './stripe';

interface FridgeItem {
  id: string;
  name: string;
  category: string;
  expiry_date: string;
  quantity: number;
  unit?: string;
  status: string;
}

interface UserPreferences {
  dietary_restrictions?: string[];
  cuisine_preferences?: string[];
  cooking_skill_level?: 'beginner' | 'intermediate' | 'advanced';
  max_cook_time?: number;
  favorite_ingredients?: string[];
  disliked_ingredients?: string[];
  allergies?: string[];
}

export interface AIRecipe {
  id: string;
  name: string;
  description: string;
  ingredients: Array<{
    name: string;
    quantity: string;
    available: boolean;
    substitution?: string;
  }>;
  instructions: string[];
  prep_time: number;
  cook_time: number;
  servings: number;
  difficulty: 'easy' | 'medium' | 'hard';
  cuisine_type: string;
  diet_tags: string[];
  nutrition_info?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  waste_reduction_score: number;
  creativity_score: number;
  ai_generated: boolean;
  personalization_factors: string[];
}

interface RecipeGenerationOptions {
  focus_expiring_items?: boolean;
  include_shopping_suggestions?: boolean;
  difficulty_preference?: 'easy' | 'medium' | 'hard' | 'any';
  cuisine_style?: string;
  meal_type?: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'dessert';
  dietary_restrictions?: string[];
  max_ingredients?: number;
  creative_mode?: boolean;
}

export class AIRecipeService {
  private openaiApiKey: string = '';
  private maxTokens = 2000;
  
  constructor() {
    // In production, this would be set via environment variables
    // For now, we'll simulate AI responses with enhanced matching
    this.openaiApiKey = process.env.OPENAI_API_KEY || '';
  }

  /**
   * Generate AI-powered recipe recommendations based on fridge contents
   */
  async generateSmartRecipes(
    householdId: string,
    options: RecipeGenerationOptions = {}
  ): Promise<AIRecipe[]> {
    try {
      // Check premium status
      const premiumStatus = await stripeService.getSubscriptionStatus();
      if (!premiumStatus.isActive) {
        throw new Error('AI Recipe Generation is a premium feature');
      }

      // Get user's fridge items
      const fridgeItems = await this.getFridgeItems(householdId);
      
      // Get user preferences
      const userPreferences = await this.getUserPreferences(householdId);
      
      // Get cooking history for personalization
      const cookingHistory = await this.getCookingHistory(householdId);

      // Analyze ingredients and expiry urgency
      const ingredientAnalysis = this.analyzeIngredients(fridgeItems, options);

      // Generate AI recipes (simulated for now, would use OpenAI in production)
      const aiRecipes = await this.generateRecipesWithAI(
        ingredientAnalysis,
        userPreferences,
        cookingHistory,
        options
      );

      // Store generated recipes for future reference
      await this.cacheAIRecipes(householdId, aiRecipes);

      return aiRecipes;
    } catch (error) {
      console.error('Error generating smart recipes:', error);
      throw error;
    }
  }

  /**
   * Get personalized recipe suggestions based on cooking history
   */
  async getPersonalizedSuggestions(householdId: string): Promise<AIRecipe[]> {
    try {
      const cookingHistory = await this.getCookingHistory(householdId);
      const preferences = await this.getUserPreferences(householdId);
      
      return await this.generatePersonalizedRecipes(cookingHistory, preferences);
    } catch (error) {
      console.error('Error getting personalized suggestions:', error);
      return [];
    }
  }

  /**
   * Generate recipe specifically to use expiring items
   */
  async generateExpiryRescueRecipe(
    householdId: string,
    expiringItemIds: string[]
  ): Promise<AIRecipe> {
    try {
      const expiringItems = await this.getSpecificItems(expiringItemIds);
      const allItems = await this.getFridgeItems(householdId);
      const preferences = await this.getUserPreferences(householdId);

      // Focus on using expiring items creatively
      const recipe = await this.createExpiryRescueRecipe(
        expiringItems,
        allItems,
        preferences
      );

      // Save as emergency recipe
      await this.saveEmergencyRecipe(householdId, recipe);

      return recipe;
    } catch (error) {
      console.error('Error generating expiry rescue recipe:', error);
      throw error;
    }
  }

  /**
   * Suggest ingredient substitutions using AI
   */
  async suggestSubstitutions(
    missingIngredients: string[],
    availableItems: FridgeItem[],
    recipeContext: string
  ): Promise<Array<{ingredient: string, substitution: string, confidence: number}>> {
    try {
      const substitutions = [];
      
      for (const ingredient of missingIngredients) {
        const suggestion = await this.findBestSubstitution(
          ingredient,
          availableItems,
          recipeContext
        );
        
        if (suggestion) {
          substitutions.push(suggestion);
        }
      }

      return substitutions;
    } catch (error) {
      console.error('Error suggesting substitutions:', error);
      return [];
    }
  }

  /**
   * Generate meal plan for the week using AI
   */
  async generateWeeklyMealPlan(
    householdId: string,
    preferences: {
      meals_per_day: number;
      budget_conscious: boolean;
      prep_time_preference: 'quick' | 'moderate' | 'elaborate';
    }
  ): Promise<{
    meal_plan: Array<{
      day: string;
      breakfast?: AIRecipe;
      lunch?: AIRecipe;
      dinner?: AIRecipe;
      snacks?: AIRecipe[];
    }>;
    shopping_list: Array<{
      ingredient: string;
      quantity: string;
      estimated_cost: number;
    }>;
    waste_reduction_score: number;
  }> {
    try {
      const fridgeItems = await this.getFridgeItems(householdId);
      const userPrefs = await this.getUserPreferences(householdId);
      
      // Generate balanced meal plan using available items
      const mealPlan = await this.createWeeklyMealPlan(
        fridgeItems,
        userPrefs,
        preferences
      );

      return mealPlan;
    } catch (error) {
      console.error('Error generating meal plan:', error);
      throw error;
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

  private async getSpecificItems(itemIds: string[]): Promise<FridgeItem[]> {
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .in('id', itemIds);

    if (error) throw error;
    return data || [];
  }

  private async getUserPreferences(householdId: string): Promise<UserPreferences> {
    // Get preferences from user profiles in household
    const { data: members } = await supabase
      .from('household_members')
      .select(`
        profiles!inner(
          preferences
        )
      `)
      .eq('household_id', householdId);

    // Combine preferences from all household members
    const combinedPrefs: UserPreferences = {
      dietary_restrictions: [],
      cuisine_preferences: [],
      cooking_skill_level: 'intermediate',
      max_cook_time: 45,
      favorite_ingredients: [],
      disliked_ingredients: [],
      allergies: []
    };

    members?.forEach((member: any) => {
      const prefs = member.profiles?.preferences as UserPreferences;
      if (prefs) {
        combinedPrefs.dietary_restrictions?.push(...(prefs.dietary_restrictions || []));
        combinedPrefs.cuisine_preferences?.push(...(prefs.cuisine_preferences || []));
        combinedPrefs.favorite_ingredients?.push(...(prefs.favorite_ingredients || []));
        combinedPrefs.disliked_ingredients?.push(...(prefs.disliked_ingredients || []));
        combinedPrefs.allergies?.push(...(prefs.allergies || []));
      }
    });

    return combinedPrefs;
  }

  private async getCookingHistory(householdId: string): Promise<any[]> {
    // Get recipe interactions and cooking history
    const { data } = await supabase
      .from('recipe_interactions')
      .select('*')
      .eq('household_id', householdId)
      .order('created_at', { ascending: false })
      .limit(50);

    return data || [];
  }

  private analyzeIngredients(items: FridgeItem[], options: RecipeGenerationOptions) {
    const now = new Date();
    
    const analysis = {
      expiring_soon: items.filter(item => {
        const expiryDate = new Date(item.expiry_date);
        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return daysUntilExpiry <= 3;
      }),
      fresh_items: items.filter(item => {
        const expiryDate = new Date(item.expiry_date);
        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return daysUntilExpiry > 7;
      }),
      protein_sources: items.filter(item => 
        ['meat', 'dairy', 'eggs'].includes(item.category.toLowerCase())
      ),
      vegetables: items.filter(item => 
        item.category.toLowerCase() === 'vegetables'
      ),
      fruits: items.filter(item => 
        item.category.toLowerCase() === 'fruits'
      ),
      pantry_items: items.filter(item => 
        ['grains', 'pantry', 'spices'].includes(item.category.toLowerCase())
      )
    };

    return analysis;
  }

  private async generateRecipesWithAI(
    ingredientAnalysis: any,
    userPreferences: UserPreferences,
    cookingHistory: any[],
    options: RecipeGenerationOptions
  ): Promise<AIRecipe[]> {
    // Simulated AI recipe generation - in production would use OpenAI
    const recipes: AIRecipe[] = [];

    // Priority 1: Use expiring items
    if (ingredientAnalysis.expiring_soon.length > 0) {
      const expiryRecipe = await this.createExpiryFocusedRecipe(
        ingredientAnalysis.expiring_soon,
        ingredientAnalysis,
        userPreferences
      );
      recipes.push(expiryRecipe);
    }

    // Priority 2: Balanced meal with available ingredients
    const balancedRecipe = await this.createBalancedRecipe(
      ingredientAnalysis,
      userPreferences,
      options
    );
    recipes.push(balancedRecipe);

    // Priority 3: Creative fusion recipe
    if (options.creative_mode) {
      const creativeRecipe = await this.createCreativeRecipe(
        ingredientAnalysis,
        userPreferences
      );
      recipes.push(creativeRecipe);
    }

    return recipes;
  }

  private async createExpiryFocusedRecipe(
    expiringItems: FridgeItem[],
    allIngredients: any,
    preferences: UserPreferences
  ): Promise<AIRecipe> {
    // Create a recipe that prioritizes using expiring items
    const mainIngredients = expiringItems.slice(0, 3);
    
    return {
      id: `ai-expiry-${Date.now()}`,
      name: `Rescue Recipe: ${mainIngredients.map(i => i.name).join(' & ')} Delight`,
      description: `A creative dish designed to use your expiring ${mainIngredients.map(i => i.name).join(', ')} before they go to waste.`,
      ingredients: [
        ...mainIngredients.map(item => ({
          name: item.name,
          quantity: `${item.quantity} ${item.unit || 'units'}`,
          available: true
        })),
        {
          name: 'olive oil',
          quantity: '2 tbsp',
          available: true
        },
        {
          name: 'salt and pepper',
          quantity: 'to taste',
          available: true
        }
      ],
      instructions: [
        'Prepare all ingredients by washing and chopping as needed',
        `Start by heating olive oil in a large pan over medium heat`,
        `Add ${mainIngredients[0]?.name} and cook for 3-4 minutes`,
        `Add remaining ingredients and season with salt and pepper`,
        'Cook until everything is heated through and flavors are well combined',
        'Serve hot and enjoy your waste-free meal!'
      ],
      prep_time: 10,
      cook_time: 15,
      servings: 2,
      difficulty: 'easy',
      cuisine_type: 'Fusion',
      diet_tags: preferences.dietary_restrictions || [],
      waste_reduction_score: 95,
      creativity_score: 75,
      ai_generated: true,
      personalization_factors: ['expiring_items', 'dietary_preferences']
    };
  }

  private async createBalancedRecipe(
    ingredientAnalysis: any,
    preferences: UserPreferences,
    options: RecipeGenerationOptions
  ): Promise<AIRecipe> {
    const protein = ingredientAnalysis.protein_sources[0];
    const vegetables = ingredientAnalysis.vegetables.slice(0, 2);
    const pantry = ingredientAnalysis.pantry_items[0];

    return {
      id: `ai-balanced-${Date.now()}`,
      name: `AI-Crafted ${protein?.name || 'Vegetable'} Bowl`,
      description: 'A nutritionally balanced meal created specifically for your available ingredients.',
      ingredients: [
        ...(protein ? [{
          name: protein.name,
          quantity: `${protein.quantity} ${protein.unit || 'serving'}`,
          available: true
        }] : []),
        ...vegetables.map((veg: FridgeItem) => ({
          name: veg.name,
          quantity: `${Math.ceil(veg.quantity / 2)} ${veg.unit || 'pieces'}`,
          available: true
        })),
        ...(pantry ? [{
          name: pantry.name,
          quantity: '1 cup',
          available: true
        }] : [])
      ],
      instructions: [
        'Preheat oven to 400°F if roasting vegetables',
        protein ? `Season and cook ${protein.name} until done` : 'Prepare vegetables as main component',
        'Prepare vegetables by cutting into uniform pieces',
        'Cook vegetables until tender but still crisp',
        'Combine all components in a serving bowl',
        'Season to taste and serve warm'
      ],
      prep_time: 15,
      cook_time: 25,
      servings: 2,
      difficulty: 'medium',
      cuisine_type: 'Modern Healthy',
      diet_tags: preferences.dietary_restrictions || [],
      waste_reduction_score: 80,
      creativity_score: 60,
      ai_generated: true,
      personalization_factors: ['available_ingredients', 'nutrition_balance']
    };
  }

  private async createCreativeRecipe(
    ingredientAnalysis: any,
    preferences: UserPreferences
  ): Promise<AIRecipe> {
    return {
      id: `ai-creative-${Date.now()}`,
      name: 'Fusion Innovation Bowl',
      description: 'An experimental dish that combines unexpected flavors from your available ingredients.',
      ingredients: [
        {
          name: 'Your choice protein',
          quantity: '1 serving',
          available: true
        },
        {
          name: 'Mixed vegetables',
          quantity: '2 cups',
          available: true
        },
        {
          name: 'Creative sauce blend',
          quantity: '3 tbsp',
          available: true
        }
      ],
      instructions: [
        'Let creativity guide you - no strict rules!',
        'Combine flavors you wouldn\'t normally pair',
        'Experiment with cooking methods',
        'Taste and adjust as you go',
        'Document your creation for future reference'
      ],
      prep_time: 20,
      cook_time: 30,
      servings: 2,
      difficulty: 'hard',
      cuisine_type: 'Experimental',
      diet_tags: preferences.dietary_restrictions || [],
      waste_reduction_score: 70,
      creativity_score: 95,
      ai_generated: true,
      personalization_factors: ['creativity_boost', 'experimental_cooking']
    };
  }

  private async findBestSubstitution(
    ingredient: string,
    availableItems: FridgeItem[],
    recipeContext: string
  ): Promise<{ingredient: string, substitution: string, confidence: number} | null> {
    // Smart substitution logic
    const substitutionMap: Record<string, string[]> = {
      'milk': ['almond milk', 'oat milk', 'coconut milk', 'yogurt'],
      'butter': ['olive oil', 'coconut oil', 'avocado'],
      'egg': ['applesauce', 'banana', 'chia seeds'],
      'onion': ['shallot', 'garlic', 'leek'],
      'tomato': ['bell pepper', 'roasted red pepper']
    };

    const normalizedIngredient = ingredient.toLowerCase();
    const possibleSubs = substitutionMap[normalizedIngredient] || [];

    for (const sub of possibleSubs) {
      const found = availableItems.find(item => 
        item.name.toLowerCase().includes(sub.toLowerCase())
      );
      
      if (found) {
        return {
          ingredient,
          substitution: found.name,
          confidence: 0.8
        };
      }
    }

    return null;
  }

  private async createExpiryRescueRecipe(
    expiringItems: FridgeItem[],
    allItems: FridgeItem[],
    preferences: UserPreferences
  ): Promise<AIRecipe> {
    return this.createExpiryFocusedRecipe(expiringItems, { expiring_soon: expiringItems }, preferences);
  }

  private async createWeeklyMealPlan(
    fridgeItems: FridgeItem[],
    userPrefs: UserPreferences,
    preferences: any
  ): Promise<any> {
    // This would be a complex AI-generated meal plan
    // For now, return a simplified structure
    return {
      meal_plan: [],
      shopping_list: [],
      waste_reduction_score: 85
    };
  }

  private async generatePersonalizedRecipes(
    cookingHistory: any[],
    preferences: UserPreferences
  ): Promise<AIRecipe[]> {
    // Generate based on cooking patterns
    return [];
  }

  private async cacheAIRecipes(householdId: string, recipes: AIRecipe[]) {
    // Cache generated recipes for performance
    const cacheData = recipes.map(recipe => ({
      household_id: householdId,
      recipe_data: recipe,
      generated_at: new Date().toISOString(),
      cache_key: `ai-recipe-${recipe.id}`
    }));

    // In production, store in a cache table or Redis
    console.log('Caching AI recipes:', cacheData.length);
  }

  private async saveEmergencyRecipe(householdId: string, recipe: AIRecipe) {
    // Save emergency expiry rescue recipes
    console.log('Saving emergency recipe for household:', householdId);
  }
}

export const aiRecipeService = new AIRecipeService(); 