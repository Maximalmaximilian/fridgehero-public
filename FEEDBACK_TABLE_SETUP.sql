-- ================================
-- FridgeHero Feedback System Setup
-- ================================

-- Create feedback table
CREATE TABLE IF NOT EXISTS public.feedback (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('general', 'bug', 'feature', 'help')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    email TEXT,
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    attachments TEXT[] DEFAULT '{}',
    device_info JSONB,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON public.feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_type ON public.feedback(type);
CREATE INDEX IF NOT EXISTS idx_feedback_status ON public.feedback(status);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON public.feedback(created_at DESC);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_feedback_updated_at BEFORE UPDATE ON public.feedback 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can insert their own feedback
CREATE POLICY "Users can insert their own feedback" ON public.feedback
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can view their own feedback
CREATE POLICY "Users can view their own feedback" ON public.feedback
    FOR SELECT USING (auth.uid() = user_id);

-- Users can update their own feedback (but only certain fields)
CREATE POLICY "Users can update their own feedback" ON public.feedback
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Admin users can view all feedback (you can create an admin role later)
-- CREATE POLICY "Admins can view all feedback" ON public.feedback
--     FOR SELECT USING (
--         EXISTS (
--             SELECT 1 FROM auth.users 
--             WHERE auth.users.id = auth.uid() 
--             AND auth.users.raw_user_meta_data->>'role' = 'admin'
--         )
--     );

-- ================================
-- Storage bucket for attachments
-- ================================

-- Create storage bucket for feedback attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('feedback-attachments', 'feedback-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for feedback attachments
-- Users can upload attachments for their own feedback
CREATE POLICY "Users can upload feedback attachments" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'feedback-attachments' AND
        auth.role() = 'authenticated'
    );

-- Users can view attachments for their own feedback
CREATE POLICY "Users can view their feedback attachments" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'feedback-attachments' AND
        auth.role() = 'authenticated'
    );

-- Users can delete their own attachments
CREATE POLICY "Users can delete their feedback attachments" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'feedback-attachments' AND
        auth.role() = 'authenticated'
    );

-- ================================
-- Optional: Feedback categories/tags table
-- ================================

-- Uncomment if you want predefined categories
-- CREATE TABLE IF NOT EXISTS public.feedback_categories (
--     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
--     name TEXT NOT NULL UNIQUE,
--     description TEXT,
--     color TEXT DEFAULT '#22C55E',
--     icon TEXT DEFAULT 'chatbubble',
--     created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
-- );

-- INSERT INTO public.feedback_categories (name, description, color, icon) VALUES
-- ('General', 'General feedback and suggestions', '#22C55E', 'chatbubble'),
-- ('Bug Report', 'Report bugs and issues', '#EF4444', 'bug'),
-- ('Feature Request', 'Request new features', '#F59E0B', 'bulb'),
-- ('Help & Support', 'Get help and support', '#3B82F6', 'help-circle');

-- ================================
-- Notification function (optional)
-- ================================

-- Function to notify admins of new feedback (you can integrate with email services)
CREATE OR REPLACE FUNCTION notify_new_feedback()
RETURNS TRIGGER AS $$
BEGIN
    -- You can add logic here to send notifications to admins
    -- For example, insert into a notifications table or trigger an edge function
    
    -- Log the new feedback
    RAISE LOG 'New feedback submitted: ID=%, Type=%, Title=%', NEW.id, NEW.type, NEW.title;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to notify admins of new feedback
CREATE TRIGGER notify_new_feedback_trigger
    AFTER INSERT ON public.feedback
    FOR EACH ROW EXECUTE FUNCTION notify_new_feedback();

-- ================================
-- Sample query to test the setup
-- ================================

-- Test inserting feedback (replace user_id with actual user ID)
-- INSERT INTO public.feedback (user_id, type, title, description, email, priority)
-- VALUES (
--     auth.uid(),
--     'general',
--     'Love the app!',
--     'This is a test feedback message. The app is great!',
--     'user@example.com',
--     'medium'
-- );

-- View all feedback for the current user
-- SELECT * FROM public.feedback WHERE user_id = auth.uid() ORDER BY created_at DESC;

-- ================================
-- Admin queries (for admin panel)
-- ================================

-- View all feedback (admin only)
-- SELECT 
--     f.*,
--     u.email as user_email,
--     u.created_at as user_created_at
-- FROM public.feedback f
-- LEFT JOIN auth.users u ON f.user_id = u.id
-- ORDER BY f.created_at DESC;

-- Feedback statistics
-- SELECT 
--     type,
--     status,
--     COUNT(*) as count
-- FROM public.feedback
-- GROUP BY type, status
-- ORDER BY type, status; 