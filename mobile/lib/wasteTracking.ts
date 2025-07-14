import { supabase } from './supabase';

interface WasteTrackingEvent {
  id?: string;
  user_id: string;
  household_id: string;
  item_id: string;
  item_name: string;
  category: string;
  quantity: number;
  action: 'used' | 'wasted' | 'shared';
  estimated_value: number;
  co2_impact: number;
  created_at?: string;
}

interface WasteStats {
  totalItemsSaved: number;
  totalMoneySaved: number;
  totalCO2Saved: number; // in kg
  wasteRate: number; // percentage
  favoriteCategories: string[];
  streakDays: number;
  monthlyTrend: {
    saved: number;
    wasted: number;
    value: number;
  };
}

interface CategoryImpact {
  category: string;
  avgValue: number; // Average value per item in USD
  co2PerKg: number; // CO2 emissions per kg
  avgWeight: number; // Average weight per item in kg
}

// Average impact data for food categories
const CATEGORY_IMPACT: Record<string, CategoryImpact> = {
  'Dairy': { 
    category: 'Dairy', 
    avgValue: 3.50, 
    co2PerKg: 5.0,
    avgWeight: 0.5 
  },
  'Produce': { 
    category: 'Produce', 
    avgValue: 2.25, 
    co2PerKg: 2.1,
    avgWeight: 0.3 
  },
  'Meat': { 
    category: 'Meat', 
    avgValue: 8.00, 
    co2PerKg: 14.5,
    avgWeight: 0.4 
  },
  'Seafood': { 
    category: 'Seafood', 
    avgValue: 12.00, 
    co2PerKg: 6.8,
    avgWeight: 0.3 
  },
  'Pantry': { 
    category: 'Pantry', 
    avgValue: 1.75, 
    co2PerKg: 1.2,
    avgWeight: 0.2 
  },
  'Frozen': { 
    category: 'Frozen', 
    avgValue: 4.25, 
    co2PerKg: 3.8,
    avgWeight: 0.4 
  },
  'Beverages': { 
    category: 'Beverages', 
    avgValue: 2.00, 
    co2PerKg: 0.8,
    avgWeight: 0.5 
  },
  'Other': { 
    category: 'Other', 
    avgValue: 3.00, 
    co2PerKg: 2.0,
    avgWeight: 0.3 
  },
};

class WasteTrackingService {
  /**
   * Record when an item is used (saved from waste)
   */
  async recordItemUsed(item: { 
    id: string; 
    name: string; 
    category: string; 
    quantity: number;
    household_id: string;
  }) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const impact = this.calculateItemImpact(item.category, item.quantity);
      
