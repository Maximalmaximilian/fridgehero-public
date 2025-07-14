-- Enhanced notification system migration
-- Create comprehensive notification preferences table

CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Main notification toggles
    expiry_alerts BOOLEAN DEFAULT TRUE,
    recipe_suggestions BOOLEAN DEFAULT TRUE,
    shopping_reminders BOOLEAN DEFAULT TRUE,
    milestone_alerts BOOLEAN DEFAULT TRUE,
    
    -- Timing preferences
    expiry_alert_time TIME DEFAULT '08:00:00', -- 8 AM local time
    recipe_suggestion_time TIME DEFAULT '17:00:00', -- 5 PM local time
    
    -- Advanced settings
    expiry_days_before INTEGER DEFAULT 2, -- Days before expiry to alert
    quiet_hours_start TIME DEFAULT '22:00:00', -- 10 PM
    quiet_hours_end TIME DEFAULT '07:00:00', -- 7 AM
    
    -- Frequency settings
    daily_summary_enabled BOOLEAN DEFAULT TRUE,
    weekly_insights_enabled BOOLEAN DEFAULT TRUE,
    
    -- Location settings
    geofencing_enabled BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    
    UNIQUE(user_id)
);

-- Create notification tracking table for analytics
CREATE TABLE IF NOT EXISTS notification_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL,
    notification_id TEXT, -- Expo notification ID
    action TEXT NOT NULL CHECK (action IN ('sent', 'delivered', 'opened', 'dismissed')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Create scheduled notifications table
CREATE TABLE IF NOT EXISTS scheduled_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    household_id UUID REFERENCES households(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE,
    expo_ticket_id TEXT,
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'sent', 'failed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Enhance existing notifications table
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 0; -- 0=normal, 1=high, 2=urgent
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS action_data JSONB DEFAULT '{}';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;

-- Update the notification type enum to include new types
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
    CHECK (type IN ('expiry_warning', 'expired', 'low_quantity', 'recipe_suggestion', 'shopping_reminder', 'milestone', 'system'));

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user ON notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_analytics_user_type ON notification_analytics(user_id, notification_type);
CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_user_status ON scheduled_notifications(user_id, status);
CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_scheduled_for ON scheduled_notifications(scheduled_for) WHERE status = 'scheduled';

-- Enable RLS
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own notification preferences" ON notification_preferences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification preferences" ON notification_preferences
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own notification analytics" ON notification_analytics
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification analytics" ON notification_analytics
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own scheduled notifications" ON scheduled_notifications
    FOR SELECT USING (auth.uid() = user_id);

-- Create function to insert default preferences for new users
CREATE OR REPLACE FUNCTION create_default_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO notification_preferences (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-create notification preferences
DROP TRIGGER IF EXISTS on_auth_user_created_notification_preferences ON auth.users;
CREATE TRIGGER on_auth_user_created_notification_preferences
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION create_default_notification_preferences();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_notification_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_notification_preferences_updated_at
    BEFORE UPDATE ON notification_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_notification_preferences_updated_at(); 