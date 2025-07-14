import { supabase } from './supabase';

// Enhanced interfaces for better recipe management
export interface EnhancedRecipe {
  id: string;
  name: string;
  description: string;
  ingredients: IngredientDetail[];
  instructions: string[];
  prep_time: number;
  cook_time: number;
  servings: number;
  difficulty: 'easy' | 'medium' | 'hard';
  cuisine_type: string;
  diet_tags: string[];
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'dessert';
  rating?: number;
  image_url?: string;
  nutrition_info?: NutritionInfo;
  tags: string[];
  seasonality: string[];
  skill_requirements: string[];
  equipment_needed: string[];
  cost_level: 'budget' | 'moderate' | 'premium';
}

export interface IngredientDetail {
  name: string;
  quantity: string;
  unit?: string;
  category: IngredientCategory;
  optional: boolean;
  substitutes?: string[];
  importance: 'critical' | 'important' | 'optional';
}

export interface NutritionInfo {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sodium: number;
}

export type IngredientCategory = 
  | 'protein' | 'vegetable' | 'fruit' | 'grain' | 'dairy' 
  | 'spice' | 'oil' | 'condiment' | 'herb' | 'pantry';

export interface SmartRecipeMatch {
  recipe: EnhancedRecipe;
  matchScore: number;
  availabilityScore: number;
  urgencyScore: number;
  creativityScore: number;
  personalizedScore: number;
  missingIngredients: IngredientDetail[];
  availableIngredients: IngredientDetail[];
  substitutionSuggestions: SubstitutionSuggestion[];
  wasteReductionImpact: number;
  estimatedCost: number;
  reasonsToMake: string[];
}

export interface SubstitutionSuggestion {
  originalIngredient: string;
  substitute: string;
  confidence: number;
  impactOnTaste: 'minimal' | 'slight' | 'moderate' | 'significant';
  explanation: string;
}

export interface UserProfile {
  dietary_restrictions: string[];
  allergies: string[];
  cuisine_preferences: string[];
  cooking_skill_level: 'beginner' | 'intermediate' | 'advanced';
  equipment_available: string[];
  favorite_ingredients: string[];
  disliked_ingredients: string[];
  cooking_time_preference: number;
  budget_preference: 'budget' | 'moderate' | 'premium';
  spice_tolerance: 'mild' | 'medium' | 'hot';
}

export interface FridgeItem {
  id: string;
  name: string;
  category: string;
  expiry_date: string;
  quantity: number;
  unit?: string;
  freshness_score: number;
}

export class EnhancedRecipeAI {
  // Advanced ingredient categorization and relationships
  private ingredientRelationships = new Map<string, string[]>([
    // Protein relationships
    ['chicken', ['turkey', 'duck', 'pork', 'beef', 'tofu', 'tempeh']],
    ['beef', ['lamb', 'pork', 'chicken', 'mushrooms', 'lentils']],
    ['fish', ['chicken', 'tofu', 'shrimp', 'scallops']],
    ['eggs', ['tofu', 'chickpea flour', 'flax eggs', 'applesauce']],
    
    // Vegetable relationships
    ['onion', ['shallot', 'leek', 'green onion', 'garlic', 'fennel']],
    ['carrot', ['parsnip', 'sweet potato', 'butternut squash']],
    ['bell pepper', ['poblano', 'jalapeño', 'tomato', 'zucchini']],
    ['spinach', ['kale', 'arugula', 'swiss chard', 'lettuce']],
    ['broccoli', ['cauliflower', 'brussels sprouts', 'asparagus']],
    
    // Grain relationships
    ['rice', ['quinoa', 'bulgur', 'couscous', 'pasta']],
    ['pasta', ['rice', 'quinoa', 'noodles', 'gnocchi']],
    ['bread', ['tortilla', 'naan', 'pita', 'crackers']],
    
    // Dairy relationships
    ['milk', ['almond milk', 'oat milk', 'coconut milk', 'soy milk']],
    ['cheese', ['nutritional yeast', 'cashew cream', 'tofu']],
    ['yogurt', ['coconut yogurt', 'cashew cream', 'silken tofu']],
    
    // Fruit relationships
    ['apple', ['pear', 'peach', 'apricot']],
    ['banana', ['plantain', 'mango', 'avocado']],
    ['lemon', ['lime', 'orange', 'vinegar']],
    ['berries', ['grapes', 'cherries', 'dried fruit']]
  ]);

