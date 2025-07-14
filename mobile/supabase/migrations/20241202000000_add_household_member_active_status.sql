-- Add is_active field to household_members table for Premium downgrade support
-- This allows Free users to have one active household while keeping membership in locked households

-- Add the is_active column
ALTER TABLE public.household_members 
ADD COLUMN is_active BOOLEAN DEFAULT true;

-- Create index for better query performance
CREATE INDEX idx_household_members_active ON public.household_members(user_id, is_active);

-- Add comment explaining the field
COMMENT ON COLUMN public.household_members.is_active IS 'Whether this household membership is currently active. Free users can only have one active household.';

-- Update existing records to be active by default
UPDATE public.household_members SET is_active = true WHERE is_active IS NULL;

-- Create function to get user's active households
CREATE OR REPLACE FUNCTION public.get_user_active_households(user_id_param UUID)
RETURNS TABLE(
    household_id UUID,
    household_name TEXT,
    role TEXT,
    member_count INTEGER,
    is_owner BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        hm.household_id,
        h.name as household_name,
        hm.role,
        (SELECT COUNT(*)::INTEGER FROM household_members WHERE household_id = hm.household_id) as member_count,
        (hm.role = 'owner') as is_owner
    FROM household_members hm
    JOIN households h ON h.id = hm.household_id
    WHERE hm.user_id = user_id_param 
    AND hm.is_active = true
    ORDER BY hm.role DESC, h.created_at ASC; -- Owners first, then by creation date
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to activate a household for a user (used during downgrade)
CREATE OR REPLACE FUNCTION public.activate_user_household(
    user_id_param UUID,
    household_id_param UUID
)
RETURNS jsonb AS $$
DECLARE
    membership_exists BOOLEAN;
    user_premium_status BOOLEAN;
    active_count INTEGER;
BEGIN
    -- Check if user is a member of this household
    SELECT EXISTS(
        SELECT 1 FROM household_members 
        WHERE user_id = user_id_param AND household_id = household_id_param
    ) INTO membership_exists;
    
    IF NOT membership_exists THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'User is not a member of this household'
        );
    END IF;
    
    -- Check if user has premium access
    SELECT has_premium_access(user_id_param) INTO user_premium_status;
    
    -- If user is not premium, deactivate all other households first
    IF NOT user_premium_status THEN
        -- Count currently active households
        SELECT COUNT(*) INTO active_count
        FROM household_members 
        WHERE user_id = user_id_param AND is_active = true;
        
        -- If user already has an active household and it's not the target one, deactivate others
        IF active_count > 0 THEN
            UPDATE household_members 
            SET is_active = false 
            WHERE user_id = user_id_param 
            AND household_id != household_id_param;
        END IF;
    END IF;
    
    -- Activate the target household
    UPDATE household_members 
    SET is_active = true 
    WHERE user_id = user_id_param AND household_id = household_id_param;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Household activated successfully'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to deactivate households for Free users (used during downgrade)
CREATE OR REPLACE FUNCTION public.enforce_free_household_limits(user_id_param UUID)
RETURNS jsonb AS $$
DECLARE
    user_premium_status BOOLEAN;
    active_households UUID[];
    keep_household_id UUID;
BEGIN
    -- Check if user has premium access
    SELECT has_premium_access(user_id_param) INTO user_premium_status;
    
    -- If user has premium, no need to enforce limits
    IF user_premium_status THEN
        RETURN jsonb_build_object(
            'success', true,
            'message', 'User has premium access, no limits enforced'
        );
    END IF;
    
    -- Get all active households for the user
    SELECT ARRAY(
        SELECT household_id 
        FROM household_members 
        WHERE user_id = user_id_param AND is_active = true
        ORDER BY role DESC, created_at ASC -- Prefer owned households, then oldest
    ) INTO active_households;
    
    -- If user has 1 or fewer active households, no action needed
    IF array_length(active_households, 1) <= 1 THEN
        RETURN jsonb_build_object(
            'success', true,
            'message', 'User within free limits'
        );
    END IF;
    
    -- Keep the first household (owned household preferred, or oldest)
    keep_household_id := active_households[1];
    
    -- Deactivate all other households
    UPDATE household_members 
    SET is_active = false 
    WHERE user_id = user_id_param 
    AND household_id != keep_household_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Free household limits enforced',
        'active_household_id', keep_household_id,
        'deactivated_count', array_length(active_households, 1) - 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_user_active_households TO authenticated;
GRANT EXECUTE ON FUNCTION public.activate_user_household TO authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_free_household_limits TO authenticated;

-- Success message
SELECT 'Household member active status migration completed! 🎉' as status; 