-- Enhanced Recipe Database Schema for AI-Powered Recipe Recommendations
-- This migration adds advanced features for semantic search, personalization, and analytics

-- Add enhanced columns to existing recipes table (one column at a time)
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS meal_type TEXT CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack', 'dessert'));
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS tags TEXT[];
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS seasonality TEXT[];
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS skill_requirements TEXT[];
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS equipment_needed TEXT[];
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS cost_level TEXT CHECK (cost_level IN ('budget', 'moderate', 'premium')) DEFAULT 'moderate';
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS nutrition_info JSONB;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS ingredient_categories JSONB;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS flavor_profile JSONB;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS is_ai_generated BOOLEAN DEFAULT FALSE;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS ai_confidence_score DECIMAL(3,2);
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS popularity_score INTEGER DEFAULT 0;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS seasonal_boost DECIMAL(3,2) DEFAULT 1.0;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS last_suggested_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS suggestion_count INTEGER DEFAULT 0;

-- Create enhanced ingredients table for better categorization
CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity TEXT,
  unit TEXT,
  category TEXT NOT NULL CHECK (category IN ('protein', 'vegetable', 'fruit', 'grain', 'dairy', 'spice', 'oil', 'condiment', 'herb', 'pantry')),
  is_optional BOOLEAN DEFAULT FALSE,
  importance TEXT CHECK (importance IN ('critical', 'important', 'optional')) DEFAULT 'important',
  substitutes TEXT[],
  allergens TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user preferences table for personalization
CREATE TABLE IF NOT EXISTS user_recipe_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dietary_restrictions TEXT[],
  allergies TEXT[],
  cuisine_preferences TEXT[],
  cooking_skill_level TEXT CHECK (cooking_skill_level IN ('beginner', 'intermediate', 'advanced')) DEFAULT 'intermediate',
  equipment_available TEXT[],
  favorite_ingredients TEXT[],
  disliked_ingredients TEXT[],
  cooking_time_preference INTEGER DEFAULT 45,
  budget_preference TEXT CHECK (budget_preference IN ('budget', 'moderate', 'premium')) DEFAULT 'moderate',
  spice_tolerance TEXT CHECK (spice_tolerance IN ('mild', 'medium', 'hot')) DEFAULT 'medium',
  meal_frequency JSONB, -- breakfast: 7, lunch: 5, dinner: 7, snack: 3 per week
  preferred_serving_sizes INTEGER DEFAULT 2,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create recipe interactions tracking table
CREATE TABLE IF NOT EXISTS user_recipe_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  household_id UUID REFERENCES households(id),
  recipe_id UUID NOT NULL REFERENCES recipes(id),
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('viewed', 'cooked', 'rated', 'saved', 'shared', 'dismissed')),
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  cooking_notes TEXT,
  modifications_made TEXT[],
  ingredients_used UUID[], -- References to actual fridge items used
  waste_prevented BOOLEAN DEFAULT FALSE,
  cost_estimate DECIMAL(6,2),
  cooking_time_actual INTEGER,
  difficulty_felt TEXT CHECK (difficulty_felt IN ('easier', 'as_expected', 'harder')),
  would_cook_again BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create ingredient substitution mappings table
CREATE TABLE IF NOT EXISTS ingredient_substitutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_ingredient TEXT NOT NULL,
  substitute_ingredient TEXT NOT NULL,
  substitution_ratio DECIMAL(4,2) DEFAULT 1.0, -- 1:1, 2:1, etc.
  confidence_score DECIMAL(3,2) NOT NULL, -- 0.0 to 1.0
  taste_impact TEXT CHECK (taste_impact IN ('minimal', 'slight', 'moderate', 'significant')) DEFAULT 'slight',
  dietary_context TEXT[], -- vegan, gluten-free, etc.
  cuisine_context TEXT[], -- works best in which cuisines
  explanation TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(original_ingredient, substitute_ingredient)
);

-- Create recipe similarity/relationships table
CREATE TABLE IF NOT EXISTS recipe_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_a_id UUID NOT NULL REFERENCES recipes(id),
  recipe_b_id UUID NOT NULL REFERENCES recipes(id),
  relationship_type TEXT NOT NULL CHECK (relationship_type IN ('similar', 'variation', 'complement', 'progression')),
  similarity_score DECIMAL(3,2) NOT NULL,
  shared_ingredients TEXT[],
  shared_techniques TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(recipe_a_id, recipe_b_id)
);

