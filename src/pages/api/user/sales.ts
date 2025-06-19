import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../server/supabase-admin';
import { withAuth } from '../../../middleware/auth';
import { rateLimiters } from '../../../middleware/rateLimit';

// TypeScript types
interface Sale {
  id: string;
  short_code: string;
  amount: number;
  created_at: string;
  ip_address?: string;
  user_agent?: string;
}

interface ApiResponse<T> {
  data?: T;
  error?: string;
}

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<Sale[]>>,
  userId: string
) {
  try {
    // Apply rate limiting
    await rateLimiters.sales(req, res);

    if (req.method !== 'GET') {
      res.setHeader('Allow', ['GET']);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }

    const { short_code } = req.query;
    if (!short_code || typeof short_code !== 'string') {
      return res.status(400).json({ error: 'Valid short code is required' });
    }

    // First verify the user owns the link
    const { data: link, error: linkError } = await supabaseAdmin
      .from('links')
      .select('id')
      .eq('short_code', short_code)
      .eq('user_id', userId)
      .single();

    if (linkError) {
      if (linkError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Link not found' });
      }
      throw linkError;
    }

    // Get sales for the link
    const { data: sales, error: salesError } = await supabaseAdmin
      .from('sales')
      .select('*')
      .eq('short_code', short_code)
      .order('created_at', { ascending: false });

    if (salesError) throw salesError;
    return res.status(200).json({ data: sales });
  } catch (error) {
    console.error('Error in sales API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
    return res.status(500).json({ error: errorMessage });
  }
}

export default withAuth(handler); 