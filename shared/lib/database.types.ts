export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          subscription_status: 'free' | 'premium'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          subscription_status?: 'free' | 'premium'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          subscription_status?: 'free' | 'premium'
          created_at?: string
          updated_at?: string
        }
      }
      households: {
        Row: {
          id: string
          name: string
          created_by: string
          invite_code: string
          max_members: number
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          created_by: string
          invite_code: string
          max_members?: number
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_by?: string
          invite_code?: string
          max_members?: number
          created_at?: string
        }
      }
      household_members: {
        Row: {
          household_id: string
          user_id: string
          role: string
          joined_at: string
        }
        Insert: {
          household_id: string
          user_id: string
          role?: string
          joined_at?: string
        }
        Update: {
          household_id?: string
          user_id?: string
          role?: string
          joined_at?: string
        }
      }
      items: {
        Row: {
          id: string
          household_id: string
          added_by: string
          name: string
          barcode: string | null
          expiry_date: string
          category: string
          quantity: number
          status: 'active' | 'used' | 'expired' | 'trashed'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          household_id: string
          added_by: string
          name: string
          barcode?: string | null
          expiry_date: string
          category: string
          quantity?: number
          status?: 'active' | 'used' | 'expired' | 'trashed'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          household_id?: string
          added_by?: string
          name?: string
          barcode?: string | null
          expiry_date?: string
          category?: string
          quantity?: number
          status?: 'active' | 'used' | 'expired' | 'trashed'
          created_at?: string
          updated_at?: string
        }
      }
      recipes: {
        Row: {
          id: string
          name: string
          ingredients: Json
          instructions: Json
          prep_time: number
          cook_time: number
          servings: number
          image_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          ingredients: Json
          instructions: Json
          prep_time: number
          cook_time: number
          servings: number
          image_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          ingredients?: Json
          instructions?: Json
          prep_time?: number
          cook_time?: number
          servings?: number
          image_url?: string | null
          created_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          item_id: string
          type: 'expiry_soon' | 'expired' | 'system'
          message: string
          read: boolean
          sent_at: string
        }
        Insert: {
          id?: string
          user_id: string
          item_id: string
          type: 'expiry_soon' | 'expired' | 'system'
          message: string
          read?: boolean
          sent_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          item_id?: string
          type?: 'expiry_soon' | 'expired' | 'system'
          message?: string
          read?: boolean
          sent_at?: string
        }
      }
      barcode_cache: {
        Row: {
          barcode: string
          product_data: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          barcode: string
          product_data: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          barcode?: string
          product_data?: Json
          created_at?: string
          updated_at?: string
        }
      }
      waste_tracking: {
        Row: {
          id: string
          household_id: string
          item_id: string | null
          quantity: number
          reason: string | null
          created_at: string
        }
        Insert: {
          id?: string
          household_id: string
          item_id?: string | null
          quantity?: number
          reason?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          household_id?: string
          item_id?: string | null
          quantity?: number
          reason?: string | null
          created_at?: string
        }
      }
    }
    Functions: {
      get_household_items: {
        Args: {
          p_household_id: string
          p_status?: 'active' | 'used' | 'expired' | 'trashed'
        }
        Returns: Database['public']['Tables']['items']['Row'][]
      }
      get_expiring_items: {
        Args: {
          p_days?: number
        }
        Returns: Database['public']['Tables']['items']['Row'][]
      }
    }
    Enums: {
      subscription_status: 'free' | 'premium'
      item_status: 'active' | 'used' | 'expired' | 'trashed'
      notification_type: 'expiry_soon' | 'expired' | 'system'
    }
  }
}
