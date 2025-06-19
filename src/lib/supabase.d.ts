import { SupabaseClient } from '@supabase/supabase-js';

declare const supabase: SupabaseClient;
export { supabase };

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
      user_integrations: {
        Row: {
          id: string
          user_id: string
          provider: string
          access_token: string
          is_connected: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          provider: string
          access_token: string
          is_connected?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          provider?: string
          access_token?: string
          is_connected?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      webhook_status: {
        Row: {
          id: string
          provider: string
          is_active: boolean
          last_checked_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          provider: string
          is_active?: boolean
          last_checked_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          provider?: string
          is_active?: boolean
          last_checked_at?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
} 