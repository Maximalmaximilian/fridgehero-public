-- Create households table
CREATE TABLE households (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Create household_members table to link users to households
CREATE TABLE household_members (
    household_id UUID REFERENCES households(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'member')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    PRIMARY KEY (household_id, user_id)
);

-- Create items table
CREATE TABLE items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID REFERENCES households(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit TEXT,
    expiry_date DATE,
    storage_location TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Create notifications table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    item_id UUID REFERENCES items(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('expiry_warning', 'expired', 'low_quantity')),
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their households"
    ON households FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM household_members
        WHERE household_members.household_id = households.id
        AND household_members.user_id = auth.uid()
    ));

CREATE POLICY "Users can create households"
    ON households FOR INSERT
    WITH CHECK (TRUE);

CREATE POLICY "Household members can view membership"
    ON household_members FOR SELECT
    USING (user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM household_members hm
        WHERE hm.household_id = household_members.household_id
        AND hm.user_id = auth.uid()
    ));

CREATE POLICY "Users can join households"
    ON household_members FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view items in their households"
    ON items FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM household_members
        WHERE household_members.household_id = items.household_id
        AND household_members.user_id = auth.uid()
    ));

CREATE POLICY "Users can manage items in their households"
    ON items FOR ALL
    USING (EXISTS (
        SELECT 1 FROM household_members
        WHERE household_members.household_id = items.household_id
        AND household_members.user_id = auth.uid()
    ));

CREATE POLICY "Users can view their notifications"
    ON notifications FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can manage their notifications"
    ON notifications FOR ALL
    USING (user_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX items_household_id_idx ON items(household_id);
CREATE INDEX items_expiry_date_idx ON items(expiry_date);
CREATE INDEX notifications_user_id_idx ON notifications(user_id);
CREATE INDEX household_members_user_id_idx ON household_members(user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_households_updated_at
    BEFORE UPDATE ON households
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_items_updated_at
    BEFORE UPDATE ON items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 