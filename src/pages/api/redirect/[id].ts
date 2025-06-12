import { createClient } from '@supabase/supabase-js';

export const config = {
  runtime: 'edge'
};

export default async function handler(request: Request) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables');
    return new Response('Configuration error', { status: 500 });
  }

  // Create a public Supabase client
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });

  try {
    const url = new URL(request.url);
    const redirectId = url.pathname.split('/redirect/')[1];

    if (!redirectId) {
      return new Response('Invalid redirect ID', { status: 400 });
    }

    console.log('Looking up QR code with redirect ID:', redirectId);

    // Get QR code details
    const { data: qrCode, error: qrError } = await supabase
      .from('qr_codes')
      .select('id, original_url')
      .eq('redirect_id', redirectId)
      .single();

    if (qrError) {
      console.error('QR code lookup error:', {
        message: qrError.message,
        details: qrError.details,
        hint: qrError.hint
      });
      return new Response('QR code not found', { status: 404 });
    }

    if (!qrCode) {
      console.error('QR code not found for redirect ID:', redirectId);
      return new Response('QR code not found', { status: 404 });
    }

    // Record click with retries
    for (let i = 0; i < 3; i++) {
      try {
        const { error: clickError } = await supabase
          .from('qr_code_clicks')
          .insert([
            {
              qr_code_id: qrCode.id,
              ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
              user_agent: request.headers.get('user-agent'),
            }
          ]);

        if (clickError) {
          console.error('Click tracking error:', clickError);
          continue; // Try again if there's an error
        }
        break; // Success, exit retry loop
      } catch (error) {
        console.error('Error recording click (attempt ${i + 1}/3):', error);
        if (i === 2) {
          // Log final failure but don't block redirect
          console.error('Failed to record click after 3 attempts');
        }
      }
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