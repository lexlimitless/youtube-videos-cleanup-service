import { supabaseAdmin } from '../../src/server/supabase-admin.js';
import { withAuth } from '../../src/middleware/auth.js';
import { getYouTubeAccessToken, getYouTubeChannelInfo, getYouTubeVideos } from '../../src/lib/youtube.js';

const handler = async (req, res) => {
  const { userId } = req.auth;

  if (req.method === 'GET') {
    try {
      console.log(`[YOUTUBE DIAGNOSTIC] Starting diagnostic for user ${userId}`);

      // Check if user has YouTube integration
      const { data: integration, error: dbError } = await supabaseAdmin
        .from('user_integrations')
        .select('*')
        .eq('user_id', userId)
        .eq('provider', 'youtube')
        .single();

      if (dbError && dbError.code !== 'PGRST116') {
        console.error(`[YOUTUBE DIAGNOSTIC] Error fetching integration for user ${userId}:`, dbError);
        return res.status(500).json({ 
          error: 'Failed to fetch local integration data.', 
          details: dbError,
          status: 'no_integration'
        });
      }

      if (!integration) {
        return res.status(404).json({ 
          error: 'YouTube integration not found.', 
          status: 'no_integration' 
        });
      }

      console.log(`[YOUTUBE DIAGNOSTIC] Found integration for user ${userId}`);

      // Test access token
      const accessToken = await getYouTubeAccessToken(userId);
      if (!accessToken) {
        return res.status(401).json({ 
          error: 'YouTube access token is invalid or expired.', 
          status: 'token_invalid',
          integration: {
            is_connected: integration.is_connected,
            provider_channel_id: integration.provider_channel_id,
            provider_channel_title: integration.provider_channel_title,
            provider_token_expires_at: integration.provider_token_expires_at
          }
        });
      }

      console.log(`[YOUTUBE DIAGNOSTIC] Access token is valid for user ${userId}`);

      // Test channel info
      const channelInfo = await getYouTubeChannelInfo(userId);
      if (!channelInfo) {
        return res.status(500).json({ 
          error: 'Failed to fetch YouTube channel information.', 
          status: 'channel_fetch_failed',
          integration: {
            is_connected: integration.is_connected,
            provider_channel_id: integration.provider_channel_id,
            provider_channel_title: integration.provider_channel_title
          }
        });
      }

      console.log(`[YOUTUBE DIAGNOSTIC] Channel info fetched for user ${userId}:`, channelInfo.id);

      // Test video access (optional, to verify API permissions)
      const videos = await getYouTubeVideos(userId, 5);
      
      // Check if local data matches YouTube data
      const localChannelId = integration.provider_channel_id;
      const youtubeChannelId = channelInfo.id;
      const dataMatches = localChannelId === youtubeChannelId;

      const diagnosticResult = {
        status: 'healthy',
        message: 'YouTube integration is working correctly.',
        integration: {
          is_connected: integration.is_connected,
          provider_channel_id: localChannelId,
          provider_channel_title: integration.provider_channel_title,
          provider_token_expires_at: integration.provider_token_expires_at
        },
        youtube_data: {
          channel_id: youtubeChannelId,
          channel_title: channelInfo.snippet?.title,
          channel_description: channelInfo.snippet?.description,
          channel_thumbnail: channelInfo.snippet?.thumbnails?.default?.url,
          subscriber_count: channelInfo.statistics?.subscriberCount,
          video_count: channelInfo.statistics?.videoCount,
          view_count: channelInfo.statistics?.viewCount
        },
        api_tests: {
          access_token_valid: true,
          channel_info_accessible: true,
          videos_accessible: videos !== null,
          video_count: videos ? videos.length : 0
        },
        data_consistency: {
          channel_id_matches: dataMatches,
          local_vs_youtube: {
            local_channel_id: localChannelId,
            youtube_channel_id: youtubeChannelId
          }
        }
      };

      if (!dataMatches) {
        diagnosticResult.status = 'data_mismatch';
        diagnosticResult.message = 'Local channel ID does not match YouTube channel ID.';
      }

      console.log(`[YOUTUBE DIAGNOSTIC] Diagnostic complete for user ${userId}:`, diagnosticResult.status);

      return res.status(200).json(diagnosticResult);

    } catch (error) {
      console.error(`[YOUTUBE DIAGNOSTIC] An unexpected error occurred for user ${userId}:`, error);
      return res.status(500).json({ 
        error: 'An internal server error occurred during diagnostic.',
        status: 'unexpected_error',
        details: error.message
      });
    }
  }

  if (req.method === 'DELETE') {
    try {
      console.log(`[YOUTUBE DIAGNOSTIC] Force disconnect requested for user ${userId}`);

      // Get integration details
      const { data: integration, error: fetchError } = await supabaseAdmin
        .from('user_integrations')
        .select('provider_access_token, provider_user_id')
        .eq('user_id', userId)
        .eq('provider', 'youtube')
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error(`[YOUTUBE DIAGNOSTIC] Error fetching integration for user ${userId}:`, fetchError);
        return res.status(500).json({ error: 'Failed to fetch integration details for deletion.' });
      }

      if (!integration) {
        return res.status(404).json({ error: 'YouTube integration not found.' });
      }

      // Revoke the access token
      if (integration.provider_access_token) {
        try {
          const revokeResponse = await fetch('https://oauth2.googleapis.com/revoke', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `token=${integration.provider_access_token}`
          });

          if (revokeResponse.ok) {
            console.log(`[YOUTUBE DIAGNOSTIC] Successfully revoked token for user ${userId}`);
          } else {
            console.warn(`[YOUTUBE DIAGNOSTIC] Failed to revoke token for user ${userId}, but proceeding with deletion`);
          }
        } catch (revokeError) {
          console.error(`[YOUTUBE DIAGNOSTIC] Error revoking token for user ${userId}:`, revokeError);
        }
      }

      // Delete from both tables
      const { error: deleteIntegrationError } = await supabaseAdmin
        .from('user_integrations')
        .delete()
        .eq('user_id', userId)
        .eq('provider', 'youtube');

      if (deleteIntegrationError) {
        console.error(`[YOUTUBE DIAGNOSTIC] Error deleting integration for user ${userId}:`, deleteIntegrationError);
        return res.status(500).json({ error: 'Failed to delete integration from database.' });
      }

      const { error: deleteAccountError } = await supabaseAdmin
        .from('youtube_accounts')
        .delete()
        .eq('user_id', userId);

      if (deleteAccountError) {
        console.warn(`[YOUTUBE DIAGNOSTIC] Error deleting YouTube account for user ${userId}:`, deleteAccountError);
        // Don't fail the entire operation if this fails
      }

      console.log(`[YOUTUBE DIAGNOSTIC] Successfully force disconnected YouTube for user ${userId}`);

      return res.status(200).json({ 
        message: 'YouTube integration has been force disconnected and all data has been removed.',
        status: 'disconnected'
      });

    } catch (error) {
      console.error(`[YOUTUBE DIAGNOSTIC] An unexpected error occurred during force disconnect for user ${userId}:`, error);
      return res.status(500).json({ error: 'An internal server error occurred during force disconnect.' });
    }
  }

  res.setHeader('Allow', ['GET', 'DELETE']);
  return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
};

export default withAuth(handler); 