import { Alert } from 'react-native';
import { supabase } from './supabase';
import { stripeService } from './stripe';

export interface ProductData {
  name: string;
  brand?: string;
  category?: string;
  barcode?: string;
  nutrition?: {
    energy_kcal?: number;
    proteins_g?: number;
    carbohydrates_g?: number;
    fat_g?: number;
    fiber_g?: number;
    sugars_g?: number;
    sodium_mg?: number;
  };
  storage_tips?: string;
  expiry_estimate_days?: number;
  source: 'cache' | 'openfoodfacts' | 'openfoodfacts_de' | 'usda' | 'edamam' | 'nutritionix' | 'user_contribution';
  confidence?: number; // 0-1 score for data quality
}

interface APIConfig {
  enabled: boolean;
  priority: number;
  rateLimit: {
    calls: number;
    period: 'minute' | 'hour' | 'day';
    current: number;
    resetTime: number;
  };
  costPerCall?: number;
}

class BarcodeService {
  private apiConfigs: Record<string, APIConfig> = {
    cache: { enabled: true, priority: 1, rateLimit: { calls: 10000, period: 'minute', current: 0, resetTime: 0 } },
    openfoodfacts: { enabled: true, priority: 2, rateLimit: { calls: 100, period: 'minute', current: 0, resetTime: 0 } },
    usda: { enabled: true, priority: 3, rateLimit: { calls: 1000, period: 'hour', current: 0, resetTime: 0 } },
    edamam: { enabled: false, priority: 4, rateLimit: { calls: 1000, period: 'day', current: 0, resetTime: 0 }, costPerCall: 0.005 },
    nutritionix: { enabled: false, priority: 5, rateLimit: { calls: 5000, period: 'day', current: 0, resetTime: 0 }, costPerCall: 0.03 },
  };

  private dailyBudget = 5.00; // $5 daily API budget for launch
  private currentDailySpend = 0;

  async getProductFromBarcode(barcode: string): Promise<ProductData | null> {
    console.log('🔍 Looking up barcode:', barcode);
    
    // Check premium status - only premium users can access nutrition APIs
    try {
      const premiumStatus = await stripeService.getSubscriptionStatus();
      if (!premiumStatus.isActive) {
        console.log('❌ Barcode lookup blocked - Premium required');
        return null;
      }
    } catch (error) {
      console.error('Error checking premium status for barcode lookup:', error);
      return null;
    }
    
    // Try each API in priority order
    const enabledAPIs = Object.entries(this.apiConfigs)
      .filter(([_, config]) => config.enabled)
      .sort(([_, a], [__, b]) => a.priority - b.priority);

    for (const [apiName, config] of enabledAPIs) {
      if (!this.canMakeAPICall(apiName)) {
        console.log(`⏭️ Skipping ${apiName} - rate limit or budget exceeded`);
        continue;
      }

      try {
        const result = await this.callAPI(apiName, 'barcode', barcode);
        if (result && !Array.isArray(result)) {
          await this.cacheResult(barcode, result);
          this.trackAPICall(apiName);
          return result;
        }
      } catch (error) {
        console.warn(`❌ ${apiName} API failed:`, error);
        continue;
      }
    }

    return null;
  }

  async searchFoodSuggestions(query: string, limit = 6): Promise<ProductData[]> {
    console.log('🔍 Searching for:', query);
    
    // Check premium status - only premium users can access nutrition search
    try {
      const premiumStatus = await stripeService.getSubscriptionStatus();
      if (!premiumStatus.isActive) {
        console.log('❌ Food search blocked - Premium required');
        return [];
      }
    } catch (error) {
      console.error('Error checking premium status for food search:', error);
      return [];
    }
    
    // Check cache first
    const cached = await this.searchCache(query, limit);
    if (cached.length >= 3) {
      return cached.slice(0, limit);
    }

    // Get more results from APIs
    const results: ProductData[] = [...cached];
    const needed = limit - cached.length;

    const enabledAPIs = Object.entries(this.apiConfigs)
      .filter(([name, config]) => config.enabled && name !== 'cache')
      .sort(([_, a], [__, b]) => a.priority - b.priority);

    for (const [apiName, config] of enabledAPIs) {
      if (results.length >= limit) break;
      if (!this.canMakeAPICall(apiName)) continue;

      try {
        const apiResults = await this.callAPI(apiName, 'search', query, needed);
        if (apiResults && Array.isArray(apiResults)) {
          results.push(...apiResults);
          this.trackAPICall(apiName);
          
          // Cache search results
          for (const result of apiResults) {
            await this.cacheSearchResult(query, result);
          }
        }
      } catch (error) {
        console.warn(`❌ ${apiName} search failed:`, error);
      }
    }

    return this.deduplicateResults(results).slice(0, limit);
  }

