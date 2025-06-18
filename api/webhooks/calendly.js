import { supabase } from '../../src/server/supabase.js';
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
  if (req.method !== 'POST') return res.status(405).end();

  if (!verifySignature(req, SIGNING_KEY)) {
    console.error('Invalid webhook signature');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const event = req.body;
  console.log('Webhook payload:', event);
  // Extract short_code from UTM or custom question
  const shortCode = event.payload.invitee.utm_source ||
    (event.payload.invitee.questions_and_answers.find(q => q.question.includes('source'))?.answer);

  if (shortCode) {
    const { error } = await supabase.from('calls').insert([{
      short_code: shortCode,
      event_id: event.payload.event,
      calendly_email: event.payload.invitee.email,
    }]);
    if (error) {
      console.error('Supabase insert error:', error);
      return res.status(500).send('Failed to insert call');
    }
  }

  // Upsert webhook_status for Calendly
  const { error: statusError } = await supabase.from('webhook_status').upsert([
    {
      provider: 'calendly',
      is_active: true,
      last_checked_at: new Date().toISOString(),
    }
  ], { onConflict: 'provider' });
  if (statusError) {
    console.error('Supabase webhook_status upsert error:', statusError);
    return res.status(500).send('Failed to update webhook status');
  }

  res.status(200).json({ received: true });
} 