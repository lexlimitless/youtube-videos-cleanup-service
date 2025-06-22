import { supabaseAdmin } from '../../src/server/supabase-admin.js';
import { withAuth } from '../../src/middleware/auth.js';
import { getCalendlyAccessToken } from '../../src/lib/calendly.js';

const handler = async (req, res) => {
  const { userId } = req.auth;

  if (req.method === 'GET') {
    try {
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
        console.error(`[DIAGNOSTIC] Error fetching integration for user ${userId}:`, dbError);
        return res.status(500).json({ error: 'Failed to fetch local integration data.', details: dbError });
      }

      const { calendly_organization_uri: organizationUri, calendly_user_uri: userUri, webhook_id } = integrationData;

      if (!organizationUri || !userUri) {
        return res.status(500).json({ error: 'Could not find Calendly organization or user URI in the database.' });
      }
      
      const webhookCheckUrl = `https://api.calendly.com/webhook_subscriptions?organization=${organizationUri}&user=${userUri}&scope=user`;
      const webhookRes = await fetch(webhookCheckUrl, { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` } });
      const webhookData = await webhookRes.json();

      if (!webhookRes.ok) {
        console.error(`[DIAGNOSTIC] Failed to fetch webhook subscriptions from Calendly for user ${userId}:`, webhookData);
        return res.status(500).json({ error: 'Failed to fetch webhook subscriptions from Calendly.', details: webhookData });
      }
      
      return res.status(200).json({
        message: 'Diagnostic check complete.',
        local_webhook_id: webhook_id,
        calendly_subscriptions: webhookData.collection,
      });
    } catch (error) {
      console.error(`[DIAGNOSTIC] An unexpected error occurred for user ${userId}:`, error);
      return res.status(500).json({ error: 'An internal server error occurred.' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const accessToken = await getCalendlyAccessToken(userId);
      if (!accessToken) return res.status(404).json({ error: 'Calendly integration not found or token expired.' });

      const { data: integrationData, error: dbError } = await supabaseAdmin.from('user_integrations').select('calendly_organization_uri, calendly_user_uri').eq('user_id', userId).single();
      
      if (dbError) {
        console.error(`[DIAGNOSTIC-DELETE] Error fetching integration for user ${userId}:`, dbError);
        return res.status(500).json({ error: 'Failed to fetch integration details for deletion.' });
      }
      
      const organizationUri = integrationData?.calendly_organization_uri;
      const userUri = integrationData?.calendly_user_uri;

      if (!organizationUri || !userUri) {
        return res.status(500).json({ error: 'Could not find Calendly organization or user URI.' });
      }

      const listUrl = `https://api.calendly.com/webhook_subscriptions?organization=${organizationUri}&user=${userUri}&scope=user`;
      const listRes = await fetch(listUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
      
      if (!listRes.ok) {
        console.error(`[DIAGNOSTIC-DELETE] Failed to list webhooks for user ${userId} before deleting.`);
        throw new Error('Failed to list existing webhooks before deleting.');
      }
      
      const listData = await listRes.json();

      if (listData.collection.length === 0) {
        return res.status(200).json({ success: true, message: 'No active webhooks found to delete.' });
      }

      const deletionPromises = listData.collection.map(webhook => {
        return fetch(webhook.uri, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${accessToken}` },
        });
      });

      const results = await Promise.all(deletionPromises);
      const failedDeletions = results.filter(r => !r.ok);

      if (failedDeletions.length > 0) {
        console.error(`[DIAGNOSTIC-DELETE] Failed to delete some webhooks for user ${userId}.`);
        throw new Error('Some webhooks could not be deleted.');
      }

      return res.status(200).json({ success: true, message: `Successfully deleted ${listData.collection.length} webhook(s).` });

    } catch (error) {
      console.error(`[DIAGNOSTIC-DELETE] Webhook cleanup failed for user ${userId}:`, error);
      return res.status(500).json({ error: 'An internal server error occurred during cleanup.' });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
};

export default withAuth(handler); 