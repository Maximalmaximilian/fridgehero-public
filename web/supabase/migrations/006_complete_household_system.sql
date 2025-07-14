-- Complete Household System Migration
-- This migration adds all missing functions and fixes household system issues

-- First, let's ensure household_invitations table has all required columns
DO $$
BEGIN
    -- Add invited_user_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'household_invitations' 
                  AND column_name = 'invited_user_id') THEN
        ALTER TABLE household_invitations 
        ADD COLUMN invited_user_id uuid REFERENCES auth.users(id);
    END IF;

    -- Add joined_at column to household_members if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'household_members' 
                  AND column_name = 'joined_at') THEN
        ALTER TABLE household_members 
        ADD COLUMN joined_at timestamp with time zone NOT NULL DEFAULT now();
    END IF;
END $$;

-- Create function to search users for invitation (GDPR compliant)
CREATE OR REPLACE FUNCTION search_users_for_invitation(
    search_term text,
    household_id_param uuid
)
RETURNS TABLE (
    user_id uuid,
    email text,
    username text,
    full_name text,
    avatar_url text,
    is_already_member boolean
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id as user_id,
        CASE 
            -- Only show email if search was by email (GDPR compliance)
            WHEN search_term ILIKE '%@%' AND p.email ILIKE '%' || search_term || '%' THEN p.email
            ELSE NULL::text
        END as email,
        p.username,
        p.full_name,
        p.avatar_url,
        EXISTS(
            SELECT 1 FROM household_members hm 
            WHERE hm.household_id = household_id_param 
            AND hm.user_id = p.id
        ) as is_already_member
    FROM profiles p
    WHERE (
        p.username ILIKE '%' || search_term || '%' 
        OR p.full_name ILIKE '%' || search_term || '%'
        OR (search_term ILIKE '%@%' AND p.email ILIKE '%' || search_term || '%')
    )
    AND p.id != auth.uid() -- Don't include current user
    ORDER BY 
        -- Prioritize exact matches
        CASE WHEN p.username = search_term THEN 1 ELSE 2 END,
        p.full_name, p.username
    LIMIT 20;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to accept household invitation
CREATE OR REPLACE FUNCTION accept_household_invitation(invitation_id uuid)
RETURNS jsonb AS $$
DECLARE
    invitation_record household_invitations%ROWTYPE;
    household_record households%ROWTYPE;
    current_member_count integer;
    result jsonb;
BEGIN
    -- Get invitation details
    SELECT * INTO invitation_record
    FROM household_invitations
    WHERE id = invitation_id 
    AND status = 'pending'
    AND expires_at > NOW();

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Invitation not found or has expired'
        );
    END IF;

    -- Verify user has permission to accept this invitation
    IF invitation_record.invited_user_id IS NOT NULL 
       AND invitation_record.invited_user_id != auth.uid() THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'You are not authorized to accept this invitation'
        );
    END IF;

    -- If invited by email, check if current user's email matches
    IF invitation_record.invited_user_id IS NULL THEN
        -- Check if current user's email matches invitation email
        IF NOT EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND email = invitation_record.invited_email
        ) THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Your email does not match the invitation'
            );
        END IF;
        
        -- Update invitation with user_id
        UPDATE household_invitations 
        SET invited_user_id = auth.uid()
        WHERE id = invitation_id;
    END IF;

    -- Get household details
    SELECT * INTO household_record
    FROM households
    WHERE id = invitation_record.household_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Household not found'
        );
    END IF;

    -- Check if user is already a member
    IF EXISTS (
        SELECT 1 FROM household_members
        WHERE household_id = invitation_record.household_id
        AND user_id = auth.uid()
    ) THEN
        -- Update invitation status but return success
        UPDATE household_invitations
        SET status = 'accepted', responded_at = NOW()
        WHERE id = invitation_id;
        
        RETURN jsonb_build_object(
            'success', true,
            'message', 'You are already a member of this household'
        );
    END IF;

    -- Check household member limit
    SELECT COUNT(*) INTO current_member_count
    FROM household_members
    WHERE household_id = invitation_record.household_id;

    IF current_member_count >= household_record.max_members THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Household has reached its member limit'
        );
    END IF;

    -- Add user to household
    INSERT INTO household_members (household_id, user_id, role, joined_at)
    VALUES (invitation_record.household_id, auth.uid(), 'member', NOW());

    -- Update invitation status
    UPDATE household_invitations
    SET status = 'accepted', responded_at = NOW()
    WHERE id = invitation_id;

    -- Create success notification (if notifications table exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
        INSERT INTO notifications (user_id, type, message, action_data)
        VALUES (
            auth.uid(),
            'household_invitation',
            'Welcome to ' || household_record.name || '! 🏠',
            jsonb_build_object(
                'household_id', household_record.id,
                'household_name', household_record.name,
                'action', 'joined'
            )
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'household_id', household_record.id,
        'household_name', household_record.name
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decline household invitation
CREATE OR REPLACE FUNCTION decline_household_invitation(invitation_id uuid)
RETURNS jsonb AS $$
DECLARE
    invitation_record household_invitations%ROWTYPE;
BEGIN
    -- Get invitation details
    SELECT * INTO invitation_record
    FROM household_invitations
    WHERE id = invitation_id 
    AND status = 'pending';

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Invitation not found'
        );
    END IF;

    -- Verify user has permission to decline this invitation
    IF invitation_record.invited_user_id IS NOT NULL 
       AND invitation_record.invited_user_id != auth.uid() THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'You are not authorized to decline this invitation'
        );
    END IF;

    -- If invited by email, check if current user's email matches
    IF invitation_record.invited_user_id IS NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND email = invitation_record.invited_email
        ) THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Your email does not match the invitation'
            );
        END IF;
        
        -- Update invitation with user_id
        UPDATE household_invitations 
        SET invited_user_id = auth.uid()
        WHERE id = invitation_id;
    END IF;

    -- Update invitation status
    UPDATE household_invitations
    SET status = 'declined', responded_at = NOW()
    WHERE id = invitation_id;

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get household members with details
CREATE OR REPLACE FUNCTION get_household_members(household_id_param uuid)
RETURNS TABLE (
    user_id uuid,
    username text,
    full_name text,
    avatar_url text,
    role text,
    joined_at timestamp with time zone,
    email text -- Only for owners
) AS $$
DECLARE
    current_user_role text;
