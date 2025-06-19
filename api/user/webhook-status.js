import { supabaseAdmin } from '../../src/server/supabase-admin.js';
import { withAuth } from '../../src/middleware/auth.js';

async function handler(req, res, userId) {
  if (req.method === 'GET') {
    // Only return Calendly webhook status
    const { data, error } = await supabaseAdmin
      .from('webhook_status')
      .select('*')
      .eq('provider', 'calendly');

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: error.message });
    }
    
    // If no data exists, return default status
    if (!data || data.length === 0) {
      return res.status(200).json({ 
        data: {
          provider: 'calendly',
          is_active: false,
          last_checked_at: null
        }
      });
    }
    
    return res.status(200).json({ data: data[0] });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default withAuth(handler); 