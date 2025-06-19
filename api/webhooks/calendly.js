import { supabaseAdmin } from '../../src/server/supabase-admin.js';
import crypto from 'crypto';

const SIGNING_KEY = process.env.CALENDLY_WEBHOOK_SIGNING_KEY;

function verifySignature(req, signingKey) {
  const signature = req.headers['calendly-webhook-signature'];
  const payload = JSON.stringify(req.body);
  const expected = crypto.createHmac('sha256', signingKey).update(payload).digest('hex');
  return signature === expected;
}

export default async function handler(req, res) {
  console.log('Calendly webhook endpoint hit');
  
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
    console.error('Error initializing webhook status:', initError);
  }

  if (req.method !== 'POST') return res.status(405).end();

  if (!verifySignature(req, SIGNING_KEY)) {
    console.error('Invalid webhook signature');
    // Update webhook status to indicate failure
    await supabaseAdmin
      .from('webhook_status')
      .update({ 
        is_active: false,
        last_checked_at: new Date().toISOString()
      })
      .eq('provider', 'calendly');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const event = req.body;
  console.log('Webhook payload:', event);
  
  // Extract short_code from UTM or custom question
  const shortCode = event.payload.invitee.utm_source ||
    (event.payload.invitee.questions_and_answers.find(q => q.question.includes('source'))?.answer);

  if (shortCode) {
    const { error } = await supabaseAdmin.from('calls').insert([{
      short_code: shortCode,
      event_id: event.payload.event,
      calendly_email: event.payload.invitee.email,
    }]);
    if (error) {
      console.error('Supabase insert error:', error);
      return res.status(500).send('Failed to insert call');
    }
  }

  // Update webhook status to indicate success
  const { error: statusError } = await supabaseAdmin
    .from('webhook_status')
    .update({ 
      is_active: true,
      last_checked_at: new Date().toISOString()
    })
    .eq('provider', 'calendly');

  if (statusError) {
    console.error('Error updating webhook status:', statusError);
  }

  res.status(200).json({ received: true });
} 