BEGIN
    -- Get current user's role in this household
    SELECT hm.role INTO current_user_role
    FROM household_members hm
    WHERE hm.household_id = household_id_param 
    AND hm.user_id = auth.uid();

    -- Only household members can view member list
    IF current_user_role IS NULL THEN
        RAISE EXCEPTION 'Access denied: You are not a member of this household';
    END IF;

    RETURN QUERY
    SELECT 
        p.id as user_id,
        p.username,
        p.full_name,
        p.avatar_url,
        hm.role,
        hm.joined_at,
        CASE 
            -- Only show emails to owners for management purposes
            WHEN current_user_role = 'owner' THEN p.email
            ELSE NULL::text
        END as email
    FROM household_members hm
    JOIN profiles p ON p.id = hm.user_id
    WHERE hm.household_id = household_id_param
    ORDER BY 
        CASE WHEN hm.role = 'owner' THEN 1 ELSE 2 END,
        hm.joined_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to remove household member (only owners can do this)
CREATE OR REPLACE FUNCTION remove_household_member(
    household_id_param uuid,
    member_user_id uuid
)
RETURNS jsonb AS $$
DECLARE
    current_user_role text;
    target_user_role text;
    household_name text;
BEGIN
    -- Get current user's role
    SELECT hm.role INTO current_user_role
    FROM household_members hm
    WHERE hm.household_id = household_id_param 
    AND hm.user_id = auth.uid();

    -- Only owners can remove members
    IF current_user_role != 'owner' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Only household owners can remove members'
        );
    END IF;

    -- Get target user's role
    SELECT hm.role INTO target_user_role
    FROM household_members hm
    WHERE hm.household_id = household_id_param 
    AND hm.user_id = member_user_id;

    IF target_user_role IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'User is not a member of this household'
        );
    END IF;

    -- Prevent removing other owners (must transfer ownership first)
    IF target_user_role = 'owner' AND member_user_id != auth.uid() THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Cannot remove other owners. Transfer ownership first.'
        );
    END IF;

    -- Get household name for notification
    SELECT name INTO household_name
    FROM households
    WHERE id = household_id_param;

    -- Remove the member
    DELETE FROM household_members
    WHERE household_id = household_id_param 
    AND user_id = member_user_id;

    -- Send notification to removed user (unless they removed themselves)
    IF member_user_id != auth.uid() AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
        INSERT INTO notifications (user_id, type, message, action_data)
        VALUES (
            member_user_id,
            'household_invitation',
            'You have been removed from ' || household_name,
            jsonb_build_object(
                'household_id', household_id_param,
                'household_name', household_name,
                'action', 'removed'
            )
        );
    END IF;

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update household settings (name, etc.)
CREATE OR REPLACE FUNCTION update_household_settings(
    household_id_param uuid,
    new_name text DEFAULT NULL,
    new_max_members integer DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
    current_user_role text;
    current_member_count integer;
BEGIN
    -- Get current user's role
    SELECT hm.role INTO current_user_role
    FROM household_members hm
    WHERE hm.household_id = household_id_param 
    AND hm.user_id = auth.uid();

    -- Only owners can update household settings
    IF current_user_role != 'owner' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Only household owners can update settings'
        );
    END IF;

    -- Validate new_max_members if provided
    IF new_max_members IS NOT NULL THEN
        -- Check current member count
        SELECT COUNT(*) INTO current_member_count
        FROM household_members
        WHERE household_id = household_id_param;

        -- Don't allow reducing max_members below current count
        IF new_max_members < current_member_count THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Cannot reduce member limit below current member count (' || current_member_count || ')'
            );
        END IF;

        -- Validate max_members limits (simplified check)
        IF new_max_members > 20 THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Maximum member limit is 20'
            );
        END IF;
    END IF;

    -- Update household (add updated_at column check)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'households' AND column_name = 'updated_at') THEN
        UPDATE households
        SET 
            name = COALESCE(new_name, name),
            max_members = COALESCE(new_max_members, max_members),
            updated_at = NOW()
        WHERE id = household_id_param;
    ELSE
        UPDATE households
        SET 
            name = COALESCE(new_name, name),
            max_members = COALESCE(new_max_members, max_members)
        WHERE id = household_id_param;
    END IF;

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to transfer household ownership
CREATE OR REPLACE FUNCTION transfer_household_ownership(
    household_id_param uuid,
    new_owner_user_id uuid
)
RETURNS jsonb AS $$
DECLARE
    current_user_role text;
    target_user_role text;
