-- Add missing profile columns to match application code expectations
-- This migration adds all the columns that the AccountSetupScreen and ProfileSetupScreen are trying to insert

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS expiry_reminders BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS max_items INTEGER DEFAULT 20,
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

-- Create unique index on username (ignoring NULL values)
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username_unique 
ON public.profiles(username) 
WHERE username IS NOT NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding ON public.profiles(onboarding_completed);

-- Create the notification_preferences table if not exists
CREATE TABLE IF NOT EXISTS public.notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
    expiry_notifications BOOLEAN DEFAULT true,
    expiry_notification_hours INTEGER DEFAULT 24,
    recipe_notifications BOOLEAN DEFAULT true,
    shopping_list_notifications BOOLEAN DEFAULT true,
    household_notifications BOOLEAN DEFAULT true,
    marketing_notifications BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add RLS policies for notification_preferences
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'notification_preferences' 
        AND policyname = 'Users can view own notification preferences'
    ) THEN
        ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Users can view own notification preferences"
            ON public.notification_preferences FOR SELECT
            USING (auth.uid() = user_id);

        CREATE POLICY "Users can update own notification preferences"
            ON public.notification_preferences FOR UPDATE
            USING (auth.uid() = user_id);

        CREATE POLICY "Users can insert own notification preferences"
            ON public.notification_preferences FOR INSERT
            WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- Add updated_at trigger for notification_preferences
DROP TRIGGER IF EXISTS update_notification_preferences_updated_at ON public.notification_preferences;
CREATE TRIGGER update_notification_preferences_updated_at
    BEFORE UPDATE ON public.notification_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON COLUMN public.profiles.full_name IS 'User''s full display name';
COMMENT ON COLUMN public.profiles.username IS 'Unique username for the user (optional)';
COMMENT ON COLUMN public.profiles.phone IS 'User''s phone number (optional)';
COMMENT ON COLUMN public.profiles.avatar_url IS 'URL to user''s profile avatar image';
COMMENT ON COLUMN public.profiles.notifications_enabled IS 'Whether push notifications are enabled';
COMMENT ON COLUMN public.profiles.expiry_reminders IS 'Whether expiry reminder notifications are enabled';
COMMENT ON COLUMN public.profiles.max_items IS 'Maximum number of items user can track (subscription-based)';
COMMENT ON COLUMN public.profiles.onboarding_completed IS 'Whether user has completed the onboarding flow'; 