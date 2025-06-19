import { supabaseAdmin } from '../../src/server/supabase-admin.js';
import { withAuth } from '../../src/middleware/auth.js';

async function handler(req, res, userId) {
  if (req.method === 'GET') {
    const { short_code } = req.query;
    
    if (!short_code) {
      return res.status(400).json({ error: 'Missing short_code' });
    }

    // Debug: log incoming request
    console.log('[DEBUG] userId:', userId, 'short_code:', short_code);

    // Verify the link belongs to the user
    const { data: linkData, error: linkError } = await supabaseAdmin
      .from('links')
      .select('id, short_code, user_id')
      .eq('short_code', short_code)
      .eq('user_id', userId)
      .single();

    if (linkError) {
      console.error('[DEBUG] Supabase linkError:', linkError);
    }
    if (!linkData) {
      console.error('[DEBUG] No linkData found for short_code:', short_code, 'and userId:', userId);
      return res.status(404).json({ error: 'Link not found' });
    }

    // Get clicks for this link
    const { data, error } = await supabaseAdmin
      .from('clicks')
      .select('*')
      .eq('short_code', short_code)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[DEBUG] Supabase clicks error:', error);
      return res.status(500).json({ error: error.message });
    }
    return res.status(200).json({ data });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default withAuth(handler); 