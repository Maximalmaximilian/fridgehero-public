-- HOUSEHOLD SYSTEM SQL FUNCTIONS
-- Copy and paste this entire file into your Supabase SQL Editor and run it

-- First, ensure required columns exist
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
    
    -- Add metadata column to households for tracking premium downgrade info
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'households' 
                  AND column_name = 'metadata') THEN
        ALTER TABLE households 
        ADD COLUMN metadata jsonb DEFAULT '{}';
    END IF;
    
    -- Add metadata column to household_members for tracking member removal reasons
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'household_members' 
                  AND column_name = 'metadata') THEN
        ALTER TABLE household_members 
        ADD COLUMN metadata jsonb DEFAULT '{}';
    END IF;
    
    -- Add updated_at column to household_members if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'household_members' 
                  AND column_name = 'updated_at') THEN
        ALTER TABLE household_members 
        ADD COLUMN updated_at timestamp with time zone DEFAULT now();
    END IF;
END $$;

-- 1. SEARCH USERS FOR INVITATION (GDPR compliant)
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

-- 2. GET HOUSEHOLD MEMBERS (with GDPR compliance)
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

-- 3. ACCEPT HOUSEHOLD INVITATION
CREATE OR REPLACE FUNCTION accept_household_invitation(invitation_id uuid)
RETURNS jsonb AS $$
DECLARE
    invitation_record household_invitations%ROWTYPE;
    household_record households%ROWTYPE;
    current_member_count integer;
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

    RETURN jsonb_build_object(
        'success', true,
        'household_id', household_record.id,
        'household_name', household_record.name
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. DECLINE HOUSEHOLD INVITATION
CREATE OR REPLACE FUNCTION decline_household_invitation(invitation_id uuid)
RETURNS jsonb AS $$
DECLARE
    invitation_record household_invitations%ROWTYPE;
BEGIN
    SELECT * INTO invitation_record
    FROM household_invitations
    WHERE id = invitation_id AND status = 'pending';

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invitation not found');
    END IF;

    -- Verify user has permission
    IF invitation_record.invited_user_id IS NOT NULL 
       AND invitation_record.invited_user_id != auth.uid() THEN
        RETURN jsonb_build_object('success', false, 'error', 'You are not authorized to decline this invitation');
    END IF;

    -- If invited by email, check match
    IF invitation_record.invited_user_id IS NULL THEN
        IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND email = invitation_record.invited_email) THEN
            RETURN jsonb_build_object('success', false, 'error', 'Your email does not match the invitation');
        END IF;
        
        UPDATE household_invitations SET invited_user_id = auth.uid() WHERE id = invitation_id;
    END IF;

    -- Update invitation status
    UPDATE household_invitations
    SET status = 'declined', responded_at = NOW()
    WHERE id = invitation_id;

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. REMOVE HOUSEHOLD MEMBER
CREATE OR REPLACE FUNCTION remove_household_member(
    household_id_param uuid,
    member_user_id uuid
)
RETURNS jsonb AS $$
DECLARE
    current_user_role text;
    target_user_role text;
BEGIN
    -- Get current user's role
    SELECT hm.role INTO current_user_role
    FROM household_members hm
    WHERE hm.household_id = household_id_param AND hm.user_id = auth.uid();

    IF current_user_role != 'owner' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Only household owners can remove members');
    END IF;

    -- Get target user's role
    SELECT hm.role INTO target_user_role
    FROM household_members hm
    WHERE hm.household_id = household_id_param AND hm.user_id = member_user_id;

    IF target_user_role IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'User is not a member of this household');
    END IF;

    -- Prevent removing other owners
    IF target_user_role = 'owner' AND member_user_id != auth.uid() THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot remove other owners. Transfer ownership first.');
    END IF;

    -- Remove the member
    DELETE FROM household_members
    WHERE household_id = household_id_param AND user_id = member_user_id;

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. TRANSFER HOUSEHOLD OWNERSHIP
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
    WHERE hm.household_id = household_id_param AND hm.user_id = auth.uid();

    IF current_user_role != 'owner' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Only household owners can transfer ownership');
    END IF;

    -- Check if target user is a member
    SELECT hm.role INTO target_user_role
    FROM household_members hm
    WHERE hm.household_id = household_id_param AND hm.user_id = new_owner_user_id;

    IF target_user_role IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Target user is not a member of this household');
    END IF;

    -- Update roles
    UPDATE household_members SET role = 'member' WHERE household_id = household_id_param AND user_id = auth.uid();
    UPDATE household_members SET role = 'owner' WHERE household_id = household_id_param AND user_id = new_owner_user_id;
    UPDATE households SET created_by = new_owner_user_id WHERE id = household_id_param;

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. UPDATE HOUSEHOLD SETTINGS
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
    WHERE hm.household_id = household_id_param AND hm.user_id = auth.uid();

    IF current_user_role != 'owner' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Only household owners can update settings');
    END IF;

    -- Validate new_max_members if provided
    IF new_max_members IS NOT NULL THEN
        SELECT COUNT(*) INTO current_member_count
        FROM household_members WHERE household_id = household_id_param;

        IF new_max_members < current_member_count THEN
            RETURN jsonb_build_object('success', false, 'error', 'Cannot reduce member limit below current member count');
        END IF;

        IF new_max_members > 20 THEN
            RETURN jsonb_build_object('success', false, 'error', 'Maximum member limit is 20');
        END IF;
    END IF;

    -- Update household
    UPDATE households
    SET 
        name = COALESCE(new_name, name),
        max_members = COALESCE(new_max_members, max_members)
    WHERE id = household_id_param;

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. SWITCH ACTIVE HOUSEHOLD (for Free users - enforces single active household rule)
CREATE OR REPLACE FUNCTION switch_active_household(
    user_id_param uuid,
    new_household_id uuid
)
RETURNS jsonb AS $$
DECLARE
    user_member_record household_members%ROWTYPE;
    current_active_count integer;