-- Create AI-generated recipe suggestions cache
CREATE TABLE IF NOT EXISTS ai_recipe_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id),
  user_id UUID REFERENCES auth.users(id),
  suggested_recipes JSONB NOT NULL, -- Array of recipe matches with scores
  fridge_snapshot JSONB NOT NULL, -- What was in fridge when suggested
  suggestion_context JSONB, -- urgency_focus, creative_mode, etc.
  generation_algorithm TEXT DEFAULT 'enhanced_ai_v1',
  suggested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '6 hours'),
  used BOOLEAN DEFAULT FALSE,
  feedback_score INTEGER CHECK (feedback_score BETWEEN 1 AND 5)
);

-- Create seasonal ingredient calendar
CREATE TABLE IF NOT EXISTS seasonal_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_name TEXT NOT NULL,
  category TEXT NOT NULL,
  season TEXT NOT NULL CHECK (season IN ('spring', 'summer', 'fall', 'winter')),
  peak_months INTEGER[] NOT NULL, -- 1-12 for Jan-Dec
  availability_score DECIMAL(3,2) DEFAULT 1.0,
  price_factor DECIMAL(3,2) DEFAULT 1.0, -- 0.5 = half price, 2.0 = double price
  quality_score DECIMAL(3,2) DEFAULT 1.0,
  regional_data JSONB, -- different regions have different seasons
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create cuisine flavor profiles for better matching
CREATE TABLE IF NOT EXISTS cuisine_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cuisine_name TEXT NOT NULL UNIQUE,
  typical_ingredients TEXT[] NOT NULL,
  typical_spices TEXT[] NOT NULL,
  cooking_methods TEXT[] NOT NULL,
  flavor_characteristics TEXT[] NOT NULL, -- sweet, spicy, umami, etc.
  difficulty_range TEXT[] DEFAULT ARRAY['easy', 'medium'],
  typical_meal_types TEXT[] DEFAULT ARRAY['lunch', 'dinner'],
  region TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Populate ingredient substitution mappings
INSERT INTO ingredient_substitutions (original_ingredient, substitute_ingredient, confidence_score, taste_impact, explanation) VALUES
-- Protein substitutions
('chicken breast', 'turkey breast', 0.95, 'minimal', 'Very similar lean white meat with nearly identical cooking properties'),
('ground beef', 'ground turkey', 0.85, 'slight', 'Leaner alternative with similar texture but milder flavor'),
('eggs', 'flax eggs', 0.70, 'moderate', 'Good binding properties for baking, though texture differs in scrambled preparations'),

-- Dairy substitutions  
('butter', 'olive oil', 0.80, 'slight', 'Use 3/4 the amount. Changes flavor profile but maintains moisture'),
('milk', 'almond milk', 0.90, 'minimal', 'Works well in most recipes, slightly nuttier flavor'),
('heavy cream', 'coconut cream', 0.85, 'slight', 'Rich consistency with tropical notes'),

-- Vegetable substitutions
('onion', 'shallot', 0.95, 'minimal', 'Milder, sweeter flavor but very similar cooking properties'),
('bell pepper', 'poblano pepper', 0.80, 'moderate', 'Adds mild heat and smoky flavor'),
('spinach', 'kale', 0.85, 'slight', 'Heartier texture, requires longer cooking time'),

-- Grain substitutions
('white rice', 'quinoa', 0.75, 'moderate', 'Higher protein content and nuttier flavor'),
('pasta', 'zucchini noodles', 0.60, 'significant', 'Dramatically changes texture and reduces carbs'),

-- Spice substitutions
('fresh ginger', 'ground ginger', 0.70, 'moderate', 'Use 1/4 the amount. Less bright, more earthy flavor');

-- Populate seasonal ingredients
INSERT INTO seasonal_ingredients (ingredient_name, category, season, peak_months, availability_score) VALUES
-- Spring ingredients
('asparagus', 'vegetable', 'spring', ARRAY[3,4,5], 1.0),
('peas', 'vegetable', 'spring', ARRAY[4,5,6], 1.0),
('strawberries', 'fruit', 'spring', ARRAY[4,5,6], 1.0),
('artichoke', 'vegetable', 'spring', ARRAY[3,4,5], 0.9),

-- Summer ingredients
('tomatoes', 'vegetable', 'summer', ARRAY[6,7,8,9], 1.0),
('zucchini', 'vegetable', 'summer', ARRAY[6,7,8], 1.0),
('corn', 'vegetable', 'summer', ARRAY[7,8,9], 1.0),
('berries', 'fruit', 'summer', ARRAY[6,7,8], 1.0),
('peaches', 'fruit', 'summer', ARRAY[6,7,8], 1.0),
('basil', 'herb', 'summer', ARRAY[6,7,8,9], 1.0),

-- Fall ingredients
('pumpkin', 'vegetable', 'fall', ARRAY[9,10,11], 1.0),
('butternut squash', 'vegetable', 'fall', ARRAY[9,10,11,12], 1.0),
('apples', 'fruit', 'fall', ARRAY[9,10,11], 1.0),
('pears', 'fruit', 'fall', ARRAY[9,10,11], 1.0),
('sweet potatoes', 'vegetable', 'fall', ARRAY[9,10,11], 1.0),
('brussels sprouts', 'vegetable', 'fall', ARRAY[10,11,12], 1.0),