  private seasonalIngredients = new Map<string, string[]>([
    ['spring', ['asparagus', 'peas', 'artichoke', 'strawberries', 'rhubarb', 'spring onions']],
    ['summer', ['tomatoes', 'zucchini', 'corn', 'berries', 'peaches', 'basil', 'cucumber']],
    ['fall', ['pumpkin', 'squash', 'apples', 'pears', 'sweet potatoes', 'brussels sprouts']],
    ['winter', ['root vegetables', 'citrus', 'cabbage', 'kale', 'pomegranate', 'pears']]
  ]);

  private cuisineIngredientProfiles = new Map<string, string[]>([
    ['italian', ['tomato', 'basil', 'olive oil', 'garlic', 'parmesan', 'pasta', 'oregano']],
    ['asian', ['soy sauce', 'ginger', 'garlic', 'rice', 'sesame oil', 'green onion']],
    ['mexican', ['cumin', 'chili', 'lime', 'cilantro', 'tomato', 'onion', 'avocado']],
    ['indian', ['curry powder', 'turmeric', 'ginger', 'garlic', 'onion', 'yogurt', 'rice']],
    ['mediterranean', ['olive oil', 'lemon', 'herbs', 'tomato', 'feta', 'olives']],
    ['american', ['beef', 'potatoes', 'cheese', 'bacon', 'barbecue sauce']]
  ]);

  async generateSmartRecipeRecommendations(
    householdId: string,
    options: {
      maxResults?: number;
      minMatchScore?: number;
      includeCreative?: boolean;
      urgencyFocus?: boolean;
      personalizedOnly?: boolean;
      dietaryRestrictions?: string[];
    } = {}
  ): Promise<SmartRecipeMatch[]> {
    try {
      // Get user's fridge items and preferences
      const [fridgeItems, userProfile, recipes] = await Promise.all([
        this.getFridgeItems(householdId),
        this.getUserProfile(householdId),
        this.getAllRecipes()
      ]);

      // Generate recipe matches with multiple strategies
      const recipeMatches = await this.analyzeRecipeMatches(
        recipes, 
        fridgeItems, 
        userProfile, 
        options
      );

      // Sort by comprehensive scoring
      const sortedMatches = this.rankRecipeMatches(recipeMatches, options);

      // Apply fallback logic if needed
      const finalMatches = await this.applyFallbackLogic(
        sortedMatches, 
        fridgeItems, 
        userProfile, 
        options
      );

      return finalMatches.slice(0, options.maxResults || 20);

    } catch (error) {
      console.error('Error generating smart recipe recommendations:', error);
      throw error;
    }
  }

  private async analyzeRecipeMatches(
    recipes: EnhancedRecipe[],
    fridgeItems: FridgeItem[],
    userProfile: UserProfile,
    options: any
  ): Promise<SmartRecipeMatch[]> {
    const matches: SmartRecipeMatch[] = [];

    for (const recipe of recipes) {
      const match = await this.calculateRecipeMatch(recipe, fridgeItems, userProfile);
      
      // Apply filters
      if (this.passesFilters(match, userProfile, options)) {
        matches.push(match);
      }
    }

    return matches;
  }

  private async calculateRecipeMatch(
    recipe: EnhancedRecipe,
    fridgeItems: FridgeItem[],
    userProfile: UserProfile
  ): Promise<SmartRecipeMatch> {
    // Analyze ingredient availability with semantic matching
    const ingredientAnalysis = this.analyzeIngredientAvailability(
      recipe.ingredients, 
      fridgeItems
    );

    // Calculate various scores
    const availabilityScore = this.calculateAvailabilityScore(ingredientAnalysis);
    const urgencyScore = this.calculateUrgencyScore(ingredientAnalysis.availableIngredients, fridgeItems);
    const personalizedScore = this.calculatePersonalizationScore(recipe, userProfile);
    const creativityScore = this.calculateCreativityScore(recipe, ingredientAnalysis);
    const wasteReductionImpact = this.calculateWasteReduction(ingredientAnalysis, fridgeItems);

    // Generate substitution suggestions
    const substitutionSuggestions = await this.generateSubstitutionSuggestions(
      ingredientAnalysis.missingIngredients,
      fridgeItems,
      recipe
    );

    // Calculate overall match score
    const matchScore = this.calculateOverallMatchScore({
      availabilityScore,
      urgencyScore,
      personalizedScore,
      creativityScore
    });

    return {
      recipe,
      matchScore,
      availabilityScore,
      urgencyScore,
      creativityScore,
      personalizedScore,
      missingIngredients: ingredientAnalysis.missingIngredients,
      availableIngredients: ingredientAnalysis.availableIngredients,
      substitutionSuggestions,
      wasteReductionImpact,
      estimatedCost: this.estimateRecipeCost(recipe, ingredientAnalysis),
      reasonsToMake: this.generateReasonsToMake(recipe, ingredientAnalysis, userProfile)
    };
  }