      const wasteEvent: WasteTrackingEvent = {
        user_id: user.id,
        household_id: item.household_id,
        item_id: item.id,
        item_name: item.name,
        category: item.category,
        quantity: item.quantity,
        action: 'used',
        estimated_value: impact.value,
        co2_impact: impact.co2,
        created_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('waste_tracking')
        .insert([wasteEvent]);

      if (error) {
        console.error('🗑️ Waste Tracking: Failed to record item used:', error);
      } else {
        console.log('🗑️ Waste Tracking: Item used recorded:', item.name);
        
        // Update user achievements
        await this.checkAchievements(user.id);
      }
    } catch (error) {
      console.error('🗑️ Waste Tracking: Error recording item used:', error);
    }
  }

  /**
   * Record when an item expires/is wasted
   */
  async recordItemWasted(item: { 
    id: string; 
    name: string; 
    category: string; 
    quantity: number;
    household_id: string;
  }) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const impact = this.calculateItemImpact(item.category, item.quantity);
      
      const wasteEvent: WasteTrackingEvent = {
        user_id: user.id,
        household_id: item.household_id,
        item_id: item.id,
        item_name: item.name,
        category: item.category,
        quantity: item.quantity,
        action: 'wasted',
        estimated_value: impact.value,
        co2_impact: impact.co2,
        created_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('waste_tracking')
        .insert([wasteEvent]);

      if (error) {
        console.error('🗑️ Waste Tracking: Failed to record item wasted:', error);
      } else {
        console.log('🗑️ Waste Tracking: Item wasted recorded:', item.name);
      }
    } catch (error) {
      console.error('🗑️ Waste Tracking: Error recording item wasted:', error);
    }
  }

  /**
   * Calculate environmental and financial impact of an item
   */
  private calculateItemImpact(category: string, quantity: number = 1) {
    const categoryData = CATEGORY_IMPACT[category] || CATEGORY_IMPACT['Other'];
    
    return {
      value: categoryData.avgValue * quantity,
      co2: categoryData.co2PerKg * categoryData.avgWeight * quantity,
      weight: categoryData.avgWeight * quantity,
    };
  }

  /**
   * Get comprehensive waste statistics for a user
   */
  async getWasteStats(householdId: string): Promise<WasteStats> {
    try {
      const { data: events, error } = await supabase
        .from('waste_tracking')
        .select('*')
        .eq('household_id', householdId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('🗑️ Waste Tracking: Failed to fetch waste stats:', error);
        return this.getDefaultStats();
      }

      if (!events || events.length === 0) {
        return this.getDefaultStats();
      }

      // Calculate stats
      const usedItems = events.filter(e => e.action === 'used');
      const wastedItems = events.filter(e => e.action === 'wasted');
      
      const totalItemsSaved = usedItems.length;
      const totalMoneySaved = usedItems.reduce((sum, event) => sum + (event.estimated_value || 0), 0);
      const totalCO2Saved = usedItems.reduce((sum, event) => sum + (event.co2_impact || 0), 0);
      
      const totalItems = events.length;
      const wasteRate = totalItems > 0 ? (wastedItems.length / totalItems) * 100 : 0;
      
      // Get favorite categories (most used)
      const categoryStats = usedItems.reduce((acc, event) => {
        acc[event.category] = (acc[event.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const favoriteCategories = Object.entries(categoryStats)
        .sort(([,a], [,b]) => (b as number) - (a as number))
        .slice(0, 3)
        .map(([category]) => category);

      // Calculate streak (consecutive days with saved items)
      const streakDays = this.calculateSavingStreak(usedItems);

      // Monthly trend (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentEvents = events.filter(e => 
        new Date(e.created_at!) >= thirtyDaysAgo
      );
      
      const monthlyTrend = {
        saved: recentEvents.filter(e => e.action === 'used').length,
        wasted: recentEvents.filter(e => e.action === 'wasted').length,
        value: recentEvents
          .filter(e => e.action === 'used')
          .reduce((sum, e) => sum + (e.estimated_value || 0), 0),
      };

      return {
        totalItemsSaved,
        totalMoneySaved: Math.round(totalMoneySaved * 100) / 100, // Round to 2 decimals
        totalCO2Saved: Math.round(totalCO2Saved * 100) / 100,
        wasteRate: Math.round(wasteRate * 10) / 10,
        favoriteCategories,
        streakDays,
        monthlyTrend,
      };
    } catch (error) {
      console.error('🗑️ Waste Tracking: Error getting waste stats:', error);
      return this.getDefaultStats();
    }
  }

  /**
   * Calculate consecutive days with saved items
   */
  private calculateSavingStreak(usedItems: WasteTrackingEvent[]): number {
    if (usedItems.length === 0) return 0;

    // Group by date
    const dates = new Set(
      usedItems.map(item => new Date(item.created_at!).toDateString())
    );

    const sortedDates = Array.from(dates).sort((a, b) => 
      new Date(b).getTime() - new Date(a).getTime()
    );

    let streak = 0;
    let currentDate = new Date();
    
    for (const dateStr of sortedDates) {
      const date = new Date(dateStr);
      const daysDiff = Math.floor((currentDate.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === streak || (streak === 0 && daysDiff <= 1)) {
        streak++;
        currentDate = date;
      } else {
        break;
      }
    }

    return streak;
  }

  /**
   * Check and update user achievements
   */
  private async checkAchievements(userId: string) {
    try {
      // Get user's total saved items
      const { data: events } = await supabase
        .from('waste_tracking')
        .select('id, action')
        .eq('user_id', userId)
        .eq('action', 'used');

      if (!events) return;

      const totalSaved = events.length;
      const achievements = [];

      // Define achievement thresholds
      const milestones = [1, 5, 10, 25, 50, 100, 250, 500];
      
      for (const milestone of milestones) {
        if (totalSaved >= milestone) {
          achievements.push({
            type: 'items_saved',
            milestone,
            title: this.getAchievementTitle(milestone),
            description: `Saved ${milestone} items from waste!`,
            unlocked_at: new Date().toISOString(),
          });
        }
      }

      // Save achievements (you would implement achievements table)
      console.log('🏆 Achievements unlocked:', achievements);
    } catch (error) {
      console.error('🗑️ Waste Tracking: Error checking achievements:', error);
    }
  }

  private getAchievementTitle(milestone: number): string {
    const titles: Record<number, string> = {
      1: 'First Save!',
      5: 'Getting Started',
      10: 'Waste Warrior',
      25: 'Eco Champion',
      50: 'Planet Protector',
      100: 'Sustainability Master',
      250: 'Green Guardian',
      500: 'Earth Hero',
    };
    return titles[milestone] || 'Achievement Unlocked!';
  }

  private getDefaultStats(): WasteStats {
    return {
      totalItemsSaved: 0,
      totalMoneySaved: 0,
      totalCO2Saved: 0,
      wasteRate: 0,
      favoriteCategories: [],
      streakDays: 0,
      monthlyTrend: {
        saved: 0,
        wasted: 0,
        value: 0,
      },
    };
  }

  /**
   * Get insights and tips for the user
   */
  async getInsights(householdId: string): Promise<string[]> {
    try {
      const stats = await this.getWasteStats(householdId);
      const insights = [];

      if (stats.totalItemsSaved > 0) {
        insights.push(`💰 You've saved $${stats.totalMoneySaved.toFixed(2)} by using items before they expired!`);
        insights.push(`🌍 Your actions prevented ${stats.totalCO2Saved.toFixed(1)}kg of CO2 emissions!`);
      }

      if (stats.wasteRate > 20) {
        insights.push("💡 Try setting up notifications to remind you about expiring items");
      } else if (stats.wasteRate < 10) {
        insights.push("🌟 Excellent! You're keeping your waste rate very low");
      }

      if (stats.streakDays > 7) {
        insights.push(`🔥 Amazing ${stats.streakDays}-day saving streak! Keep it up!`);
      }

      if (stats.favoriteCategories.length > 0) {
        insights.push(`📊 You're great at managing ${stats.favoriteCategories[0]} items`);
      }

      if (stats.monthlyTrend.saved > stats.monthlyTrend.wasted * 2) {
        insights.push("📈 Your waste reduction is trending in the right direction!");
      }

      return insights;
    } catch (error) {
      console.error('🗑️ Waste Tracking: Error getting insights:', error);
      return ["Start tracking your food usage to see personalized insights!"];
    }
  }

  /**
   * Export user's waste tracking data
   */
  async exportData(householdId: string): Promise<WasteTrackingEvent[]> {
    try {
      const { data: events, error } = await supabase
        .from('waste_tracking')
        .select('*')
        .eq('household_id', householdId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('🗑️ Waste Tracking: Failed to export data:', error);
        return [];
      }

      return events || [];
    } catch (error) {
      console.error('🗑️ Waste Tracking: Error exporting data:', error);
      return [];
    }
  }
}

export const wasteTrackingService = new WasteTrackingService();
export type { WasteStats, WasteTrackingEvent }; 