  private canMakeAPICall(apiName: string): boolean {
    const config = this.apiConfigs[apiName];
    if (!config.enabled) return false;

    // Check rate limits
    if (config.rateLimit.current >= config.rateLimit.calls) {
      const now = Date.now();
      if (now < config.rateLimit.resetTime) {
        return false;
      }
      // Reset rate limit
      config.rateLimit.current = 0;
      config.rateLimit.resetTime = this.getNextResetTime(config.rateLimit.period);
    }

    // Check budget for paid APIs
    if (config.costPerCall) {
      if (this.currentDailySpend + config.costPerCall > this.dailyBudget) {
        return false;
      }
    }

    return true;
  }

  private async callAPI(apiName: string, type: 'barcode' | 'search', query: string, limit?: number): Promise<ProductData | ProductData[] | null> {
    switch (apiName) {
      case 'cache':
        return type === 'barcode' ? 
          await this.getCachedBarcode(query) : 
          await this.searchCache(query, limit || 6);

      case 'openfoodfacts':
        return type === 'barcode' ? 
          await this.getFromOpenFoodFacts(query) : 
          await this.searchOpenFoodFacts(query, limit || 6);

      case 'usda':
        return type === 'search' ? await this.searchUSDA(query, limit || 6) : null;

      case 'edamam':
        return await this.callEdamamAPI(type, query, limit);

      case 'nutritionix':
        return await this.callNutritionixAPI(type, query, limit);

      default:
        return null;
    }
  }

  private async getCachedBarcode(barcode: string): Promise<ProductData | null> {
    try {
      const { data, error } = await supabase
        .from('barcode_cache')
        .select('*')
        .eq('barcode', barcode)
        .single();

      if (error || !data) return null;

      return {
        name: data.name,
        brand: data.brand,
        category: data.category,
        barcode: data.barcode,
        nutrition: data.nutrition_data,
        storage_tips: data.storage_tips,
        source: 'cache',
        confidence: data.confidence || 0.8
      };
    } catch {
      return null;
    }
  }

  private async searchCache(query: string, limit: number): Promise<ProductData[]> {
    try {
      const { data, error } = await supabase
        .from('food_search_cache')
        .select('*')
        .textSearch('search_terms', query)
        .limit(limit);

      if (error || !data) return [];

      return data.map(item => ({
        name: item.name,
        brand: item.brand,
        category: item.category,
        nutrition: item.nutrition_data,
        source: 'cache' as const,
        confidence: item.confidence || 0.8
      }));
    } catch {
      return [];
    }
  }

  private async getFromOpenFoodFacts(barcode: string): Promise<ProductData | null> {
    try {
      const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
      const data = await response.json();
      
      if (data.status !== 1 || !data.product) return null;

      const product = data.product;
      return {
        name: product.product_name || 'Unknown Product',
        brand: product.brands,
        category: this.mapOpenFoodFactsCategory(product.categories),
        barcode,
        nutrition: {
          energy_kcal: product.nutriments?.['energy-kcal_100g'],
          proteins_g: product.nutriments?.['proteins_100g'],
          carbohydrates_g: product.nutriments?.['carbohydrates_100g'],
          fat_g: product.nutriments?.['fat_100g'],
          fiber_g: product.nutriments?.['fiber_100g'],
          sugars_g: product.nutriments?.['sugars_100g'],
          sodium_mg: product.nutriments?.['sodium_100g'] * 1000,
        },
        source: 'openfoodfacts',
        confidence: 0.7
      };
    } catch (error) {
      console.error('OpenFoodFacts API error:', error);
      return null;
    }
  }

  private async searchOpenFoodFacts(query: string, limit: number): Promise<ProductData[]> {
    try {
      const response = await fetch(
        `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=${limit}`
      );
      const data = await response.json();
      
      if (!data.products) return [];

      return data.products.map((product: any) => ({
        name: product.product_name || 'Unknown Product',
        brand: product.brands,
        category: this.mapOpenFoodFactsCategory(product.categories),
        nutrition: {
          energy_kcal: product.nutriments?.['energy-kcal_100g'],
          proteins_g: product.nutriments?.['proteins_100g'],
          carbohydrates_g: product.nutriments?.['carbohydrates_100g'],
          fat_g: product.nutriments?.['fat_100g'],
        },
        source: 'openfoodfacts' as const,
        confidence: 0.7
      })).filter((p: ProductData) => p.name !== 'Unknown Product');
    } catch (error) {
      console.error('OpenFoodFacts search error:', error);
      return [];
    }
  }

  private async searchUSDA(query: string, limit: number): Promise<ProductData[]> {
    try {
      // USDA Food Data Central API (free but requires API key)
      const API_KEY = process.env.USDA_API_KEY || 'DEMO_KEY';
      const response = await fetch(
        `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(query)}&pageSize=${limit}&api_key=${API_KEY}`
      );
      const data = await response.json();
      
      if (!data.foods) return [];

      return data.foods.map((food: any) => ({
        name: food.description,
        category: this.mapUSDACategory(food.foodCategory),
        nutrition: this.parseUSDANutrition(food.foodNutrients),
        source: 'usda' as const,
        confidence: 0.9
      }));
    } catch (error) {
      console.error('USDA API error:', error);
      return [];
    }
  }

