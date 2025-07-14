-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom types
CREATE TYPE subscription_status AS ENUM ('free', 'premium');
CREATE TYPE item_status AS ENUM ('active', 'used', 'expired', 'trashed');
CREATE TYPE notification_type AS ENUM ('expiry_soon', 'expired', 'system');

-- Create users table (extends Supabase auth.users)
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    subscription_status subscription_status NOT NULL DEFAULT 'free',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create households table
CREATE TABLE public.households (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    invite_code TEXT UNIQUE NOT NULL,
    max_members INTEGER NOT NULL DEFAULT 2,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create household members table
CREATE TABLE public.household_members (
    household_id UUID REFERENCES public.households(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member',
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (household_id, user_id)
);

-- Create items table
CREATE TABLE public.items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id UUID REFERENCES public.households(id) ON DELETE CASCADE,
    added_by UUID REFERENCES public.profiles(id),
    name TEXT NOT NULL,
    barcode TEXT,
    expiry_date DATE NOT NULL,
    category TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    status item_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create recipes table
CREATE TABLE public.recipes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    ingredients JSONB NOT NULL,
    instructions JSONB NOT NULL,
    prep_time INTEGER NOT NULL,
    cook_time INTEGER NOT NULL,
    servings INTEGER NOT NULL,
    image_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create notifications table
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    item_id UUID REFERENCES public.items(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN NOT NULL DEFAULT FALSE,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create barcode cache table
CREATE TABLE public.barcode_cache (
    barcode TEXT PRIMARY KEY,
    product_data JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create waste tracking table
CREATE TABLE public.waste_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id UUID REFERENCES public.households(id) ON DELETE CASCADE,
    item_id UUID REFERENCES public.items(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_items_expiry ON public.items(expiry_date) WHERE status = 'active';
CREATE INDEX idx_items_household ON public.items(household_id);
CREATE INDEX idx_items_barcode ON public.items(barcode) WHERE barcode IS NOT NULL;
CREATE INDEX idx_notifications_user ON public.notifications(user_id, read);
CREATE INDEX idx_household_members_user ON public.household_members(user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_items_updated_at
    BEFORE UPDATE ON public.items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_barcode_cache_updated_at
    BEFORE UPDATE ON public.barcode_cache
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create RLS policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.household_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waste_tracking ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- Households policies
CREATE POLICY "Members can view their households"
    ON public.households FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.household_members
            WHERE household_id = id
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create households"
    ON public.households FOR INSERT
    WITH CHECK (auth.uid() = created_by);

-- Household members policies
CREATE POLICY "Members can view household members"
    ON public.household_members FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.household_members
            WHERE household_id = household_members.household_id
            AND user_id = auth.uid()
        )
    );

-- Items policies
CREATE POLICY "Members can view household items"
    ON public.items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.household_members
            WHERE household_id = items.household_id
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Members can insert household items"
    ON public.items FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.household_members
            WHERE household_id = items.household_id
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Members can update household items"
    ON public.items FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.household_members
            WHERE household_id = items.household_id
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Members can delete household items"
    ON public.items FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.household_members
            WHERE household_id = items.household_id
            AND user_id = auth.uid()
        )
    );

-- Notifications policies
CREATE POLICY "Users can view own notifications"
    ON public.notifications FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
    ON public.notifications FOR UPDATE
    USING (auth.uid() = user_id);

-- Waste tracking policies
CREATE POLICY "Members can view household waste tracking"
    ON public.waste_tracking FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.household_members
            WHERE household_id = waste_tracking.household_id
            AND user_id = auth.uid()
        )
    );

-- Functions
CREATE OR REPLACE FUNCTION get_household_items(
    p_household_id UUID,
    p_status item_status DEFAULT 'active'
) RETURNS SETOF items AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM public.items
    WHERE household_id = p_household_id
    AND status = p_status
    ORDER BY expiry_date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_expiring_items(
    p_days INTEGER DEFAULT 3
) RETURNS SETOF items AS $$
BEGIN
    RETURN QUERY
    SELECT i.*
    FROM public.items i
    JOIN public.household_members hm ON i.household_id = hm.household_id
    WHERE hm.user_id = auth.uid()
    AND i.status = 'active'
    AND i.expiry_date <= CURRENT_DATE + p_days
    AND i.expiry_date >= CURRENT_DATE
    ORDER BY i.expiry_date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 