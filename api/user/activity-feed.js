import { supabaseAdmin } from '../../src/server/supabase-admin.js';
import { withAuth } from '../../src/middleware/auth.js';

const handler = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { userId } = req.auth;
  const { filter = 'all', page = 1 } = req.query;
  const pageSize = 50;

  try {
    const { data, error } = await supabaseAdmin.rpc('get_activity_feed', {
      p_user_id: userId,
      p_filter: filter,
      p_page: parseInt(page, 10),
      p_page_size: pageSize,
    });

    if (error) {
      console.error('Error fetching activity feed:', error);
      return res.status(500).json({ error: 'Failed to fetch activity feed.' });
    }

    return res.status(200).json({ data });
  } catch (error) {
    console.error('Unexpected error in activity feed endpoint:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

export default withAuth(handler); 