  private analyzeIngredientAvailability(
    recipeIngredients: IngredientDetail[],
    fridgeItems: FridgeItem[]
  ) {
    const availableIngredients: IngredientDetail[] = [];
    const missingIngredients: IngredientDetail[] = [];

    for (const ingredient of recipeIngredients) {
      const match = this.findIngredientMatch(ingredient, fridgeItems);
      
      if (match.found) {
        availableIngredients.push(ingredient);
      } else if (!ingredient.optional && ingredient.importance !== 'optional') {
        missingIngredients.push(ingredient);
      }
    }

    return { availableIngredients, missingIngredients };
  }

  private findIngredientMatch(
    ingredient: IngredientDetail,
    fridgeItems: FridgeItem[]
  ): { found: boolean; item?: FridgeItem; confidence: number } {
    // Direct name matching
    const directMatch = fridgeItems.find(item => 
      this.normalizeIngredientName(item.name) === this.normalizeIngredientName(ingredient.name)
    );
    
    if (directMatch) {
      return { found: true, item: directMatch, confidence: 1.0 };
    }

    // Fuzzy matching with relationships
    const relationships = this.ingredientRelationships.get(ingredient.name.toLowerCase()) || [];
    
    for (const related of relationships) {
      const relatedMatch = fridgeItems.find(item =>
        this.normalizeIngredientName(item.name).includes(related.toLowerCase()) ||
        related.toLowerCase().includes(this.normalizeIngredientName(item.name))
      );
      
      if (relatedMatch) {
        return { found: true, item: relatedMatch, confidence: 0.8 };
      }
    }

    // Category-based matching
    const categoryMatch = fridgeItems.find(item =>
      item.category.toLowerCase() === ingredient.category.toLowerCase()
    );
    
    if (categoryMatch) {
      return { found: true, item: categoryMatch, confidence: 0.6 };
    }

    return { found: false, confidence: 0 };
  }

  private calculateAvailabilityScore(analysis: any): number {
    const total = analysis.availableIngredients.length + analysis.missingIngredients.length;
    if (total === 0) return 0;
    return analysis.availableIngredients.length / total;
  }

  private calculateUrgencyScore(
    availableIngredients: IngredientDetail[],
    fridgeItems: FridgeItem[]
  ): number {
    let urgencyScore = 0;
    let totalItems = 0;

    for (const ingredient of availableIngredients) {
      const fridgeItem = fridgeItems.find(item => 
        this.normalizeIngredientName(item.name) === this.normalizeIngredientName(ingredient.name)
      );
      
      if (fridgeItem) {
        const daysUntilExpiry = this.getDaysUntilExpiry(fridgeItem.expiry_date);
        if (daysUntilExpiry <= 3) urgencyScore += 1;
        else if (daysUntilExpiry <= 7) urgencyScore += 0.5;
        totalItems++;
      }
    }

    return totalItems > 0 ? urgencyScore / totalItems : 0;
  }

