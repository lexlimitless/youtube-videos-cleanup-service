import { supabaseAdmin } from '../../src/server/supabase-admin.js';

// In a real app, you would implement proper signature verification.
function verifySignature(req) {
  return true;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  if (!verifySignature(req)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const event = req.body;
  if (event.event !== 'invitee.created') {
    return res.status(200).json({ received: true, message: 'Event ignored.' });
  }

  try {
    const payload = event.payload;
    const calendlyUserUri = payload?.scheduled_event?.event_memberships?.[0]?.user;
    const trackingRef = payload?.tracking?.utm_content;
    const eventName = payload?.scheduled_event?.name;

    if (!calendlyUserUri) {
      return res.status(400).json({ error: 'Missing user identifier in payload' });
    }
    
    if (!trackingRef) {
      return res.status(200).json({ received: true, message: 'No tracking ref.'});
    }

    const { data: integration, error: dbError } = await supabaseAdmin
      .from('user_integrations')
      .select('user_id')
      .eq('calendly_user_uri', calendlyUserUri)
      .single();

    if (dbError || !integration) {
      // Still return 200 so Calendly doesn't retry for a user not in our system.
      return res.status(200).json({ received: true, error: 'User not found in our system.' });
    }
    
    const ourUserId = integration.user_id;

    const { data: link, error: linkError } = await supabaseAdmin
      .from('links')
      .select('short_code')
      .eq('short_code', trackingRef)
      .eq('user_id', ourUserId)
      .single();

    if (linkError || !link) {
      return res.status(200).json({ received: true, error: 'Link ref not found for this user.' });
    }

    const { error: callError } = await supabaseAdmin.from('calls').insert({
      short_code: trackingRef,
      calendly_email: payload.email,
      event_id: payload.event,
      event_name: eventName,
      timestamp: payload.created_at,
      user_id: ourUserId,
    });

    if (callError) {
      // Log the error internally, but don't expose details to the client.
      console.error('Error inserting call record:', callError);
      return res.status(500).json({ error: 'Failed to record call.' });
    }

    res.status(200).json({ received: true, success: true });

  } catch (error) {
    console.error('Unexpected error in Calendly webhook handler:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
} 