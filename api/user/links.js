import { supabaseAdmin } from '../../src/server/supabase-admin.js';
import { withAuth } from '../../src/middleware/auth.js';

async function handler(req, res, userId) {
  if (req.method === 'GET') {
    const { id } = req.query;
    
    if (id) {
      // Get specific link
      const { data, error } = await supabaseAdmin
        .from('links')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .single();

      if (error) return res.status(500).json({ error: error.message });
      if (!data) return res.status(404).json({ error: 'Link not found' });
      
      return res.status(200).json({ data });
    } else {
      // Get all links for user
      const { data, error } = await supabaseAdmin
        .from('links')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ data });
    }
  }

  if (req.method === 'POST') {
    const { destination_url, title, platform, attribution_window_days } = req.body;
    
    if (!destination_url) {
      return res.status(400).json({ error: 'Missing destination_url' });
    }

    // Generate short code
    const shortCode = Math.random().toString(36).substring(2, 8);
    
    const { data, error } = await supabaseAdmin
      .from('links')
      .insert([{
        user_id: userId,
        destination_url,
        short_code: shortCode,
        title: title || '',
        platform: platform || 'YouTube',
        attribution_window_days: attribution_window_days || 7
      }])
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json({ data });
  }

  if (req.method === 'PUT') {
    const { id, destination_url, title, platform, attribution_window_days } = req.body;
    
    if (!id) {
      return res.status(400).json({ error: 'Missing id' });
    }

    const { data, error } = await supabaseAdmin
      .from('links')
      .update({
        destination_url,
        title: title || '',
        platform: platform || 'YouTube',
        attribution_window_days: attribution_window_days || 7,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'Link not found' });
    
    return res.status(200).json({ data });
  }

  if (req.method === 'DELETE') {
    const { id } = req.query;
    
    if (!id) {
      return res.status(400).json({ error: 'Missing id' });
    }

    const { error } = await supabaseAdmin
      .from('links')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default withAuth(handler); 