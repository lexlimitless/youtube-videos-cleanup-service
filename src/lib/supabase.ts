import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

// Ensure the URL has the correct protocol
const supabaseUrlFormatted = supabaseUrl.startsWith('http') 
  ? supabaseUrl
  : `https://${supabaseUrl}`;

export const supabase = createClient(supabaseUrlFormatted, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false
  }
});

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