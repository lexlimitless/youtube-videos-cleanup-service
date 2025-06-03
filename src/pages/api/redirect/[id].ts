import { supabase } from '../../../lib/supabase';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const redirectId = url.pathname.split('/').pop();

    // Get QR code details
    const { data: qrCode, error: qrError } = await supabase
      .from('qr_codes')
      .select('id, original_url')
      .eq('redirect_id', redirectId)
      .single();

    if (qrError || !qrCode) {
      return new Response('QR code not found', { status: 404 });
    }

    // Record the click
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