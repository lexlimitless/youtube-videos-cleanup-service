console.log('--- CALENDLY WEBHOOK HANDLER INITIATED ---');
import { supabaseAdmin } from '../../../../src/server/supabase-admin.js';

const SIGNING_KEY = process.env.CALENDLY_WEBHOOK_SIGNING_KEY;

function verifySignature(req, signingKey) {
  const signature = req.headers['calendly-webhook-signature'];
  if (!signature) {
    console.error('[Calendly] Missing webhook signature header');
    return false;
  }

  // For now, we'll skip signature verification in development
  // In production, you should implement proper signature verification
  if (process.env.NODE_ENV === 'development') {
    return true;
  }

  // TODO: Implement proper signature verification
  return true;
}

export default async function handler(req, res) {
  console.log('--- Calendly Webhook Received ---');
  console.log('Request Method:', req.method);
  console.log('Request URL:', req.url);
  console.log('Request Query:', req.query);
  console.log('Request Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Raw Request Body:', JSON.stringify(req.body, null, 2));

  if (req.method !== 'POST') {
    console.log('Request method is not POST, returning 405.');
    return res.status(405).end();
  }

  // Extract user ID from the dynamic route parameter
  const { userId } = req.query;

  if (!userId) {
    console.error('[Calendly] Could not extract userId from webhook URL query:', req.query);
    return res.status(400).json({ error: 'Invalid webhook URL format, userId is missing' });
  }

  console.log('[Calendly] Processing webhook for user:', userId);

  if (!SIGNING_KEY) {
    console.error('[Calendly] Missing CALENDLY_WEBHOOK_SIGNING_KEY environment variable');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  if (!verifySignature(req, SIGNING_KEY)) {
    console.error('[Calendly] Invalid webhook signature');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const event = req.body;
  console.log('[Calendly] Processing webhook event:', {
    type: event.event,
    payload: event.payload
  });

  // Only handle invitee.created events
  if (event.event !== 'invitee.created') {
    console.log('[Calendly] Ignoring non-invitee.created event:', event.event);
    return res.status(200).json({ received: true });
  }

  // Extract ref from scheduling_url
  const schedulingUrl = event.payload.scheduling_url;
  let ref = null;
  try {
    const urlObj = new URL(schedulingUrl);
    ref = urlObj.searchParams.get('ref');
    console.log('[Calendly] Extracted ref from scheduling_url:', {
      url: schedulingUrl,
      ref: ref
    });
  } catch (e) {
    console.error('[Calendly] Error parsing scheduling_url:', {
      url: schedulingUrl,
      error: e.message
    });
  }

  const calendlyEmail = event.payload.invitee.email;
  const calendlyEventId = event.payload.event;
  const eventTime = event.payload.created_at || new Date().toISOString();

  if (!ref) {
    console.log('[Calendly] No ref found in scheduling_url, skipping call attribution.');
    return res.status(200).json({ received: true });
  }

  // Validate ref exists in links table and belongs to this user
  const { data: linkData, error: linkError } = await supabaseAdmin
    .from('links')
    .select('short_code, user_id')
    .eq('short_code', ref)
    .eq('user_id', userId)
    .single();

  console.log('[Calendly] Link lookup result:', {
    ref: ref,
    userId: userId,
    found: !!linkData,
    error: linkError?.message
  });

  if (linkError || !linkData) {
    console.error('[Calendly] Ref not found in links table for user:', { ref, userId, error: linkError });
    return res.status(200).json({ received: true });
  }

  // Insert into calls table
  const { error: callError } = await supabaseAdmin
    .from('calls')
    .insert([{
      short_code: ref,
      calendly_email: calendlyEmail,
      calendly_event_id: calendlyEventId,
      timestamp: eventTime,
      user_id: userId
    }]);

  if (callError) {
    console.error('[Calendly] Error inserting into calls table:', {
      error: callError,
      data: {
        short_code: ref,
        calendly_email: calendlyEmail,
        calendly_event_id: calendlyEventId,
        timestamp: eventTime,
        user_id: userId
      }
    });
    return res.status(500).send('Failed to insert call');
  }

  console.log('[Calendly] Call attributed successfully:', {
    short_code: ref,
    calendly_email: calendlyEmail,
    calendly_event_id: calendlyEventId,
    timestamp: eventTime,
    user_id: userId
  });

  res.status(200).json({ received: true });
} 