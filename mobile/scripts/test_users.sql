-- Helper SQL for creating test user profiles
-- Note: You must create the actual auth users through Supabase Dashboard first

-- Step 1: Check existing users
SELECT id, email, created_at FROM auth.users ORDER BY created_at DESC LIMIT 10;

-- Step 2: After creating users through Dashboard, update their profiles
-- Replace the UUIDs with actual user IDs from the query above

-- Example updates (replace UUIDs with real ones):
/*
UPDATE public.profiles 
SET 
  username = 'user1',
  full_name = 'Test User 1',
  email = 'user1@test.com'
WHERE id = 'uuid-from-auth-users-table';

UPDATE public.profiles 
SET 
  username = 'user2', 
  full_name = 'Test User 2',
  email = 'user2@test.com'
WHERE id = 'uuid-from-auth-users-table';

UPDATE public.profiles 
SET 
  username = 'user3', 
  full_name = 'Test User 3',
  email = 'user3@test.com'
WHERE id = 'uuid-from-auth-users-table';

UPDATE public.profiles 
SET 
  username = 'user4', 
  full_name = 'Test User 4',
  email = 'user4@test.com'
WHERE id = 'uuid-from-auth-users-table';

UPDATE public.profiles 
SET 
  username = 'user5', 
  full_name = 'Test User 5',
  email = 'user5@test.com'
WHERE id = 'uuid-from-auth-users-table';
*/

-- Clean up orphaned invitations (run this after creating users)
SELECT public.cleanup_orphaned_invitations(); 