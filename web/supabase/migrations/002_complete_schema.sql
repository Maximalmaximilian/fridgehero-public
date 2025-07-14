-- Add missing columns to existing tables
ALTER TABLE households ADD COLUMN IF NOT EXISTS invite_code TEXT UNIQUE;
ALTER TABLE households ADD COLUMN IF NOT EXISTS max_members INTEGER DEFAULT 5;
ALTER TABLE households ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Update items table with all required columns
ALTER TABLE items ADD COLUMN IF NOT EXISTS barcode TEXT;
ALTER TABLE items ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Other';
ALTER TABLE items ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired', 'deleted'));
ALTER TABLE items ADD COLUMN IF NOT EXISTS added_by UUID REFERENCES auth.users(id);
ALTER TABLE items ADD COLUMN IF NOT EXISTS used_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE items ADD COLUMN IF NOT EXISTS notes TEXT;

-- Create profiles table for user data
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    phone TEXT,
    preferences JSONB DEFAULT '{}',
    
    -- Subscription fields
    subscription_status TEXT CHECK (subscription_status IN ('active', 'canceled', 'incomplete', 'trialing', 'past_due')) DEFAULT NULL,
    subscription_plan_id TEXT,
    subscription_period_end TIMESTAMP WITH TIME ZONE,
    subscription_cancel_at_period_end BOOLEAN DEFAULT FALSE,
    subscription_stripe_customer_id TEXT,
    
    -- Notification preferences
    notifications_enabled BOOLEAN DEFAULT TRUE,
    expiry_reminders BOOLEAN DEFAULT TRUE,
    push_token TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Create waste_tracking table for analytics
CREATE TABLE IF NOT EXISTS waste_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    household_id UUID REFERENCES households(id) ON DELETE CASCADE NOT NULL,
    item_id UUID REFERENCES items(id) ON DELETE SET NULL,
    item_name TEXT NOT NULL,
    category TEXT NOT NULL,
    quantity INTEGER DEFAULT 1,
    action TEXT NOT NULL CHECK (action IN ('used', 'wasted', 'shared')),
    estimated_value DECIMAL(10,2) DEFAULT 0,
    co2_impact DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Create barcode_cache table for product lookups
CREATE TABLE IF NOT EXISTS barcode_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barcode TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    category TEXT,
    brand TEXT,
    image_url TEXT,
    nutrition_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Create recipes table
CREATE TABLE IF NOT EXISTS recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    ingredients TEXT[] NOT NULL,
    instructions TEXT[] NOT NULL,
    prep_time INTEGER, -- in minutes
    cook_time INTEGER, -- in minutes
    servings INTEGER DEFAULT 1,
    difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')) DEFAULT 'medium',
    cuisine_type TEXT,
    diet_tags TEXT[], -- vegetarian, vegan, gluten-free, etc.
    image_url TEXT,
    source_url TEXT,
    rating DECIMAL(3,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW') NOT NULL
);

-- Create user_recipe_interactions table
CREATE TABLE IF NOT EXISTS user_recipe_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE NOT NULL,
    interaction_type TEXT CHECK (interaction_type IN ('viewed', 'favorited', 'cooked', 'shared')) NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    UNIQUE(user_id, recipe_id, interaction_type)
);

-- Create shopping_lists table
CREATE TABLE IF NOT EXISTS shopping_lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID REFERENCES households(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL DEFAULT 'Shopping List',
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Create shopping_list_items table
CREATE TABLE IF NOT EXISTS shopping_list_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shopping_list_id UUID REFERENCES shopping_lists(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    quantity INTEGER DEFAULT 1,
    unit TEXT,
    category TEXT,
    completed BOOLEAN DEFAULT FALSE,
    added_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Create achievements table
CREATE TABLE IF NOT EXISTS achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    milestone INTEGER,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    UNIQUE(user_id, type, milestone)
);

-- Enable RLS on new tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE waste_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE barcode_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_recipe_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY IF NOT EXISTS "Users can view their own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY IF NOT EXISTS "Users can update their own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY IF NOT EXISTS "Users can insert their own profile"
    ON profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Create RLS policies for waste_tracking
CREATE POLICY IF NOT EXISTS "Users can view waste tracking in their households"
    ON waste_tracking FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM household_members
        WHERE household_members.household_id = waste_tracking.household_id
        AND household_members.user_id = auth.uid()
    ));

CREATE POLICY IF NOT EXISTS "Users can manage waste tracking in their households"
    ON waste_tracking FOR ALL
    USING (EXISTS (
        SELECT 1 FROM household_members
        WHERE household_members.household_id = waste_tracking.household_id
        AND household_members.user_id = auth.uid()
    ));

