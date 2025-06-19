import { createClient } from '@supabase/supabase-js';
import type { Database } from './supabase.d';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.trace('Missing Supabase environment variables');
  throw new Error('Missing Supabase environment variables');
}

// Ensure the URL has the correct protocol
const supabaseUrlFormatted = supabaseUrl.startsWith('http') 
  ? supabaseUrl
  : `https://${supabaseUrl}`;

export const supabase = createClient<Database>(supabaseUrlFormatted, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false
  },
  db: {
    schema: 'public'
  }
});

// Add error handling wrapper for Supabase queries
export async function safeQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>
): Promise<{ data: T | null; error: any }> {
  try {
    const result = await queryFn();
    if (result.error) {
      console.error('Supabase query error:', result.error);
    }
    return result;
  } catch (e) {
    console.error('Unexpected error during Supabase query:', e);
    return { data: null, error: e };
  }
}

export async function generateQRCode(url: string): Promise<string> {
  const response = await fetch(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`);
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

export async function downloadQRCode(url: string, filename: string) {
  const qrCodeUrl = await generateQRCode(url);
  const link = document.createElement('a');
  link.href = qrCodeUrl;
  link.download = `${filename}-qr.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(qrCodeUrl);
} 