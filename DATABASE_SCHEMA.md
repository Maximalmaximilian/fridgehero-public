# FridgeHero Database Schema

## Complete Database Schema Reference
*This file contains the complete database schema for FridgeHero. Last updated: Dec 1, 2024*

---

## Tables Overview

### Authentication & Users
- **auth.users** (Supabase built-in)
- **profiles** - Extended user profiles with subscription info

### Household Management
- **households** - Household/family groups
- **household_members** - User-household relationships

### Inventory Management
- **items** - Food items in households
- **barcode_cache** - Product information cache

### Recipes & Cooking
- **recipes** - Recipe database
- **user_recipe_interactions** - User interactions with recipes

### Shopping
- **shopping_lists** - Shopping lists for households
- **shopping_list_items** - Individual shopping list items
- **shopping_list_categories** - Shopping categories

### Tracking & Analytics
- **waste_tracking** - Food waste and usage tracking
- **notifications** - User notifications
- **achievements** - User achievements/gamification

---

## Detailed Schema

```sql
-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.achievements (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  description text,
  milestone integer,
  unlocked_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT achievements_pkey PRIMARY KEY (id),
  CONSTRAINT achievements_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE TABLE public.barcode_cache (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  barcode text NOT NULL UNIQUE,
  name text NOT NULL,
  category text,
  brand text,
  image_url text,
  nutrition_data jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT barcode_cache_pkey PRIMARY KEY (id)
);

CREATE TABLE public.household_members (
  household_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role = ANY (ARRAY['owner'::text, 'member'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT household_members_pkey PRIMARY KEY (household_id, user_id),
  CONSTRAINT household_members_household_id_fkey FOREIGN KEY (household_id) REFERENCES public.households(id),
  CONSTRAINT household_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE TABLE public.households (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  invite_code text UNIQUE,
  max_members integer DEFAULT 5,
  created_by uuid,
  CONSTRAINT households_pkey PRIMARY KEY (id),
  CONSTRAINT households_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)
);

CREATE TABLE public.items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL,
  name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit text,
  expiry_date date,
  storage_location text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  barcode text,
  category text DEFAULT 'Other'::text,
  status text DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'used'::text, 'expired'::text, 'deleted'::text])),
  added_by uuid,
  used_at timestamp with time zone,
  notes text,
  CONSTRAINT items_pkey PRIMARY KEY (id),
  CONSTRAINT items_added_by_fkey FOREIGN KEY (added_by) REFERENCES auth.users(id),
  CONSTRAINT items_household_id_fkey FOREIGN KEY (household_id) REFERENCES public.households(id)
);

CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  item_id uuid,
  type text NOT NULL CHECK (type = ANY (ARRAY['expiry_warning'::text, 'expired'::text, 'low_quantity'::text])),
  message text NOT NULL,
  read boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.items(id),
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE TABLE public.profiles (
  id uuid NOT NULL,
  email text,
  full_name text,
  avatar_url text,
  phone text,
  preferences jsonb DEFAULT '{}'::jsonb,
  subscription_status text CHECK (subscription_status = ANY (ARRAY['active'::text, 'canceled'::text, 'incomplete'::text, 'trialing'::text, 'past_due'::text])),
  subscription_plan_id text,
  subscription_period_end timestamp with time zone,
  subscription_cancel_at_period_end boolean DEFAULT false,
  subscription_stripe_customer_id text,
  notifications_enabled boolean DEFAULT true,
  expiry_reminders boolean DEFAULT true,
  push_token text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);

CREATE TABLE public.recipes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  ingredients ARRAY NOT NULL,
  instructions ARRAY NOT NULL,
  prep_time integer,
  cook_time integer,
  servings integer DEFAULT 1,
  difficulty text DEFAULT 'medium'::text CHECK (difficulty = ANY (ARRAY['easy'::text, 'medium'::text, 'hard'::text])),
  cuisine_type text,
  diet_tags ARRAY,
  image_url text,
  source_url text,
  rating numeric,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT recipes_pkey PRIMARY KEY (id)
);

CREATE TABLE public.shopping_list_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL UNIQUE,
  icon character varying,
  color character varying,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT shopping_list_categories_pkey PRIMARY KEY (id)
);

CREATE TABLE public.shopping_list_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  shopping_list_id uuid,
  name text NOT NULL,
  quantity integer DEFAULT 1,
  unit text,
  category text,
  completed boolean DEFAULT false,
  added_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  household_id uuid NOT NULL,
  completed_by uuid,
  completed_at timestamp with time zone,
  notes text,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT shopping_list_items_pkey PRIMARY KEY (id),
  CONSTRAINT shopping_list_items_shopping_list_id_fkey FOREIGN KEY (shopping_list_id) REFERENCES public.shopping_lists(id),
  CONSTRAINT shopping_list_items_added_by_fkey FOREIGN KEY (added_by) REFERENCES auth.users(id),
  CONSTRAINT shopping_list_items_household_id_fkey FOREIGN KEY (household_id) REFERENCES public.households(id),
  CONSTRAINT shopping_list_items_completed_by_fkey FOREIGN KEY (completed_by) REFERENCES auth.users(id)
);

CREATE TABLE public.shopping_lists (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL,
  name text NOT NULL DEFAULT 'Shopping List'::text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT shopping_lists_pkey PRIMARY KEY (id),
  CONSTRAINT shopping_lists_household_id_fkey FOREIGN KEY (household_id) REFERENCES public.households(id),
  CONSTRAINT shopping_lists_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)
);

CREATE TABLE public.user_recipe_interactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  recipe_id uuid NOT NULL,
  interaction_type text NOT NULL CHECK (interaction_type = ANY (ARRAY['viewed'::text, 'favorited'::text, 'cooked'::text, 'shared'::text])),
  rating integer CHECK (rating >= 1 AND rating <= 5),
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT user_recipe_interactions_pkey PRIMARY KEY (id),
  CONSTRAINT user_recipe_interactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT user_recipe_interactions_recipe_id_fkey FOREIGN KEY (recipe_id) REFERENCES public.recipes(id)
);

CREATE TABLE public.waste_tracking (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  household_id uuid NOT NULL,
  item_id uuid,
  item_name text NOT NULL,
  category text NOT NULL,
  quantity integer DEFAULT 1,
  action text NOT NULL CHECK (action = ANY (ARRAY['used'::text, 'wasted'::text, 'shared'::text])),
  estimated_value numeric DEFAULT 0,
  co2_impact numeric DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT waste_tracking_pkey PRIMARY KEY (id),
  CONSTRAINT waste_tracking_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT waste_tracking_household_id_fkey FOREIGN KEY (household_id) REFERENCES public.households(id),
  CONSTRAINT waste_tracking_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.items(id)
);
```

---

## Key Observations

### Subscription System
- **profiles.subscription_status** supports: 'active', 'canceled', 'incomplete', 'trialing', 'past_due'
- **Missing Trial Fields**: `trial_started_at`, `trial_end_at`, `has_used_trial` need to be added
- **No 'free' status**: Current schema doesn't include 'free' subscription status

### Item Management
- **items.status**: 'active', 'used', 'expired', 'deleted' (no 'trashed' status)
- **Data Validation**: Proper status tracking for inventory management

### Household System
- **household_members.role**: 'owner' or 'member'
- **households.max_members**: Configurable member limits
- **Role-based Access**: Different permissions for owners vs members

### Technical Implementation Notes
1. Status tracking for item lifecycle management
2. Role-based access control for household features
3. Scalable architecture for multi-user functionality

---

## Database Design Principles
1. Normalized schema with proper relationships
2. Efficient indexing for performance
3. Comprehensive data validation and constraints 