BEGIN
    -- Verify user is calling for themselves (security check)
    IF user_id_param != auth.uid() THEN
        RETURN jsonb_build_object('success', false, 'error', 'You can only switch your own active household');
    END IF;

    -- Check if user is a member of the target household
    SELECT * INTO user_member_record
    FROM household_members
    WHERE household_id = new_household_id AND user_id = user_id_param;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'You are not a member of this household');
    END IF;

    -- If household is already active, no need to switch
    IF user_member_record.is_active = true THEN
        RETURN jsonb_build_object(
            'success', true,
            'message', 'Household is already active'
        );
    END IF;

    -- Deactivate ALL other households for this user (enforces single active household rule)
    UPDATE household_members
    SET is_active = false
    WHERE user_id = user_id_param AND household_id != new_household_id;

    -- Activate the selected household
    UPDATE household_members
    SET is_active = true
    WHERE user_id = user_id_param AND household_id = new_household_id;

    -- Verify the switch was successful
    SELECT COUNT(*) INTO current_active_count
    FROM household_members
    WHERE user_id = user_id_param AND is_active = true;

    IF current_active_count != 1 THEN
        -- Rollback and return error
        ROLLBACK;
        RETURN jsonb_build_object('success', false, 'error', 'Failed to switch household - database consistency error');
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'active_household_id', new_household_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. DOWNGRADE PREMIUM HOUSEHOLD (when creator loses Premium status)
CREATE OR REPLACE FUNCTION downgrade_premium_household(
    household_id_param uuid,
    user_id_param uuid
)
RETURNS jsonb AS $$
DECLARE
    household_record households%ROWTYPE;
    current_member_count integer;
    user_role text;