-- Create RLS policies for barcode_cache (public read, authenticated write)
CREATE POLICY IF NOT EXISTS "Anyone can read barcode cache"
    ON barcode_cache FOR SELECT
    TO public
    USING (true);

CREATE POLICY IF NOT EXISTS "Authenticated users can manage barcode cache"
    ON barcode_cache FOR ALL
    TO authenticated
    USING (true);

-- Create RLS policies for recipes (public read)
CREATE POLICY IF NOT EXISTS "Anyone can read recipes"
    ON recipes FOR SELECT
    TO public
    USING (true);

-- Create RLS policies for user_recipe_interactions
CREATE POLICY IF NOT EXISTS "Users can view their recipe interactions"
    ON user_recipe_interactions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can manage their recipe interactions"
    ON user_recipe_interactions FOR ALL
    USING (auth.uid() = user_id);

-- Create RLS policies for shopping_lists
CREATE POLICY IF NOT EXISTS "Users can view shopping lists in their households"
    ON shopping_lists FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM household_members
        WHERE household_members.household_id = shopping_lists.household_id
        AND household_members.user_id = auth.uid()
    ));

CREATE POLICY IF NOT EXISTS "Users can manage shopping lists in their households"
    ON shopping_lists FOR ALL
    USING (EXISTS (
        SELECT 1 FROM household_members
        WHERE household_members.household_id = shopping_lists.household_id
        AND household_members.user_id = auth.uid()
    ));

-- Create RLS policies for shopping_list_items
CREATE POLICY IF NOT EXISTS "Users can view shopping list items in their households"
    ON shopping_list_items FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM shopping_lists sl
        JOIN household_members hm ON hm.household_id = sl.household_id
        WHERE sl.id = shopping_list_items.shopping_list_id
        AND hm.user_id = auth.uid()
    ));

CREATE POLICY IF NOT EXISTS "Users can manage shopping list items in their households"
    ON shopping_list_items FOR ALL
    USING (EXISTS (
        SELECT 1 FROM shopping_lists sl
        JOIN household_members hm ON hm.household_id = sl.household_id
        WHERE sl.id = shopping_list_items.shopping_list_id
        AND hm.user_id = auth.uid()
    ));

-- Create RLS policies for achievements
CREATE POLICY IF NOT EXISTS "Users can view their achievements"
    ON achievements FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can manage their achievements"
    ON achievements FOR ALL
    USING (auth.uid() = user_id);

-- Create additional indexes for performance
CREATE INDEX IF NOT EXISTS profiles_subscription_status_idx ON profiles(subscription_status);
CREATE INDEX IF NOT EXISTS waste_tracking_household_id_idx ON waste_tracking(household_id);
CREATE INDEX IF NOT EXISTS waste_tracking_user_id_idx ON waste_tracking(user_id);
CREATE INDEX IF NOT EXISTS waste_tracking_created_at_idx ON waste_tracking(created_at);
CREATE INDEX IF NOT EXISTS barcode_cache_barcode_idx ON barcode_cache(barcode);
CREATE INDEX IF NOT EXISTS items_barcode_idx ON items(barcode);
CREATE INDEX IF NOT EXISTS items_category_idx ON items(category);
CREATE INDEX IF NOT EXISTS items_status_idx ON items(status);
CREATE INDEX IF NOT EXISTS recipes_difficulty_idx ON recipes(difficulty);
CREATE INDEX IF NOT EXISTS recipes_rating_idx ON recipes(rating);
CREATE INDEX IF NOT EXISTS user_recipe_interactions_user_id_idx ON user_recipe_interactions(user_id);
CREATE INDEX IF NOT EXISTS achievements_user_id_idx ON achievements(user_id);

-- Add triggers for updated_at columns
CREATE TRIGGER IF NOT EXISTS update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_barcode_cache_updated_at
    BEFORE UPDATE ON barcode_cache
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_recipes_updated_at
    BEFORE UPDATE ON recipes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_shopping_lists_updated_at
    BEFORE UPDATE ON shopping_lists
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to generate invite codes
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TEXT AS $$
BEGIN
    RETURN upper(substring(md5(random()::text) from 1 for 8));
END;
$$ LANGUAGE plpgsql;

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Function to auto-generate invite codes for households
CREATE OR REPLACE FUNCTION set_household_invite_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.invite_code IS NULL THEN
        NEW.invite_code := generate_invite_code();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER IF NOT EXISTS set_household_invite_code_trigger
    BEFORE INSERT ON households
    FOR EACH ROW
    EXECUTE FUNCTION set_household_invite_code(); 