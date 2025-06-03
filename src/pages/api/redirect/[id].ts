import { createClient } from '@supabase/supabase-js';

// Create a public Supabase client with anon key
const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: false // Don't persist the session
    }
  }
);

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const redirectId = url.pathname.split('/').pop();

    // Get QR code details using the public client
    const { data: qrCode, error: qrError } = await supabase
      .from('qr_codes')
      .select('id, original_url')
      .eq('redirect_id', redirectId)
      .single();

    if (qrError || !qrCode) {
      console.error('QR code lookup error:', qrError);
      return new Response('QR code not found', { status: 404 });
    }

    // Record the click using the public client
    const { error: clickError } = await supabase
      .from('qr_code_clicks')
      .insert([
        {
          qr_code_id: qrCode.id,
          ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
          user_agent: request.headers.get('user-agent'),
          // Note: country and city would typically come from an IP geolocation service
        }
      ]);

    if (clickError) {
      // Log the error but don't fail the redirect
      console.error('Error recording click:', clickError);
    }

    // Redirect to the original URL
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