import { supabaseAdmin } from '../../src/server/supabase-admin.js';
import crypto from 'crypto';

const SIGNING_KEY = process.env.CALENDLY_WEBHOOK_SIGNING_KEY;

function verifySignature(req, signingKey) {
  const signature = req.headers['calendly-webhook-signature'];
  const payload = JSON.stringify(req.body);
  const expected = crypto.createHmac('sha256', signingKey).update(payload).digest('hex');
  console.log('[Calendly] Signature verification:', {
    received: signature,
    expected: expected,
    matches: signature === expected
  });
  return signature === expected;
}

export default async function handler(req, res) {
  console.log('[Calendly] Webhook received:', {
    method: req.method,
    headers: req.headers,
    body: req.body
  });
  
  // Initialize webhook status if it doesn't exist
  const { error: initError } = await supabaseAdmin
    .from('webhook_status')
    .upsert([
      {
        provider: 'calendly',
        is_active: true,
        last_checked_at: new Date().toISOString()
      }
    ], { onConflict: 'provider' });

  if (initError) {
    console.error('[Calendly] Error initializing webhook status:', initError);
  }

  if (req.method !== 'POST') {
    console.log('[Calendly] Invalid method:', req.method);
    return res.status(405).end();
  }

  if (!SIGNING_KEY) {
    console.error('[Calendly] Missing CALENDLY_WEBHOOK_SIGNING_KEY environment variable');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  if (!verifySignature(req, SIGNING_KEY)) {
    console.error('[Calendly] Invalid webhook signature');
    // Update webhook status to indicate failure
    await supabaseAdmin
      .from('webhook_status')
      .update({ 
        is_active: false,
        last_checked_at: new Date().toISOString(),
        last_error: 'Invalid signature'
      })
      .eq('provider', 'calendly');
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

  // Validate ref exists in links table
  const { data: linkData, error: linkError } = await supabaseAdmin
    .from('links')
    .select('short_code, user_id')
    .eq('short_code', ref)
    .single();

  console.log('[Calendly] Link lookup result:', {
    ref: ref,
    found: !!linkData,
    error: linkError?.message
  });

  if (linkError || !linkData) {
    console.error('[Calendly] Ref not found in links table:', ref, linkError);
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
      user_id: linkData.user_id // Add user_id for better tracking
    }]);

  if (callError) {
    console.error('[Calendly] Error inserting into calls table:', {
      error: callError,
      data: {
        short_code: ref,
        calendly_email: calendlyEmail,
        calendly_event_id: calendlyEventId,
        timestamp: eventTime,
        user_id: linkData.user_id
      }
    });
    return res.status(500).send('Failed to insert call');
  }

  console.log('[Calendly] Call attributed successfully:', {
    short_code: ref,
    calendly_email: calendlyEmail,
    calendly_event_id: calendlyEventId,
    timestamp: eventTime,
    user_id: linkData.user_id
  });

  // Update webhook status to indicate success
  const { error: statusError } = await supabaseAdmin
    .from('webhook_status')
    .update({ 
      is_active: true,
      last_checked_at: new Date().toISOString(),
      last_error: null
    })
    .eq('provider', 'calendly');

  if (statusError) {
    console.error('[Calendly] Error updating webhook status:', statusError);
  }

  res.status(200).json({ received: true });
} 