BEGIN
    -- Verify user is calling for themselves (security check)
    IF user_id_param != auth.uid() THEN
        RETURN jsonb_build_object('success', false, 'error', 'You can only downgrade your own household');
    END IF;

    -- Get household details
    SELECT * INTO household_record
    FROM households
    WHERE id = household_id_param;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Household not found');
    END IF;

    -- Check if user is the creator of this household
    IF household_record.created_by != user_id_param THEN
        RETURN jsonb_build_object('success', false, 'error', 'Only the household creator can downgrade the household');
    END IF;

    -- Check if household is already at free tier max members
    IF household_record.max_members <= 5 THEN
        RETURN jsonb_build_object(
            'success', true,
            'message', 'Household is already at free tier limits'
        );
    END IF;

    -- Get current member count
    SELECT COUNT(*) INTO current_member_count
    FROM household_members
    WHERE household_id = household_id_param;

    -- Add metadata to track that this was a downgraded premium household
    UPDATE households
    SET 
        max_members = 5,
        -- Add a JSON field to track downgrade info
        -- Note: You may need to add this column to your households table
        metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
            'was_premium', true,
            'downgraded_at', NOW(),
            'original_max_members', household_record.max_members,
            'member_count_at_downgrade', current_member_count
        )
    WHERE id = household_id_param;

    -- If household has more than 5 members, mark excess members as inactive
    IF current_member_count > 5 THEN
        -- Keep the owner and 4 most recently active members
        -- Mark the rest as inactive (they can rejoin later when space is available)
        UPDATE household_members
        SET is_active = false,
            -- Track that they were removed due to downgrade
            metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
                'removed_due_to_downgrade', true,
                'removed_at', NOW()
            )
        WHERE household_id = household_id_param
        AND user_id NOT IN (
            -- Keep owner
            SELECT created_by FROM households WHERE id = household_id_param
            UNION
            -- Keep 4 most recently joined/active members (excluding owner)
            SELECT user_id FROM household_members 
            WHERE household_id = household_id_param 
            AND user_id != (SELECT created_by FROM households WHERE id = household_id_param)
            ORDER BY COALESCE(updated_at, joined_at) DESC 
            LIMIT 4
        );

        RETURN jsonb_build_object(
            'success', true,
            'downgraded', true,
            'original_member_count', current_member_count,
            'current_member_count', 5,
            'members_made_inactive', current_member_count - 5,
            'message', format('Household downgraded. %s members were made inactive and can rejoin when space is available.', current_member_count - 5)
        );
    ELSE
        RETURN jsonb_build_object(
            'success', true,
            'downgraded', true,
            'member_count', current_member_count,
            'message', 'Household successfully downgraded to free tier'
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. GET HOUSEHOLD DOWNGRADE STATUS
CREATE OR REPLACE FUNCTION get_household_downgrade_status(household_id_param uuid)
RETURNS jsonb AS $$
DECLARE
    household_record households%ROWTYPE;
    current_member_count integer;
    inactive_member_count integer;
BEGIN
    -- Get household details
    SELECT * INTO household_record
    FROM households
    WHERE id = household_id_param;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Household not found');
    END IF;

    -- Check if user is a member of this household
    IF NOT EXISTS (
        SELECT 1 FROM household_members
        WHERE household_id = household_id_param AND user_id = auth.uid()
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Access denied');
    END IF;

    -- Get member counts
    SELECT COUNT(*) INTO current_member_count
    FROM household_members
    WHERE household_id = household_id_param AND is_active = true;

    SELECT COUNT(*) INTO inactive_member_count
    FROM household_members
    WHERE household_id = household_id_param 
    AND is_active = false 
    AND metadata ? 'removed_due_to_downgrade';

    RETURN jsonb_build_object(
        'success', true,
        'household_id', household_id_param,
        'max_members', household_record.max_members,
        'current_member_count', current_member_count,
        'inactive_member_count', inactive_member_count,
        'was_premium', COALESCE((household_record.metadata ->> 'was_premium')::boolean, false),
        'downgraded_at', household_record.metadata ->> 'downgraded_at',
        'original_max_members', (household_record.metadata ->> 'original_max_members')::integer,
        'is_overcapacity', current_member_count > household_record.max_members,
        'needs_member_removal', current_member_count > household_record.max_members
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. REACTIVATE HOUSEHOLD MEMBER (for downgraded households with available slots)
CREATE OR REPLACE FUNCTION reactivate_household_member(
    household_id_param uuid,
    member_user_id uuid
)
RETURNS jsonb AS $$
DECLARE
    household_record households%ROWTYPE;
    current_member_count integer;
    user_role text;
BEGIN
    -- Get household details
    SELECT * INTO household_record
    FROM households
    WHERE id = household_id_param;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Household not found');
    END IF;

    -- Check if current user is the household owner
    SELECT hm.role INTO user_role
    FROM household_members hm
    WHERE hm.household_id = household_id_param AND hm.user_id = auth.uid();

    IF user_role != 'owner' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Only household owners can reactivate members');
    END IF;

    -- Get current active member count
    SELECT COUNT(*) INTO current_member_count
    FROM household_members
    WHERE household_id = household_id_param AND is_active = true;

    -- Check if household has space
    IF current_member_count >= household_record.max_members THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', format('Household is at capacity (%s/%s members)', current_member_count, household_record.max_members)
        );
    END IF;

    -- Check if the member exists and is inactive
    IF NOT EXISTS (
        SELECT 1 FROM household_members
        WHERE household_id = household_id_param 
        AND user_id = member_user_id 
        AND is_active = false
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Member not found or already active');
    END IF;

    -- Reactivate the member
    UPDATE household_members
    SET 
        is_active = true,
        updated_at = NOW(),
        -- Clear downgrade metadata
        metadata = COALESCE(metadata, '{}'::jsonb) - 'removed_due_to_downgrade' - 'removed_at'
    WHERE household_id = household_id_param AND user_id = member_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Member successfully reactivated'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION search_users_for_invitation TO authenticated;
GRANT EXECUTE ON FUNCTION get_household_members TO authenticated;
GRANT EXECUTE ON FUNCTION accept_household_invitation TO authenticated;
GRANT EXECUTE ON FUNCTION decline_household_invitation TO authenticated;
GRANT EXECUTE ON FUNCTION remove_household_member TO authenticated;
GRANT EXECUTE ON FUNCTION transfer_household_ownership TO authenticated;
GRANT EXECUTE ON FUNCTION update_household_settings TO authenticated;
GRANT EXECUTE ON FUNCTION switch_active_household TO authenticated;
GRANT EXECUTE ON FUNCTION downgrade_premium_household TO authenticated;
GRANT EXECUTE ON FUNCTION get_household_downgrade_status TO authenticated;
GRANT EXECUTE ON FUNCTION reactivate_household_member TO authenticated;

-- Success message
SELECT 'All household functions created successfully! 🎉' as status; 