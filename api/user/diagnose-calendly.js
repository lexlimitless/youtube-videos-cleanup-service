import { supabaseAdmin } from '../../src/server/supabase-admin.js';
import { withAuth } from '../../src/middleware/auth.js';
import { getCalendlyAccessToken } from '../../src/lib/calendly.js';

const handler = async (req, res) => {
  const { userId } = req.auth;

  if (req.method === 'GET') {
    try {
      console.log(`[DIAGNOSTIC] Starting webhook check for user: ${userId}`);
      
      const accessToken = await getCalendlyAccessToken(userId);
      if (!accessToken) {
        return res.status(404).json({ error: 'Calendly integration not found or token expired.' });
      }

      const { data: integrationData, error: dbError } = await supabaseAdmin
        .from('user_integrations')
        .select('calendly_organization_uri, calendly_user_uri, webhook_id')
        .eq('user_id', userId)
        .single();

      if (dbError) {
        return res.status(500).json({ error: 'Failed to fetch local integration data.', details: dbError });
      }

      const { calendly_organization_uri: organizationUri, calendly_user_uri: userUri, webhook_id } = integrationData;

      if (!organizationUri || !userUri) {
        return res.status(500).json({ error: 'Could not find Calendly organization or user URI in the database.' });
      }
      
      const webhookCheckUrl = `https://api.calendly.com/webhook_subscriptions?organization=${organizationUri}&user=${userUri}&scope=user`;
      const webhookRes = await fetch(webhookCheckUrl, { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` } });
      const webhookData = await webhookRes.json();

      if (!webhookRes.ok) return res.status(500).json({ error: 'Failed to fetch webhook subscriptions from Calendly.', details: webhookData });

      console.log('--- [DIAGNOSTIC] CALENDLY WEBHOOK SUBSCRIPTIONS ---');
      console.log(JSON.stringify(webhookData, null, 2));
      console.log('--- [DIAGNOSTIC] END OF REPORT ---');

      return res.status(200).json({
        message: 'Diagnostic check complete. See Vercel logs for full webhook subscription details.',
        local_webhook_id: webhook_id,
        calendly_subscriptions: webhookData.collection,
      });
    } catch (error) {
      console.error('[DIAGNOSTIC] An unexpected error occurred:', error);
      return res.status(500).json({ error: 'An internal server error occurred.' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      console.log(`[DIAGNOSTIC-DELETE] Starting webhook cleanup for user: ${userId}`);
      const accessToken = await getCalendlyAccessToken(userId);
      if (!accessToken) return res.status(404).json({ error: 'Calendly integration not found or token expired.' });

      const { data: integrationData } = await supabaseAdmin.from('user_integrations').select('calendly_organization_uri, calendly_user_uri').eq('user_id', userId).single();
      const organizationUri = integrationData?.calendly_organization_uri;
      const userUri = integrationData?.calendly_user_uri;

      if (!organizationUri || !userUri) {
        return res.status(500).json({ error: 'Could not find Calendly organization or user URI.' });
      }

      // 1. List all webhooks
      const listUrl = `https://api.calendly.com/webhook_subscriptions?organization=${organizationUri}&user=${userUri}&scope=user`;
      const listRes = await fetch(listUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
      const listData = await listRes.json();
      if (!listRes.ok) throw new Error('Failed to list existing webhooks before deleting.');

      if (listData.collection.length === 0) {
        return res.status(200).json({ success: true, message: 'No active webhooks found to delete.' });
      }

      // 2. Delete each webhook
      const deletionPromises = listData.collection.map(webhook => {
        console.log(`[DIAGNOSTIC-DELETE] Deleting webhook: ${webhook.uri}`);
        return fetch(webhook.uri, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${accessToken}` },
        });
      });

      const results = await Promise.all(deletionPromises);
      const failedDeletions = results.filter(r => !r.ok);

      if (failedDeletions.length > 0) {
        throw new Error('Some webhooks could not be deleted.');
      }

      return res.status(200).json({ success: true, message: `Successfully deleted ${listData.collection.length} webhook(s).` });

    } catch (error) {
      console.error('[DIAGNOSTIC-DELETE] Webhook cleanup failed:', error);
      return res.status(500).json({ error: 'An internal server error occurred during cleanup.' });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
};

export default withAuth(handler); 