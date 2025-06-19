import { SupabaseClient } from '@supabase/supabase-js';

export interface Database {
  public: {
    Tables: {
      links: {
        Row: {
          id: string;
          user_id: string;
          short_code: string;
          destination_url: string;
          title: string;
          platform: string;
          attribution_window_days: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          short_code: string;
          destination_url: string;
          title: string;
          platform: string;
          attribution_window_days: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          short_code?: string;
          destination_url?: string;
          title?: string;
          platform?: string;
          attribution_window_days?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      clicks: {
        Row: {
          id: string;
          short_code: string;
          created_at: string;
          ip_address?: string;
          user_agent?: string;
        };
        Insert: {
          id?: string;
          short_code: string;
          created_at?: string;
          ip_address?: string;
          user_agent?: string;
        };
        Update: {
          id?: string;
          short_code?: string;
          created_at?: string;
          ip_address?: string;
          user_agent?: string;
        };
      };
      calls: {
        Row: {
          id: string;
          short_code: string;
          created_at: string;
          ip_address?: string;
          user_agent?: string;
        };
        Insert: {
          id?: string;
          short_code: string;
          created_at?: string;
          ip_address?: string;
          user_agent?: string;
        };
        Update: {
          id?: string;
          short_code?: string;
          created_at?: string;
          ip_address?: string;
          user_agent?: string;
        };
      };
      sales: {
        Row: {
          id: string;
          short_code: string;
          amount: number;
          created_at: string;
          ip_address?: string;
          user_agent?: string;
        };
        Insert: {
          id?: string;
          short_code: string;
          amount: number;
          created_at?: string;
          ip_address?: string;
          user_agent?: string;
        };
        Update: {
          id?: string;
          short_code?: string;
          amount?: number;
          created_at?: string;
          ip_address?: string;
          user_agent?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

declare const supabaseAdmin: SupabaseClient<Database>;
export { supabaseAdmin }; 