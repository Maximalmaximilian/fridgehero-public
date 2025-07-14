-- Enhanced barcode cache table for launch optimization
CREATE TABLE IF NOT EXISTS barcode_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  barcode TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  brand TEXT,
  category TEXT,
  nutrition_data JSONB,
  storage_tips TEXT,
  source TEXT NOT NULL CHECK (source IN ('cache', 'openfoodfacts', 'openfoodfacts_de', 'usda', 'edamam', 'nutritionix', 'user_contribution')),
  confidence DECIMAL(3,2) DEFAULT 0.8 CHECK (confidence >= 0 AND confidence <= 1),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Search cache table for food suggestions
CREATE TABLE IF NOT EXISTS food_search_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  search_terms TEXT NOT NULL,
  name TEXT NOT NULL,
  brand TEXT,
  category TEXT,
  nutrition_data JSONB,
  source TEXT NOT NULL CHECK (source IN ('cache', 'openfoodfacts', 'openfoodfacts_de', 'usda', 'edamam', 'nutritionix', 'user_contribution')),
  confidence DECIMAL(3,2) DEFAULT 0.8 CHECK (confidence >= 0 AND confidence <= 1),
  search_count INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- API usage tracking for budget management
CREATE TABLE IF NOT EXISTS api_usage_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  api_name TEXT NOT NULL,
  endpoint_type TEXT NOT NULL CHECK (endpoint_type IN ('barcode', 'search')),
  query TEXT NOT NULL,
  success BOOLEAN NOT NULL,
  cost_usd DECIMAL(10,6) DEFAULT 0,
  response_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_barcode_cache_barcode ON barcode_cache(barcode);
CREATE INDEX IF NOT EXISTS idx_food_search_cache_terms ON food_search_cache USING gin(to_tsvector('english', search_terms));
CREATE INDEX IF NOT EXISTS idx_food_search_cache_name ON food_search_cache USING gin(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_api_usage_log_date ON api_usage_log(DATE(created_at));
CREATE INDEX IF NOT EXISTS idx_api_usage_log_api_name ON api_usage_log(api_name);

-- Update barcode_cache updated_at on changes
CREATE OR REPLACE FUNCTION update_barcode_cache_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_barcode_cache_updated_at
    BEFORE UPDATE ON barcode_cache
    FOR EACH ROW
    EXECUTE FUNCTION update_barcode_cache_updated_at();

-- Update search_count when same search is cached again
CREATE OR REPLACE FUNCTION increment_search_count()
RETURNS TRIGGER AS $$
BEGIN
    -- If this is an update (not insert), increment search count
    IF TG_OP = 'UPDATE' THEN
        NEW.search_count = OLD.search_count + 1;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_increment_search_count
    BEFORE UPDATE ON food_search_cache
    FOR EACH ROW
    EXECUTE FUNCTION increment_search_count(); 