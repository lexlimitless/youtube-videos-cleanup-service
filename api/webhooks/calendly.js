console.log('--- CALENDLY STATIC WEBHOOK HANDLER INITIATED ---');
import { supabaseAdmin } from '../../src/server/supabase-admin.js';

const SIGNING_KEY = process.env.CALENDLY_WEBHOOK_SIGNING_KEY;

// Simple signature verification (implement properly for production)
function verifySignature(req) {
  // In a real app, you'd use a library like `crypto` to verify the signature
  // against the signing key from your environment variables.
  return true;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  console.log('--- Calendly Webhook Received ---');

  if (!verifySignature(req)) {
    console.error('Invalid Calendly webhook signature');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const event = req.body;
  const eventType = event.event;

  if (eventType !== 'invitee.created') {
    console.log(`Ignoring event type: ${eventType}`);
    return res.status(200).json({ received: true, message: 'Event ignored.' });
  }

  try {
    const payload = event.payload;
    const calendlyUserUri = payload?.scheduled_event?.event_memberships?.[0]?.user;
    const trackingRef = payload?.tracking?.utm_content;

    if (!calendlyUserUri) {
      console.error('Could not extract Calendly User URI from webhook payload.');
      return res.status(400).json({ error: 'Missing user identifier in payload' });
    }
    
    if (!trackingRef) {
        // This is a normal event, not an error. A user may book without a tracking link.
        return res.status(200).json({ received: true, message: 'No tracking ref.'});
    }

    // Find our user associated with this Calendly account
    const { data: integration, error: dbError } = await supabaseAdmin
      .from('user_integrations')
      .select('user_id')
      .eq('calendly_user_uri', calendlyUserUri)
      .single();

    if (dbError || !integration) {
      console.error(`Could not find an integration for Calendly user: ${calendlyUserUri}`, dbError);
      // Still return 200 so Calendly doesn't retry.
      return res.status(200).json({ received: true, error: 'User not found in our system.' });
    }
    
    const ourUserId = integration.user_id;

    // Validate that the link ref exists for this user
    const { data: link, error: linkError } = await supabaseAdmin
      .from('links')
      .select('short_code')
      .eq('short_code', trackingRef)
      .eq('user_id', ourUserId)
      .single();

    if (linkError || !link) {
      console.error(`Tracking ref '${trackingRef}' not found for user '${ourUserId}'.`);
      return res.status(200).json({ received: true, error: 'Link ref not found for this user.' });
    }

    // Insert the call record
    const { error: callError } = await supabaseAdmin.from('calls').insert({
      short_code: trackingRef,
      calendly_email: payload.email,
      event_id: payload.event,
      timestamp: payload.created_at,
      user_id: ourUserId,
    });

    if (callError) {
      console.error('Error inserting call record:', callError);
      return res.status(500).json({ error: 'Failed to record call.' });
    }

    console.log(`Successfully attributed call for ref '${trackingRef}' to user '${ourUserId}'.`);
    res.status(200).json({ received: true, success: true });

  } catch (error) {
    console.error('Unexpected error in Calendly webhook handler:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
} 