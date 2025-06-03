import { createClient } from '@supabase/supabase-js';

export const config = {
  runtime: 'edge'
};

export default async function handler(request: Request) {
  // Create a public Supabase client
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    }
  );

  try {
    const url = new URL(request.url);
    const redirectId = url.pathname.split('/redirect/')[1];

    if (!redirectId) {
      return new Response('Invalid redirect ID', { status: 400 });
    }

    // Get QR code details
    const { data: qrCode, error: qrError } = await supabase
      .from('qr_codes')
      .select('id, original_url')
      .eq('redirect_id', redirectId)
      .single();

    if (qrError || !qrCode) {
      console.error('QR code lookup error:', qrError);
      return new Response('QR code not found', { status: 404 });
    }

    // Fire and forget click tracking
    try {
      await supabase
        .from('qr_code_clicks')
        .insert([
          {
            qr_code_id: qrCode.id,
            ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
            user_agent: request.headers.get('user-agent'),
          }
        ]);
    } catch (error) {
      // Silently handle tracking errors
      console.error('Error recording click:', error);
    }

    // Immediate redirect
    return new Response(null, {
      status: 302,
      headers: {
        'Location': qrCode.original_url,
        'Cache-Control': 'no-store, no-cache, must-revalidate'
      }
    });
  } catch (error) {
    console.error('Redirect error:', error);
    return new Response('Internal server error', { status: 500 });
  }
} 