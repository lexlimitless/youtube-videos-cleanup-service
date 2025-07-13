import { createClient } from '@supabase/supabase-js';
import { withAuth } from '../../src/middleware/auth.js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function handler(req, res) {
  const { userId } = req.auth;
  console.log('YouTube Videos Cleanup API - userId:', userId);

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check if user has admin privileges (you can customize this logic)
    const { data: user, error: userError } = await supabase
      .from('user_integrations')
      .select('*')
      .eq('user_id', userId)
      .eq('provider', 'youtube')
      .single();

    if (userError || !user) {
      return res.status(403).json({ 
        error: 'Access denied',
        message: 'You need YouTube integration access to perform cleanup operations.'
      });
    }

    // Parse cleanup options from request body
    const {
      removeUnreferenced = true,
      maxAgeDays = 90,
      staleFetchDays = 30,
      inactiveUserDays = 180,
      removeDisconnected = true,
      dryRun = true, // Default to dry run for safety
      targetUserId = null
    } = req.body;

    console.log('YouTube Videos Cleanup API - Cleanup options:', {
      removeUnreferenced,
      maxAgeDays,
      staleFetchDays,
      inactiveUserDays,
      removeDisconnected,
      dryRun,
      targetUserId: targetUserId || 'all users'
    });

    // Validate parameters
    if (maxAgeDays < 0 || staleFetchDays < 0 || inactiveUserDays < 0) {
      return res.status(400).json({
        error: 'Invalid parameters',
        message: 'All day parameters must be non-negative numbers.'
      });
    }

    // Call the Supabase Edge Function
    const functionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/cleanup-youtube-videos`;
    
    const functionResponse = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        removeUnreferenced,
        maxAgeDays,
        staleFetchDays,
        inactiveUserDays,
        removeDisconnected,
        dryRun,
        userId: targetUserId
      }),
    });

    if (!functionResponse.ok) {
      const errorText = await functionResponse.text();
      console.error('YouTube Videos Cleanup API - Edge function error:', errorText);
      return res.status(500).json({
        error: 'Cleanup function failed',
        message: 'The cleanup operation could not be completed.',
        details: errorText
      });
    }

    const result = await functionResponse.json();
    
    console.log('YouTube Videos Cleanup API - Cleanup completed:', {
      success: result.success,
      dryRun: result.dryRun,
      videosDeleted: result.summary?.videosDeleted || 0,
      totalVideosBefore: result.summary?.totalVideosBefore || 0,
      totalVideosAfter: result.summary?.totalVideosAfter || 0
    });

    // Log the cleanup operation
    await supabase
      .from('admin_logs')
      .insert({
        user_id: userId,
        action: 'youtube_videos_cleanup',
        details: {
          options: {
            removeUnreferenced,
            maxAgeDays,
            staleFetchDays,
            inactiveUserDays,
            removeDisconnected,
            dryRun,
            targetUserId
          },
          result: result
        },
        created_at: new Date().toISOString()
      })
      .catch(err => {
        console.warn('Failed to log cleanup operation:', err);
        // Don't fail the request if logging fails
      });

    return res.status(200).json({
      success: true,
      message: dryRun ? 'Cleanup simulation completed' : 'Cleanup completed successfully',
      result: result
    });

  } catch (error) {
    console.error('YouTube Videos Cleanup API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: 'An unexpected error occurred during cleanup.',
      details: error.message
    });
  }
}

export default withAuth(handler); 