  private calculatePersonalizationScore(
    recipe: EnhancedRecipe,
    userProfile: UserProfile
  ): number {
    let score = 0;
    let factors = 0;

    // Cuisine preference matching
    if (userProfile.cuisine_preferences.includes(recipe.cuisine_type.toLowerCase())) {
      score += 0.2;
    }
    factors++;

    // Difficulty matching
    const skillMap = { 'beginner': 'easy', 'intermediate': 'medium', 'advanced': 'hard' };
    if (skillMap[userProfile.cooking_skill_level] === recipe.difficulty) {
      score += 0.2;
    }
    factors++;

    // Time preference
    const totalTime = recipe.prep_time + recipe.cook_time;
    if (totalTime <= userProfile.cooking_time_preference) {
      score += 0.2;
    }
    factors++;

    // Favorite ingredients
    const hasPreferredIngredients = recipe.ingredients.some(ing =>
      userProfile.favorite_ingredients.some(fav =>
        ing.name.toLowerCase().includes(fav.toLowerCase())
      )
    );
    if (hasPreferredIngredients) score += 0.2;
    factors++;

    // Dietary restrictions compliance
    const compliesWithDiet = userProfile.dietary_restrictions.every(restriction =>
      recipe.diet_tags.includes(restriction)
    );
    if (compliesWithDiet) score += 0.2;
    factors++;

    return score;
  }

  private calculateCreativityScore(
    recipe: EnhancedRecipe,
    analysis: any
  ): number {
    let creativity = 0;

    // Unusual ingredient combinations
    const uniqueCategories = new Set(
      recipe.ingredients.map(ing => ing.category)
    ).size;
    if (uniqueCategories >= 4) creativity += 0.3;

    // Fusion cuisine
    if (recipe.cuisine_type.toLowerCase().includes('fusion')) {
      creativity += 0.4;
    }

    // Creative use of expiring items
    if (analysis.availableIngredients.length >= 3) {
      creativity += 0.3;
    }

    return Math.min(creativity, 1.0);
  }

  private calculateWasteReduction(
    analysis: any,
    fridgeItems: FridgeItem[]
  ): number {
    let wasteReduction = 0;
    
    for (const ingredient of analysis.availableIngredients) {
      const fridgeItem = fridgeItems.find(item =>
        this.normalizeIngredientName(item.name) === this.normalizeIngredientName(ingredient.name)
      );
      
      if (fridgeItem) {
        const daysUntilExpiry = this.getDaysUntilExpiry(fridgeItem.expiry_date);
        if (daysUntilExpiry <= 2) wasteReduction += 0.4;
        else if (daysUntilExpiry <= 5) wasteReduction += 0.2;
      }
    }

    return Math.min(wasteReduction, 1.0);
  }

  private async generateSubstitutionSuggestions(
    missingIngredients: IngredientDetail[],
    fridgeItems: FridgeItem[],
    recipe: EnhancedRecipe
  ): Promise<SubstitutionSuggestion[]> {
    const suggestions: SubstitutionSuggestion[] = [];

    for (const missing of missingIngredients) {
      const relationships = this.ingredientRelationships.get(missing.name.toLowerCase()) || [];
      
      for (const substitute of relationships) {
        const availableSubstitute = fridgeItems.find(item =>
          this.normalizeIngredientName(item.name).includes(substitute.toLowerCase())
        );

        if (availableSubstitute) {
          suggestions.push({
            originalIngredient: missing.name,
            substitute: availableSubstitute.name,
            confidence: this.calculateSubstitutionConfidence(missing, availableSubstitute, recipe),
            impactOnTaste: this.assessTasteImpact(missing, availableSubstitute),
            explanation: this.generateSubstitutionExplanation(missing, availableSubstitute)
          });
          break; // One substitute per missing ingredient
        }
      }
    }

    return suggestions;
  }

  private calculateOverallMatchScore(scores: {
    availabilityScore: number;
    urgencyScore: number;
    personalizedScore: number;
    creativityScore: number;
  }): number {
    // Weighted scoring system
    return (
      scores.availabilityScore * 0.4 +
      scores.urgencyScore * 0.25 +
      scores.personalizedScore * 0.2 +
      scores.creativityScore * 0.15
    );
  }

  private rankRecipeMatches(
    matches: SmartRecipeMatch[],
    options: any
  ): SmartRecipeMatch[] {
    return matches.sort((a, b) => {
      // Primary sort by match score
      if (Math.abs(a.matchScore - b.matchScore) > 0.1) {
        return b.matchScore - a.matchScore;
      }
      
      // Secondary sort by urgency if close match scores
      if (options.urgencyFocus && Math.abs(a.urgencyScore - b.urgencyScore) > 0.1) {
        return b.urgencyScore - a.urgencyScore;
      }
      
      // Tertiary sort by personalization
      return b.personalizedScore - a.personalizedScore;
    });
  }

