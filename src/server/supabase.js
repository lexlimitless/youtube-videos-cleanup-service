import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

let supabase;
try {
  supabase = createClient(supabaseUrl, supabaseKey);
} catch (e) {
  console.error('Error initializing Supabase client (js):', e);
  console.trace('Supabase client initialization failed (js)');
  throw e;
}

export { supabase };

export async function generateQRCode(url, size = '200x200') {
  const response = await fetch(`https://api.qrserver.com/v1/create-qr-code/?size=${size}&data=${encodeURIComponent(url)}`);
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

export async function downloadQRCode(url, filename) {
  const qrCodeUrl = await generateQRCode(url);
  const link = document.createElement('a');
  link.href = qrCodeUrl;
  link.download = `${filename}-qr.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(qrCodeUrl);
} 