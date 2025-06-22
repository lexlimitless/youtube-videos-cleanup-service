import { supabaseAdmin } from '../../server/supabase-admin';
import { withAuth } from '../../middleware/auth';
import { getCalendlyAccessToken } from '../../lib/calendly';

const handler = async (req, res) => {
  const { userId } = req.auth;

  try {
    console.log(`[DIAGNOSTIC] Starting webhook check for user: ${userId}`);
    
    // 1. Get the user's Calendly access token
    const accessToken = await getCalendlyAccessToken(userId);
    if (!accessToken) {
      console.log(`[DIAGNOSTIC] No valid Calendly access token found for user ${userId}.`);
      return res.status(404).json({ error: 'Calendly integration not found or token expired.' });
    }
    console.log(`[DIAGNOSTIC] Found access token.`);

    // 2. Get the user's organization URI from their integration details
    const { data: integrationData, error: integrationError } = await supabaseAdmin
      .from('user_integrations')
      .select('calendly_organization_uri')
      .eq('user_id', userId)
      .eq('provider', 'calendly')
      .single();

    if (integrationError || !integrationData || !integrationData.calendly_organization_uri) {
      console.error(`[DIAGNOSTIC] Error fetching organization URI for user ${userId}:`, integrationError);
      return res.status(500).json({ error: 'Could not find Calendly organization URI for the user.' });
    }
    const organizationUri = integrationData.calendly_organization_uri;
    console.log(`[DIAGNOSTIC] Found organization URI: ${organizationUri}`);

    // 3. Fetch webhook subscriptions from Calendly API
    const webhookCheckUrl = `https://api.calendly.com/v2/webhook_subscriptions?organization=${organizationUri}&scope=organization`;
    console.log(`[DIAGNOSTIC] Fetching webhooks from: ${webhookCheckUrl}`);

    const webhookRes = await fetch(webhookCheckUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const webhookData = await webhookRes.json();

    if (!webhookRes.ok) {
      console.error('[DIAGNOSTIC] Error response from Calendly when fetching webhooks:', webhookData);
      return res.status(500).json({ error: 'Failed to fetch webhook subscriptions from Calendly.', details: webhookData });
    }

    console.log('--- [DIAGNOSTIC] CALENDLY WEBHOOK SUBSCRIPTIONS ---');
    console.log(JSON.stringify(webhookData, null, 2));
    console.log('--- [DIAGNOSTIC] END OF REPORT ---');

    res.status(200).json({
      message: 'Diagnostic check complete. See Vercel logs for webhook subscription details.',
      subscriptions: webhookData.collection,
    });

  } catch (error) {
    console.error('[DIAGNOSTIC] An unexpected error occurred:', error);
    res.status(500).json({ error: 'An internal server error occurred.' });
  }
};

export default withAuth(handler); 