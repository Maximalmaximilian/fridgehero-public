# 🎯 FridgeHero Feedback System

A comprehensive feedback system for your mobile app that allows users to submit feedback, report bugs, request features, and get help. Built with React Native and Supabase.

## ✨ Features

### 🎨 Beautiful UI/UX
- **Modern Design**: Clean, intuitive interface following your app's design system
- **Category Selection**: Visual feedback categories with gradient icons
- **Responsive Forms**: Adaptive forms with real-time validation
- **Theme Support**: Full dark/light theme compatibility
- **Success States**: Delightful confirmation experiences

### 📱 Feedback Types
1. **General Feedback** - Share thoughts and suggestions
2. **Bug Reports** - Report issues with priority levels
3. **Feature Requests** - Suggest new features and improvements
4. **Help & Support** - Get assistance and ask questions

### 📎 Rich Features
- **File Attachments**: Camera and photo library integration for screenshots
- **Priority Levels**: Low, Medium, High priority for bug reports
- **Device Info**: Automatic platform and version detection
- **Email Integration**: Optional contact email for follow-ups
- **Character Limits**: Guided input with character counters

### 🔒 Security & Privacy
- **Row Level Security**: Users can only access their own feedback
- **Secure Storage**: Encrypted file attachments in Supabase Storage
- **Data Validation**: Server-side validation and constraints
- **User Authentication**: Tied to authenticated user accounts

## 🚀 Setup Instructions

### 1. Database Setup

Run the SQL script in your Supabase dashboard:

```bash
# In your Supabase project dashboard:
# 1. Go to SQL Editor
# 2. Copy and paste the contents of FEEDBACK_TABLE_SETUP.sql
# 3. Run the script
```

This will create:
- `feedback` table with proper schema
- Storage bucket for attachments
- Row Level Security policies
- Indexes for performance
- Triggers for automatic timestamps

### 2. Mobile App Integration

The feedback system is already integrated into your settings screen! You can also use it anywhere in your app:

```tsx
import FeedbackModal, { FeedbackType } from '../components/FeedbackModal';

function YourComponent() {
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('general');

  return (
    <>
      <TouchableOpacity onPress={() => setShowFeedback(true)}>
        <Text>Give Feedback</Text>
      </TouchableOpacity>
      
      <FeedbackModal
        visible={showFeedback}
        onClose={() => setShowFeedback(false)}
        initialType={feedbackType}
      />
    </>
  );
}
```

### 3. Storage Configuration

The system automatically creates a storage bucket called `feedback-attachments`. Make sure your Supabase project has sufficient storage quota.

## 📊 Database Schema

### `feedback` Table
```sql
- id: UUID (Primary Key)
- user_id: UUID (Foreign Key to auth.users)
- type: TEXT ('general', 'bug', 'feature', 'help')
- title: TEXT (Required)
- description: TEXT (Required)
- email: TEXT (Optional contact email)
- priority: TEXT ('low', 'medium', 'high')
- attachments: TEXT[] (Array of file paths)
- device_info: JSONB (Platform and version info)
- status: TEXT ('open', 'in_progress', 'resolved', 'closed')
- admin_notes: TEXT (For admin use)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

## 🎯 Usage Examples

### Basic Feedback Button
```tsx
<FeedbackButton onPress={openFeedbackModal} />
```

### Specific Feedback Type
```tsx
<FeedbackButton 
  onPress={openFeedbackModal} 
  type="bug"
  title="Report Bug"
  icon="bug"
/>
```

### Custom Styling
```tsx
<FeedbackButton 
  onPress={openFeedbackModal}
  variant="secondary"
  size="large"
  style={{ marginTop: 20 }}
/>
```

## 🛠 Admin Features

### View All Feedback
```sql
SELECT 
    f.*,
    u.email as user_email,
    u.created_at as user_created_at
FROM public.feedback f
LEFT JOIN auth.users u ON f.user_id = u.id
ORDER BY f.created_at DESC;
```

### Feedback Statistics
```sql
SELECT 
    type,
    status,
    COUNT(*) as count