  private async applyFallbackLogic(
    matches: SmartRecipeMatch[],
    fridgeItems: FridgeItem[],
    userProfile: UserProfile,
    options: any
  ): Promise<SmartRecipeMatch[]> {
    // If we have good matches, return them
    if (matches.length >= 3 && matches[0].matchScore > 0.6) {
      return matches;
    }

    // Generate creative fallback recipes
    const fallbackRecipes = await this.generateCreativeFallbackRecipes(
      fridgeItems,
      userProfile
    );

    return [...matches, ...fallbackRecipes].slice(0, options.maxResults || 20);
  }

  private async generateCreativeFallbackRecipes(
    fridgeItems: FridgeItem[],
    userProfile: UserProfile
  ): Promise<SmartRecipeMatch[]> {
    const fallbackRecipes: SmartRecipeMatch[] = [];

    // Group ingredients by category
    const proteinItems = fridgeItems.filter(item => item.category.toLowerCase().includes('protein') || item.category.toLowerCase().includes('meat'));
    const vegetables = fridgeItems.filter(item => item.category.toLowerCase().includes('vegetable'));
    const grains = fridgeItems.filter(item => item.category.toLowerCase().includes('grain') || item.category.toLowerCase().includes('pasta'));

    // Generate template-based recipes
    if (proteinItems.length > 0 && vegetables.length > 0) {
      const stirFryRecipe = this.createStirFryTemplate(proteinItems, vegetables, userProfile);
      fallbackRecipes.push(stirFryRecipe);
    }

    if (vegetables.length >= 2) {
      const saladRecipe = this.createSaladTemplate(vegetables, fridgeItems, userProfile);
      fallbackRecipes.push(saladRecipe);
    }

    if (grains.length > 0) {
      const bowlRecipe = this.createBowlTemplate(grains, fridgeItems, userProfile);
      fallbackRecipes.push(bowlRecipe);
    }

    return fallbackRecipes;
  }