  // Placeholder for premium APIs (implement when budget allows)
  private async callEdamamAPI(type: string, query: string, limit?: number): Promise<ProductData | ProductData[] | null> {
    // TODO: Implement Edamam Food Database API
    // Requires API key and paid subscription
    return null;
  }

  private async callNutritionixAPI(type: string, query: string, limit?: number): Promise<ProductData | ProductData[] | null> {
    // TODO: Implement Nutritionix API
    // Requires API key and paid subscription
    return null;
  }

  private async cacheResult(barcode: string, product: ProductData): Promise<void> {
    try {
      await supabase.from('barcode_cache').upsert({
        barcode,
        name: product.name,
        brand: product.brand,
        category: product.category,
        nutrition_data: product.nutrition,
        storage_tips: product.storage_tips,
        source: product.source,
        confidence: product.confidence,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    } catch (error) {
      console.warn('Failed to cache barcode result:', error);
    }
  }

  private async cacheSearchResult(query: string, product: ProductData): Promise<void> {
    try {
      await supabase.from('food_search_cache').upsert({
        search_terms: query.toLowerCase(),
        name: product.name,
        brand: product.brand,
        category: product.category,
        nutrition_data: product.nutrition,
        source: product.source,
        confidence: product.confidence,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.warn('Failed to cache search result:', error);
    }
  }

  private trackAPICall(apiName: string): void {
    const config = this.apiConfigs[apiName];
    config.rateLimit.current++;
    
    if (config.costPerCall) {
      this.currentDailySpend += config.costPerCall;
      console.log(`💰 API Cost: $${config.costPerCall.toFixed(3)} | Daily Spend: $${this.currentDailySpend.toFixed(2)}/$${this.dailyBudget}`);
    }
  }

  private getNextResetTime(period: 'minute' | 'hour' | 'day'): number {
    const now = new Date();
    switch (period) {
      case 'minute':
        return new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes() + 1).getTime();
      case 'hour':
        return new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1).getTime();
      case 'day':
        return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime();
    }
  }

  private deduplicateResults(results: ProductData[]): ProductData[] {
    const seen = new Set<string>();
    return results.filter(product => {
      const key = `${product.name.toLowerCase()}-${product.brand?.toLowerCase() || ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private mapOpenFoodFactsCategory(categories: string): string {
    // Map Open Food Facts categories to your app categories
    if (!categories) return 'Other';
    const cat = categories.toLowerCase();
    if (cat.includes('dairy')) return 'Dairy';
    if (cat.includes('fruit') || cat.includes('vegetable')) return 'Produce';
    if (cat.includes('meat') || cat.includes('poultry')) return 'Meat';
    if (cat.includes('fish') || cat.includes('seafood')) return 'Seafood';
    if (cat.includes('beverage') || cat.includes('drink')) return 'Beverages';
    if (cat.includes('frozen')) return 'Frozen';
    return 'Pantry';
  }

  private mapUSDACategory(category: string): string {
    // Similar mapping for USDA categories
    if (!category) return 'Other';
    const cat = category.toLowerCase();
    if (cat.includes('dairy')) return 'Dairy';
    if (cat.includes('fruit') || cat.includes('vegetable')) return 'Produce';
    if (cat.includes('meat') || cat.includes('poultry')) return 'Meat';
    if (cat.includes('fish') || cat.includes('seafood')) return 'Seafood';
    if (cat.includes('beverage')) return 'Beverages';
    return 'Pantry';
  }

  private parseUSDANutrition(nutrients: any[]): any {
    const nutritionMap: any = {};
    
    nutrients?.forEach(nutrient => {
      switch (nutrient.nutrientId) {
        case 1008: // Energy (kcal)
          nutritionMap.energy_kcal = nutrient.value;
          break;
        case 1003: // Protein
          nutritionMap.proteins_g = nutrient.value;
          break;
        case 1005: // Carbohydrates
          nutritionMap.carbohydrates_g = nutrient.value;
          break;
        case 1004: // Total Fat
          nutritionMap.fat_g = nutrient.value;
          break;
        case 1079: // Fiber
          nutritionMap.fiber_g = nutrient.value;
          break;
        case 2000: // Sugars
          nutritionMap.sugars_g = nutrient.value;
          break;
        case 1093: // Sodium
          nutritionMap.sodium_mg = nutrient.value;
          break;
      }
    });

    return nutritionMap;
  }

  // Admin methods for monitoring and configuration
  async getAPIStats(): Promise<any> {
    return {
      apiConfigs: this.apiConfigs,
      dailySpend: this.currentDailySpend,
      budget: this.dailyBudget,
      budgetRemaining: this.dailyBudget - this.currentDailySpend
    };
  }

  updateBudget(newBudget: number): void {
    this.dailyBudget = newBudget;
  }

  enableAPI(apiName: string, enabled: boolean): void {
    if (this.apiConfigs[apiName]) {
      this.apiConfigs[apiName].enabled = enabled;
    }
  }
}

export const barcodeService = new BarcodeService(); 