FROM public.feedback
GROUP BY type, status
ORDER BY type, status;
```

### Update Feedback Status
```sql
UPDATE public.feedback 
SET status = 'resolved', admin_notes = 'Fixed in v1.2.0'
WHERE id = 'feedback-uuid';
```

## 🔧 Customization

### Adding New Feedback Types
1. Update the `FeedbackType` enum in `FeedbackModal.tsx`
2. Add new category to `FEEDBACK_CATEGORIES` array
3. Update database constraint: `ALTER TABLE feedback DROP CONSTRAINT IF EXISTS feedback_type_check; ALTER TABLE feedback ADD CONSTRAINT feedback_type_check CHECK (type IN ('general', 'bug', 'feature', 'help', 'your_new_type'));`

### Styling Customization
All components use your app's design tokens and theme system. Modify the styles in:
- `FeedbackModal.tsx` - Main modal styles
- `FeedbackButton.tsx` - Button component styles

### Email Integration
To send email notifications when feedback is submitted:

1. Create a Supabase Edge Function
2. Update the `notify_new_feedback()` SQL function
3. Integrate with email service (Resend, SendGrid, etc.)

## 📈 Analytics & Monitoring

### Track Feedback Metrics
- Monitor feedback volume by type
- Track resolution times
- Identify common issues
- User satisfaction trends

### Database Queries for Analytics
```sql
-- Feedback volume over time
SELECT DATE(created_at), type, COUNT(*) 
FROM feedback 
GROUP BY DATE(created_at), type 
ORDER BY DATE(created_at) DESC;

-- Average resolution time
SELECT type, AVG(updated_at - created_at) as avg_resolution_time
FROM feedback 
WHERE status = 'resolved'
GROUP BY type;

-- Most active users
SELECT user_id, COUNT(*) as feedback_count
FROM feedback 
GROUP BY user_id 
ORDER BY feedback_count DESC;
```

## 🔒 Security Best Practices

### Row Level Security
- Users can only see their own feedback
- Admin access requires special role
- Attachments are private by default

### Input Validation
- All fields are validated on submission
- Character limits prevent spam
- File type restrictions for attachments

### Rate Limiting
Consider implementing rate limiting to prevent abuse:
```sql
-- Example: Limit 5 feedback submissions per hour per user
CREATE OR REPLACE FUNCTION check_feedback_rate_limit()
RETURNS TRIGGER AS $$
BEGIN
    IF (
        SELECT COUNT(*) 
        FROM feedback 
        WHERE user_id = NEW.user_id 
        AND created_at > NOW() - INTERVAL '1 hour'
    ) >= 5 THEN
        RAISE EXCEPTION 'Rate limit exceeded. Please wait before submitting more feedback.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER feedback_rate_limit_trigger
    BEFORE INSERT ON feedback
    FOR EACH ROW EXECUTE FUNCTION check_feedback_rate_limit();
```

## 🚀 Advanced Features

### Integration with External Tools
- **Slack/Discord**: Send notifications to team channels
- **Jira/Linear**: Auto-create issues for bug reports
- **Email**: Send confirmation emails to users
- **Analytics**: Track feedback metrics in your analytics platform

### AI-Powered Features
- **Sentiment Analysis**: Automatically detect feedback sentiment
- **Auto-Categorization**: Use AI to categorize feedback
- **Smart Responses**: Generate suggested responses for common issues

## 📝 Best Practices

### For Users
1. **Be Specific**: Provide clear, detailed descriptions
2. **Include Screenshots**: Visual context helps with bug reports
3. **Check Existing Feedback**: Avoid duplicates when possible

### For Admins
1. **Respond Promptly**: Acknowledge feedback within 24-48 hours
2. **Keep Users Updated**: Update status and provide progress notes
3. **Follow Up**: Close the loop when issues are resolved

### For Developers
1. **Monitor Regularly**: Check feedback dashboard daily
2. **Categorize Properly**: Use consistent status updates
3. **Learn from Feedback**: Use insights to improve the product

## 🤝 Contributing

Want to improve the feedback system? Here are some ideas:
- Add sentiment analysis
- Implement email notifications
- Create an admin dashboard
- Add feedback voting/rating
- Build automated responses

## 📞 Support

If you need help with the feedback system:
1. Check the database logs in Supabase
2. Review the console logs in your app
3. Test with different user permissions
4. Verify storage bucket policies

---

**Built with ❤️ for FridgeHero** - Helping reduce food waste, one feedback at a time! 🌱 