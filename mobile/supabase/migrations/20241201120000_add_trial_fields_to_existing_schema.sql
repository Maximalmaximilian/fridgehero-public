-- Add trial tracking fields to existing profiles table
-- This migration works with the existing FridgeHero schema

-- Add trial tracking columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS trial_started_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS trial_end_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS has_used_trial boolean DEFAULT false;

-- Add 'free' to the subscription_status enum (for users without any subscription)
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_subscription_status_check;

ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_subscription_status_check 
CHECK (subscription_status = ANY (ARRAY['free'::text, 'active'::text, 'canceled'::text, 'incomplete'::text, 'trialing'::text, 'past_due'::text]));

-- Set default subscription_status for new users
ALTER TABLE public.profiles 
ALTER COLUMN subscription_status SET DEFAULT 'free';

-- Update existing NULL subscription_status to 'free'
UPDATE public.profiles 
SET subscription_status = 'free' 
WHERE subscription_status IS NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status ON public.profiles(subscription_status);
CREATE INDEX IF NOT EXISTS idx_profiles_trial_end ON public.profiles(trial_end_at) WHERE trial_end_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer ON public.profiles(subscription_stripe_customer_id) WHERE subscription_stripe_customer_id IS NOT NULL;

-- Add a function to check if user has premium access (active subscription or trial)
CREATE OR REPLACE FUNCTION public.has_premium_access(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    profile_record RECORD;
    now_timestamp TIMESTAMPTZ := NOW();
BEGIN
    SELECT 
        subscription_status,
        trial_end_at,
        subscription_period_end,
        subscription_cancel_at_period_end
    INTO profile_record
    FROM public.profiles 
    WHERE id = user_id;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Check if actively subscribed
    IF profile_record.subscription_status = 'active' AND 
       (profile_record.subscription_period_end IS NULL OR profile_record.subscription_period_end > now_timestamp) AND
       (profile_record.subscription_cancel_at_period_end IS NULL OR profile_record.subscription_cancel_at_period_end = FALSE) THEN
        RETURN TRUE;
    END IF;
    
    -- Check if in trial period
    IF profile_record.subscription_status = 'trialing' AND 
       profile_record.trial_end_at IS NOT NULL AND 
       profile_record.trial_end_at > now_timestamp THEN
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add a function to get trial status
CREATE OR REPLACE FUNCTION public.get_trial_status(user_id UUID)
RETURNS TABLE(
    is_trialing BOOLEAN,
    is_eligible_for_trial BOOLEAN,
    trial_started TIMESTAMPTZ,
    trial_end TIMESTAMPTZ,
    days_remaining INTEGER,
    has_used_trial BOOLEAN
) AS $$
DECLARE
    profile_record RECORD;
    now_timestamp TIMESTAMPTZ := NOW();
BEGIN
    SELECT 
        subscription_status,
        trial_started_at,
        trial_end_at,
        profiles.has_used_trial
    INTO profile_record
    FROM public.profiles 
    WHERE id = user_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT 
            FALSE::BOOLEAN as is_trialing,
            TRUE::BOOLEAN as is_eligible_for_trial,
            NULL::TIMESTAMPTZ as trial_started,
            NULL::TIMESTAMPTZ as trial_end,
            7::INTEGER as days_remaining,
            FALSE::BOOLEAN as has_used_trial;
        RETURN;
    END IF;
    
    RETURN QUERY SELECT 
        (profile_record.subscription_status = 'trialing' AND 
         profile_record.trial_end_at IS NOT NULL AND 
         profile_record.trial_end_at > now_timestamp)::BOOLEAN as is_trialing,
        (NOT COALESCE(profile_record.has_used_trial, FALSE))::BOOLEAN as is_eligible_for_trial,
        profile_record.trial_started_at as trial_started,
        profile_record.trial_end_at as trial_end,
        CASE 
            WHEN profile_record.trial_end_at IS NOT NULL THEN
                GREATEST(0, EXTRACT(days FROM (profile_record.trial_end_at - now_timestamp))::INTEGER)
            ELSE 7
        END as days_remaining,
        COALESCE(profile_record.has_used_trial, FALSE)::BOOLEAN as has_used_trial;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add function to check if household has premium access (owner-based)
CREATE OR REPLACE FUNCTION public.household_has_premium_access(household_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    owner_id UUID;
BEGIN
    -- Find the household owner
    SELECT user_id INTO owner_id
    FROM public.household_members 
    WHERE household_members.household_id = household_has_premium_access.household_id 
    AND role = 'owner'
    LIMIT 1;
    
    IF owner_id IS NULL THEN
        -- Fallback to created_by if no owner found
        SELECT created_by INTO owner_id
        FROM public.households 
        WHERE id = household_has_premium_access.household_id;
    END IF;
    
    IF owner_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Check if owner has premium
    RETURN public.has_premium_access(owner_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments for documentation
COMMENT ON COLUMN public.profiles.trial_started_at IS 'When the user started their free trial';
COMMENT ON COLUMN public.profiles.trial_end_at IS 'When the user''s free trial ends';
COMMENT ON COLUMN public.profiles.has_used_trial IS 'Whether the user has already used their free trial';
COMMENT ON FUNCTION public.has_premium_access IS 'Check if user has premium access (active subscription or trial)';
COMMENT ON FUNCTION public.get_trial_status IS 'Get detailed trial status for user';
COMMENT ON FUNCTION public.household_has_premium_access IS 'Check if household has premium access based on owner subscription'; 