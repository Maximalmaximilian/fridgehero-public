-- Migration: Add nutrition data and storage tips to items table
-- Created: 2024-06-01

-- Add nutrition_data column to store JSON nutrition information
ALTER TABLE items ADD COLUMN IF NOT EXISTS nutrition_data JSONB;

-- Add storage_tips column for storage recommendations  
ALTER TABLE items ADD COLUMN IF NOT EXISTS storage_tips TEXT;

-- Add index for better query performance on nutrition data
CREATE INDEX IF NOT EXISTS idx_items_nutrition_data ON items USING gin(nutrition_data);

-- Add comments for documentation
COMMENT ON COLUMN items.nutrition_data IS 'Nutrition information from Open Food Facts or USDA database (JSON format with calories, protein, carbs, fat, etc.)';
COMMENT ON COLUMN items.storage_tips IS 'Storage recommendations for the item (e.g., "Keep refrigerated at 4°C or below")'; 