-- Winter ingredients
('citrus', 'fruit', 'winter', ARRAY[12,1,2,3], 1.0),
('cabbage', 'vegetable', 'winter', ARRAY[11,12,1,2], 1.0),
('kale', 'vegetable', 'winter', ARRAY[10,11,12,1,2], 1.0),
('pomegranate', 'fruit', 'winter', ARRAY[10,11,12,1], 0.9);

-- Populate cuisine profiles
INSERT INTO cuisine_profiles (cuisine_name, typical_ingredients, typical_spices, cooking_methods, flavor_characteristics) VALUES
('Italian', 
 ARRAY['tomato', 'basil', 'olive oil', 'garlic', 'parmesan', 'pasta', 'mozzarella'],
 ARRAY['oregano', 'thyme', 'rosemary', 'black pepper', 'red pepper flakes'],
 ARRAY['sautéing', 'roasting', 'braising', 'grilling'],
 ARRAY['umami', 'herbal', 'acidic', 'savory']
),
('Asian', 
 ARRAY['soy sauce', 'ginger', 'garlic', 'rice', 'sesame oil', 'green onion', 'mushrooms'],
 ARRAY['star anise', 'five spice', 'white pepper', 'sesame seeds'],
 ARRAY['stir-frying', 'steaming', 'braising', 'deep-frying'],
 ARRAY['umami', 'spicy', 'sweet', 'salty', 'aromatic']
),
('Mexican', 
 ARRAY['cumin', 'chili', 'lime', 'cilantro', 'tomato', 'onion', 'avocado', 'beans'],
 ARRAY['paprika', 'oregano', 'garlic powder', 'chili powder'],
 ARRAY['grilling', 'roasting', 'sautéing'],
 ARRAY['spicy', 'acidic', 'smoky', 'fresh']
),
('Indian', 
 ARRAY['curry powder', 'turmeric', 'ginger', 'garlic', 'onion', 'yogurt', 'rice', 'lentils'],
 ARRAY['garam masala', 'cardamom', 'cinnamon', 'coriander', 'fenugreek'],
 ARRAY['curry-making', 'roasting spices', 'braising', 'steaming'],
 ARRAY['spicy', 'aromatic', 'complex', 'warming']
),
('Mediterranean', 
 ARRAY['olive oil', 'lemon', 'herbs', 'tomato', 'feta', 'olives', 'cucumber'],
 ARRAY['oregano', 'thyme', 'mint', 'sumac', 'za\'atar'],
 ARRAY['grilling', 'roasting', 'braising', 'raw preparation'],
 ARRAY['fresh', 'herbal', 'acidic', 'clean']
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_recipes_meal_type ON recipes(meal_type);
CREATE INDEX IF NOT EXISTS idx_recipes_difficulty ON recipes(difficulty);
CREATE INDEX IF NOT EXISTS idx_recipes_cuisine_type ON recipes(cuisine_type);
CREATE INDEX IF NOT EXISTS idx_recipes_cost_level ON recipes(cost_level);
CREATE INDEX IF NOT EXISTS idx_recipes_tags ON recipes USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_recipes_popularity ON recipes(popularity_score DESC);

CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe_id ON recipe_ingredients(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_category ON recipe_ingredients(category);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_name ON recipe_ingredients(name);

CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_recipe_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_interactions_user_id ON user_recipe_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_interactions_recipe_id ON user_recipe_interactions(recipe_id);
CREATE INDEX IF NOT EXISTS idx_user_interactions_type ON user_recipe_interactions(interaction_type);
CREATE INDEX IF NOT EXISTS idx_user_interactions_created_at ON user_recipe_interactions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_suggestions_household_id ON ai_recipe_suggestions(household_id);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_expires_at ON ai_recipe_suggestions(expires_at);

-- Create functions for recipe intelligence

-- Function to calculate recipe match score
CREATE OR REPLACE FUNCTION calculate_recipe_match_score(
  recipe_ingredients TEXT[],
  available_ingredients TEXT[],
  user_preferences JSONB DEFAULT '{}'::jsonb
) RETURNS DECIMAL AS $$
DECLARE
  total_ingredients INTEGER;
  matched_ingredients INTEGER;
  base_score DECIMAL;
  preference_boost DECIMAL := 0;
BEGIN
  total_ingredients := array_length(recipe_ingredients, 1);
  IF total_ingredients IS NULL OR total_ingredients = 0 THEN
    RETURN 0;
  END IF;
  
  -- Count exact and fuzzy matches
  matched_ingredients := (
    SELECT COUNT(*)
    FROM unnest(recipe_ingredients) AS ri
    WHERE EXISTS (
      SELECT 1 FROM unnest(available_ingredients) AS ai
      WHERE LOWER(ai) LIKE '%' || LOWER(ri) || '%' 
      OR LOWER(ri) LIKE '%' || LOWER(ai) || '%'
    )
  );
  
  base_score := matched_ingredients::DECIMAL / total_ingredients::DECIMAL;
  
  -- Apply preference boost
  IF user_preferences ? 'favorite_ingredients' THEN
    preference_boost := (
      SELECT COUNT(*)::DECIMAL * 0.1
      FROM unnest(recipe_ingredients) AS ri
      WHERE ri = ANY(array(SELECT jsonb_array_elements_text(user_preferences->'favorite_ingredients')))
    );
  END IF;
  
  RETURN LEAST(base_score + preference_boost, 1.0);
END;
$$ LANGUAGE plpgsql;

-- Function to get seasonal boost for recipes
CREATE OR REPLACE FUNCTION get_seasonal_boost(recipe_ingredients TEXT[]) RETURNS DECIMAL AS $$
DECLARE
  current_month INTEGER := EXTRACT(MONTH FROM NOW());
  boost DECIMAL := 1.0;
  seasonal_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO seasonal_count
  FROM seasonal_ingredients si
  WHERE si.ingredient_name = ANY(recipe_ingredients)
  AND current_month = ANY(si.peak_months);
  
  IF seasonal_count > 0 THEN
    boost := 1.0 + (seasonal_count * 0.1); -- 10% boost per seasonal ingredient
  END IF;
  
  RETURN LEAST(boost, 1.5); -- Cap at 50% boost
END;
$$ LANGUAGE plpgsql;

-- Function to update recipe popularity
CREATE OR REPLACE FUNCTION update_recipe_popularity() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.interaction_type IN ('cooked', 'rated', 'saved') THEN
    UPDATE recipes 
    SET 
      popularity_score = popularity_score + 
        CASE NEW.interaction_type
          WHEN 'cooked' THEN 5
          WHEN 'rated' THEN COALESCE(NEW.rating, 0)
          WHEN 'saved' THEN 2
          ELSE 1
        END,
      last_suggested_at = CASE 
        WHEN NEW.interaction_type = 'cooked' THEN NOW()
        ELSE last_suggested_at
      END
    WHERE id = NEW.recipe_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for popularity updates
DROP TRIGGER IF EXISTS trigger_update_recipe_popularity ON user_recipe_interactions;
CREATE TRIGGER trigger_update_recipe_popularity
  AFTER INSERT ON user_recipe_interactions
  FOR EACH ROW EXECUTE FUNCTION update_recipe_popularity();

-- Add RLS (Row Level Security) policies
ALTER TABLE user_recipe_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_recipe_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_recipe_suggestions ENABLE ROW LEVEL SECURITY;

-- Policies for user_recipe_preferences
CREATE POLICY "Users can view own preferences" ON user_recipe_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences" ON user_recipe_preferences
  FOR ALL USING (auth.uid() = user_id);

-- Policies for user_recipe_interactions  
CREATE POLICY "Users can view own interactions" ON user_recipe_interactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own interactions" ON user_recipe_interactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policies for ai_recipe_suggestions
CREATE POLICY "Users can view household suggestions" ON ai_recipe_suggestions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM household_members hm 
      WHERE hm.household_id = ai_recipe_suggestions.household_id 
      AND hm.user_id = auth.uid()
    )
  );

-- Create materialized view for recipe recommendations performance
CREATE MATERIALIZED VIEW IF NOT EXISTS recipe_recommendation_cache AS
SELECT 
  r.id,
  r.name,
  r.cuisine_type,
  r.difficulty,
  r.meal_type,
  r.prep_time + r.cook_time as total_time,
  r.popularity_score,
  array_agg(ri.name) as ingredient_names,
  array_agg(ri.category) as ingredient_categories,
  get_seasonal_boost(array_agg(ri.name)) as seasonal_boost
FROM recipes r
LEFT JOIN recipe_ingredients ri ON r.id = ri.recipe_id
GROUP BY r.id, r.name, r.cuisine_type, r.difficulty, r.meal_type, r.prep_time, r.cook_time, r.popularity_score;

-- Create index on materialized view
CREATE INDEX IF NOT EXISTS idx_recipe_cache_total_time ON recipe_recommendation_cache(total_time);
CREATE INDEX IF NOT EXISTS idx_recipe_cache_seasonal_boost ON recipe_recommendation_cache(seasonal_boost DESC);

-- Refresh the materialized view
REFRESH MATERIALIZED VIEW recipe_recommendation_cache; 