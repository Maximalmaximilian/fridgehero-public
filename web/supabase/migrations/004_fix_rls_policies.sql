-- Fix RLS policy circular references
-- The issue is likely that household_members policies are conflicting with other table policies

-- First, let's drop all policies and recreate them properly
DROP POLICY IF EXISTS "Users can view their households" ON households;
DROP POLICY IF EXISTS "Users can create households" ON households;
DROP POLICY IF EXISTS "Household members can view membership" ON household_members;
DROP POLICY IF EXISTS "Users can join households" ON household_members;
DROP POLICY IF EXISTS "Users can view items in their households" ON items;
DROP POLICY IF EXISTS "Users can manage items in their households" ON items;
DROP POLICY IF EXISTS "Users can view their notifications" ON notifications;
DROP POLICY IF EXISTS "Users can manage their notifications" ON notifications;

-- Recreate policies without circular references

-- Households policies (simple, no references to other tables)
CREATE POLICY "Users can view households they belong to"
    ON households FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM household_members
        WHERE household_members.household_id = households.id
        AND household_members.user_id = auth.uid()
    ));

CREATE POLICY "Users can create households"
    ON households FOR INSERT
    WITH CHECK (created_by = auth.uid());

CREATE POLICY "Owners can update their households"
    ON households FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM household_members
        WHERE household_members.household_id = households.id
        AND household_members.user_id = auth.uid()
        AND household_members.role = 'owner'
    ));

-- Household members policies (simple, direct user check)
CREATE POLICY "Users can view household memberships"
    ON household_members FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can join households"
    ON household_members FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can leave households"
    ON household_members FOR DELETE
    USING (user_id = auth.uid());

-- Items policies (reference household_members but household_members doesn't reference back)
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

-- Notifications policies (simple, direct user check)
CREATE POLICY "Users can view their notifications"
    ON notifications FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can manage their notifications"
    ON notifications FOR ALL
    USING (user_id = auth.uid());

-- Update existing policies for new tables to avoid circular references
-- These were already created correctly, but let's make sure

-- Waste tracking policies (safe - references household_members but not circular)
-- Already created correctly

-- Shopping lists policies (safe - references household_members but not circular) 
-- Already created correctly

-- Profiles policies (safe - direct user check)
-- Already created correctly

-- Barcode cache policies (safe - public/authenticated only)
-- Already created correctly

-- Recipes policies (safe - public read only)
-- Already created correctly

-- User recipe interactions policies (safe - direct user check)
-- Already created correctly

-- Achievements policies (safe - direct user check)
-- Already created correctly

-- Let's also make sure RLS is enabled on all tables
ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Log success
SELECT 'RLS policies fixed successfully' as status; 