  // Helper methods
  private normalizeIngredientName(name: string): string {
    return name.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private getDaysUntilExpiry(expiryDate: string): number {
    const expiry = new Date(expiryDate);
    const now = new Date();
    const diffTime = expiry.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  private passesFilters(
    match: SmartRecipeMatch,
    userProfile: UserProfile,
    options: any
  ): boolean {
    // Dietary restrictions
    if (userProfile.allergies.some(allergy =>
      match.recipe.ingredients.some(ing => 
        ing.name.toLowerCase().includes(allergy.toLowerCase())
      )
    )) {
      return false;
    }

    // Minimum match score
    if (match.matchScore < (options.minMatchScore || 0.2)) {
      return false;
    }

    return true;
  }

  // Placeholder methods for template recipes
  private createStirFryTemplate(proteins: FridgeItem[], vegetables: FridgeItem[], userProfile: UserProfile): SmartRecipeMatch {
    // Implementation for stir-fry template
    return {} as SmartRecipeMatch;
  }

  private createSaladTemplate(vegetables: FridgeItem[], allItems: FridgeItem[], userProfile: UserProfile): SmartRecipeMatch {
    // Implementation for salad template
    return {} as SmartRecipeMatch;
  }

  private createBowlTemplate(grains: FridgeItem[], allItems: FridgeItem[], userProfile: UserProfile): SmartRecipeMatch {
    // Implementation for bowl template
    return {} as SmartRecipeMatch;
  }

  private calculateSubstitutionConfidence(missing: IngredientDetail, substitute: FridgeItem, recipe: EnhancedRecipe): number {
    // Implementation for substitution confidence
    return 0.8;
  }

  private assessTasteImpact(missing: IngredientDetail, substitute: FridgeItem): 'minimal' | 'slight' | 'moderate' | 'significant' {
    // Implementation for taste impact assessment
    return 'slight';
  }

  private generateSubstitutionExplanation(missing: IngredientDetail, substitute: FridgeItem): string {
    return `${substitute.name} can substitute for ${missing.name} with minimal taste impact.`;
  }

  private estimateRecipeCost(recipe: EnhancedRecipe, analysis: any): number {
    // Implementation for cost estimation
    return 12.50;
  }

  private generateReasonsToMake(recipe: EnhancedRecipe, analysis: any, userProfile: UserProfile): string[] {
    const reasons: string[] = [];
    
    if (analysis.availableIngredients.length >= recipe.ingredients.length * 0.8) {
      reasons.push("You have most ingredients already!");
    }
    
    if (recipe.prep_time + recipe.cook_time <= 30) {
      reasons.push("Quick and easy to make");
    }
    
    return reasons;
  }

  private async getFridgeItems(householdId: string): Promise<FridgeItem[]> {
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .eq('household_id', householdId)
      .eq('status', 'active');

    if (error) throw error;
    return (data || []).map(item => ({
      ...item,
      freshness_score: this.calculateFreshnessScore(item.expiry_date)
    }));
  }

  private async getUserProfile(householdId: string): Promise<UserProfile> {
    // Implementation to get user preferences
    return {
      dietary_restrictions: [],
      allergies: [],
      cuisine_preferences: ['italian', 'american'],
      cooking_skill_level: 'intermediate',
      equipment_available: ['oven', 'stovetop', 'microwave'],
      favorite_ingredients: [],
      disliked_ingredients: [],
      cooking_time_preference: 45,
      budget_preference: 'moderate',
      spice_tolerance: 'medium'
    };
  }

  private async getAllRecipes(): Promise<EnhancedRecipe[]> {
    const { data, error } = await supabase
      .from('recipes')
      .select('*');

    if (error) throw error;
    
    // Convert basic recipes to enhanced format
    return (data || []).map(this.convertToEnhancedRecipe);
  }

  private convertToEnhancedRecipe(basicRecipe: any): EnhancedRecipe {
    return {
      ...basicRecipe,
      meal_type: this.inferMealType(basicRecipe.name),
      tags: this.generateTags(basicRecipe),
      seasonality: this.inferSeasonality(basicRecipe.ingredients),
      skill_requirements: this.inferSkillRequirements(basicRecipe),
      equipment_needed: this.inferEquipment(basicRecipe.instructions),
      cost_level: this.inferCostLevel(basicRecipe.ingredients),
      ingredients: this.enhanceIngredients(basicRecipe.ingredients)
    };
  }

  private calculateFreshnessScore(expiryDate: string): number {
    const days = this.getDaysUntilExpiry(expiryDate);
    if (days <= 0) return 0;
    if (days <= 2) return 0.3;
    if (days <= 5) return 0.6;
    if (days <= 10) return 0.8;
    return 1.0;
  }

  private inferMealType(name: string): 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'dessert' {
    const breakfastTerms = ['toast', 'pancake', 'eggs', 'cereal', 'yogurt', 'smoothie'];
    const dessertTerms = ['cookie', 'cake', 'dessert', 'sweet', 'chocolate'];
    const snackTerms = ['chips', 'dip', 'nuts', 'trail'];
    
    const lowerName = name.toLowerCase();
    
    if (breakfastTerms.some(term => lowerName.includes(term))) return 'breakfast';
    if (dessertTerms.some(term => lowerName.includes(term))) return 'dessert';
    if (snackTerms.some(term => lowerName.includes(term))) return 'snack';
    
    // Default lunch vs dinner based on complexity (rough heuristic)
    return 'dinner';
  }

  private generateTags(recipe: any): string[] {
    const tags: string[] = [];
    
    // Add difficulty as tag
    tags.push(recipe.difficulty);
    
    // Add time-based tags
    const totalTime = recipe.prep_time + recipe.cook_time;
    if (totalTime <= 15) tags.push('quick');
    if (totalTime <= 30) tags.push('weeknight');
    
    // Add cuisine tag
    if (recipe.cuisine_type) tags.push(recipe.cuisine_type.toLowerCase());
    
    return tags;
  }

  private inferSeasonality(ingredients: string[]): string[] {
    const seasons: string[] = [];
    
    for (const [season, seasonalItems] of this.seasonalIngredients.entries()) {
      if (seasonalItems.some(item => 
        ingredients.some(ing => ing.toLowerCase().includes(item.toLowerCase()))
      )) {
        seasons.push(season);
      }
    }
    
    return seasons.length > 0 ? seasons : ['year-round'];
  }

  private inferSkillRequirements(recipe: any): string[] {
    const skills: string[] = [];
    
    if (recipe.difficulty === 'hard') {
      skills.push('advanced techniques');
    }
    
    // Could analyze instructions for specific techniques
    const instructions = recipe.instructions.join(' ').toLowerCase();
    if (instructions.includes('sauté')) skills.push('sautéing');
    if (instructions.includes('roast')) skills.push('roasting');
    if (instructions.includes('grill')) skills.push('grilling');
    
    return skills;
  }

  private inferEquipment(instructions: string[]): string[] {
    const equipment: string[] = [];
    const instructionText = instructions.join(' ').toLowerCase();
    
    if (instructionText.includes('oven') || instructionText.includes('bake')) {
      equipment.push('oven');
    }
    if (instructionText.includes('stovetop') || instructionText.includes('pan')) {
      equipment.push('stovetop');
    }
    if (instructionText.includes('grill')) {
      equipment.push('grill');
    }
    if (instructionText.includes('blender')) {
      equipment.push('blender');
    }
    
    return equipment;
  }

  private inferCostLevel(ingredients: string[]): 'budget' | 'moderate' | 'premium' {
    const expensiveIngredients = ['salmon', 'steak', 'truffle', 'lobster', 'saffron'];
    const hasExpensive = ingredients.some(ing => 
      expensiveIngredients.some(exp => ing.toLowerCase().includes(exp))
    );
    
    if (hasExpensive) return 'premium';
    if (ingredients.length > 10) return 'moderate';
    return 'budget';
  }

  private enhanceIngredients(basicIngredients: string[]): IngredientDetail[] {
    return basicIngredients.map(ingredient => ({
      name: ingredient,
      quantity: this.extractQuantity(ingredient),
      unit: this.extractUnit(ingredient),
      category: this.categorizeIngredient(ingredient),
      optional: this.isOptionalIngredient(ingredient),
      substitutes: this.getSubstitutes(ingredient),
      importance: this.assessImportance(ingredient)
    }));
  }

  private extractQuantity(ingredient: string): string {
    const match = ingredient.match(/^(\d+(?:\.\d+)?(?:\/\d+)?)/);
    return match ? match[1] : '1';
  }

  private extractUnit(ingredient: string): string | undefined {
    const units = ['cup', 'cups', 'tbsp', 'tsp', 'lb', 'oz', 'g', 'kg', 'piece', 'pieces'];
    const found = units.find(unit => 
      ingredient.toLowerCase().includes(unit.toLowerCase())
    );
    return found;
  }

  private categorizeIngredient(ingredient: string): IngredientCategory {
    const categories = {
      protein: ['chicken', 'beef', 'fish', 'egg', 'tofu', 'beans'],
      vegetable: ['onion', 'carrot', 'pepper', 'tomato', 'spinach'],
      fruit: ['apple', 'banana', 'berry', 'lemon', 'lime'],
      grain: ['rice', 'pasta', 'bread', 'flour', 'quinoa'],
      dairy: ['milk', 'cheese', 'yogurt', 'butter'],
      spice: ['salt', 'pepper', 'cumin', 'paprika'],
      oil: ['olive oil', 'vegetable oil', 'coconut oil'],
      herb: ['basil', 'parsley', 'cilantro', 'thyme']
    };

    for (const [category, items] of Object.entries(categories)) {
      if (items.some(item => ingredient.toLowerCase().includes(item))) {
        return category as IngredientCategory;
      }
    }

    return 'pantry';
  }

  private isOptionalIngredient(ingredient: string): boolean {
    return ingredient.toLowerCase().includes('optional') || 
           ingredient.toLowerCase().includes('garnish');
  }

  private getSubstitutes(ingredient: string): string[] {
    const normalizedName = this.normalizeIngredientName(ingredient);
    return this.ingredientRelationships.get(normalizedName) || [];
  }

  private assessImportance(ingredient: string): 'critical' | 'important' | 'optional' {
    if (this.isOptionalIngredient(ingredient)) return 'optional';
    
    const criticalCategories = ['protein', 'grain'];
    const category = this.categorizeIngredient(ingredient);
    
    if (criticalCategories.includes(category)) return 'critical';
    return 'important';
  }
}

export const enhancedRecipeAI = new EnhancedRecipeAI(); 