BEGIN
    -- Get current user's role
    SELECT hm.role INTO current_user_role
    FROM household_members hm
    WHERE hm.household_id = household_id_param 
    AND hm.user_id = auth.uid();

    -- Only current owners can transfer ownership
    IF current_user_role != 'owner' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Only household owners can transfer ownership'
        );
    END IF;

    -- Check if target user is a member
    SELECT hm.role INTO target_user_role
    FROM household_members hm
    WHERE hm.household_id = household_id_param 
    AND hm.user_id = new_owner_user_id;

    IF target_user_role IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Target user is not a member of this household'
        );
    END IF;

    -- Update roles: new owner becomes owner, current owner becomes member
    UPDATE household_members
    SET role = 'member'
    WHERE household_id = household_id_param 
    AND user_id = auth.uid();

    UPDATE household_members
    SET role = 'owner'
    WHERE household_id = household_id_param 
    AND user_id = new_owner_user_id;

    -- Update household's created_by field
    UPDATE households
    SET created_by = new_owner_user_id
    WHERE id = household_id_param;

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS if not already enabled
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE tablename = 'household_invitations' 
        AND rowsecurity = true
    ) THEN
        ALTER TABLE household_invitations ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Drop ALL existing policies to avoid conflicts
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'household_invitations'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON household_invitations';
    END LOOP;
END $$;

-- Create new policies
CREATE POLICY "household_invitations_select_policy"
    ON household_invitations FOR SELECT
    TO authenticated
    USING (
        invited_user_id = auth.uid() 
        OR EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
            AND p.email = invited_email
        )
        OR invited_by = auth.uid()
    );

CREATE POLICY "household_invitations_insert_policy"
    ON household_invitations FOR INSERT
    TO authenticated
    WITH CHECK (
        invited_by = auth.uid()
        AND EXISTS (
            SELECT 1 FROM household_members hm
            WHERE hm.household_id = household_invitations.household_id
            AND hm.user_id = auth.uid()
            AND hm.role = 'owner'
        )
    );

CREATE POLICY "household_invitations_update_policy"
    ON household_invitations FOR UPDATE
    TO authenticated
    USING (
        invited_user_id = auth.uid() 
        OR EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
            AND p.email = invited_email
        )
    );

-- Add trigger to automatically set invited_user_id when invitation is created
CREATE OR REPLACE FUNCTION set_invited_user_id()
RETURNS TRIGGER AS $$
BEGIN
    -- Try to find user by email when invitation is created
    IF NEW.invited_user_id IS NULL AND NEW.invited_email IS NOT NULL THEN
        SELECT id INTO NEW.invited_user_id
        FROM profiles
        WHERE email = NEW.invited_email;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_invited_user_id_trigger ON household_invitations;
CREATE TRIGGER set_invited_user_id_trigger
    BEFORE INSERT ON household_invitations
    FOR EACH ROW
    EXECUTE FUNCTION set_invited_user_id();

-- Add indexes for better performance (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_household_invitations_invited_user_id 
    ON household_invitations(invited_user_id);
CREATE INDEX IF NOT EXISTS idx_household_invitations_invited_email 
    ON household_invitations(invited_email);
CREATE INDEX IF NOT EXISTS idx_household_invitations_status 
    ON household_invitations(status);
CREATE INDEX IF NOT EXISTS idx_household_invitations_expires_at 
    ON household_invitations(expires_at);

-- Add partial index for pending invitations
CREATE INDEX IF NOT EXISTS idx_household_invitations_pending 
    ON household_invitations(household_id, invited_email) 
    WHERE status = 'pending';

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION search_users_for_invitation TO authenticated;
GRANT EXECUTE ON FUNCTION accept_household_invitation TO authenticated;
GRANT EXECUTE ON FUNCTION decline_household_invitation TO authenticated;
GRANT EXECUTE ON FUNCTION get_household_members TO authenticated;
GRANT EXECUTE ON FUNCTION remove_household_member TO authenticated;
GRANT EXECUTE ON FUNCTION update_household_settings TO authenticated;
GRANT EXECUTE ON FUNCTION transfer_household_ownership TO authenticated;

-- Log completion
SELECT 'Complete household system migration completed successfully' as status; 