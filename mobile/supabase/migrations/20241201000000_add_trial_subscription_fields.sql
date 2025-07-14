-- Add trial and subscription fields to profiles table
-- This migration adds comprehensive subscription and trial management to FridgeHero

-- First, update the subscription_status enum to include more states
ALTER TYPE subscription_status ADD VALUE IF NOT EXISTS 'trialing';
ALTER TYPE subscription_status ADD VALUE IF NOT EXISTS 'active';
ALTER TYPE subscription_status ADD VALUE IF NOT EXISTS 'canceled';
ALTER TYPE subscription_status ADD VALUE IF NOT EXISTS 'incomplete';
ALTER TYPE subscription_status ADD VALUE IF NOT EXISTS 'past_due';

-- Add new columns to profiles table for subscription management
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS expiry_reminders BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS subscription_plan_id TEXT,
ADD COLUMN IF NOT EXISTS subscription_period_end TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS subscription_cancel_at_period_end BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS subscription_stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS trial_end_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS has_used_trial BOOLEAN DEFAULT false;

-- Update the subscription_status column to use the new enum values
-- Change default from 'free' to 'free' (keep existing behavior)
ALTER TABLE public.profiles 
ALTER COLUMN subscription_status SET DEFAULT 'free';

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

-- Add RLS policies for the new subscription fields
-- Users can still only view and update their own profiles (existing policies cover this)

-- Comment to document the migration
COMMENT ON COLUMN public.profiles.trial_started_at IS 'When the user started their free trial';
COMMENT ON COLUMN public.profiles.trial_end_at IS 'When the user''s free trial ends';
COMMENT ON COLUMN public.profiles.has_used_trial IS 'Whether the user has already used their free trial';
COMMENT ON COLUMN public.profiles.subscription_plan_id IS 'The ID of the user''s subscription plan';
COMMENT ON COLUMN public.profiles.subscription_period_end IS 'When the current subscription period ends';
COMMENT ON COLUMN public.profiles.subscription_cancel_at_period_end IS 'Whether to cancel the subscription at period end';
COMMENT ON COLUMN public.profiles.subscription_stripe_customer_id IS 'The user''s Stripe customer ID'; 