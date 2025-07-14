-- Apply nutrition migration to add nutrition_data and storage_tips to items table
-- Run this in your Supabase SQL Editor

-- Add nutrition_data column (JSONB for structured nutrition data)
ALTER TABLE items ADD COLUMN IF NOT EXISTS nutrition_data JSONB;

-- Add storage_tips column (TEXT for storage recommendations)
ALTER TABLE items ADD COLUMN IF NOT EXISTS storage_tips TEXT;

-- Add index for efficient querying of nutrition data
CREATE INDEX IF NOT EXISTS idx_items_nutrition_data ON items USING gin(nutrition_data);

-- Add helpful comments
COMMENT ON COLUMN items.nutrition_data IS 'Nutrition information from Open Food Facts or USDA (calories, protein, carbs, fat per 100g)';
COMMENT ON COLUMN items.storage_tips IS 'Storage recommendations like "Keep refrigerated at 4°C or below"';

-- Verify the changes
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'items' 
AND column_name IN ('nutrition_data', 'storage_tips'); 