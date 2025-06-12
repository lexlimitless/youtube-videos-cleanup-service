import { createClient } from '@supabase/supabase-js';

// Debug logging
console.log('Raw Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('Raw Supabase Key:', import.meta.env.VITE_SUPABASE_ANON_KEY?.substring(0, 10) + '...');

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase environment variables');
}

// Ensure the URL has the correct protocol
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL.startsWith('http') 
  ? import.meta.env.VITE_SUPABASE_URL
  : `https://${import.meta.env.VITE_SUPABASE_URL}`;

export const supabase = createClient(supabaseUrl, import.meta.env.VITE_SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false
  }
}); 