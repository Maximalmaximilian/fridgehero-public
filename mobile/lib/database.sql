-- Update items table to include nutrition data and storage tips
ALTER TABLE items ADD COLUMN nutrition_data JSONB;
ALTER TABLE items ADD COLUMN storage_tips TEXT;

-- Add index for better query performance on nutrition data
CREATE INDEX IF NOT EXISTS idx_items_nutrition_data ON items USING gin(nutrition_data);

-- Add comment for documentation
COMMENT ON COLUMN items.nutrition_data IS 'Nutrition information from Open Food Facts or USDA database (JSON format)';
COMMENT ON COLUMN items.storage_tips IS 'Storage recommendations for the item'; 