// Script to create test users for development
// Run this in Node.js or in browser console with Supabase client

import { createClient } from '@supabase/supabase-js'

// Replace with your Supabase URL and anon key
const supabaseUrl = 'YOUR_SUPABASE_URL'
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY'
const supabase = createClient(supabaseUrl, supabaseKey)

const testUsers = [
  { email: 'user1@test.com', password: '123456', username: 'user1', full_name: 'Test User 1' },
  { email: 'user2@test.com', password: '123456', username: 'user2', full_name: 'Test User 2' },
  { email: 'user3@test.com', password: '123456', username: 'user3', full_name: 'Test User 3' },
  { email: 'user4@test.com', password: '123456', username: 'user4', full_name: 'Test User 4' },
  { email: 'user5@test.com', password: '123456', username: 'user5', full_name: 'Test User 5' },
]

async function createTestUsers() {
  console.log('Creating test users...')
  
  for (const user of testUsers) {
    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: user.email,
        password: user.password,
      })

      if (authError) {
        console.error(`Error creating user ${user.email}:`, authError)
        continue
      }

      console.log(`✅ Created user: ${user.email}`)

      // If user was created successfully, update their profile
      if (authData.user) {
        // Note: You might need to sign in as the user first to update their profile
        // or use a service role key to update profiles directly
        
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            username: user.username,
            full_name: user.full_name,
            email: user.email,
          })
          .eq('id', authData.user.id)

        if (profileError) {
          console.error(`Error updating profile for ${user.email}:`, profileError)
        } else {
          console.log(`✅ Updated profile for: ${user.email}`)
        }
      }

    } catch (error) {
      console.error(`Unexpected error for ${user.email}:`, error)
    }
  }

  console.log('Test user creation complete!')
}

// Run the function
createTestUsers() 