import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../server/supabase-admin';
import { withAuth } from '../../../middleware/auth';
import { rateLimiters } from '../../../middleware/rateLimit';

// TypeScript types
interface Link {
  id: string;
  user_id: string;
  short_code: string;
  destination_url: string;
  title: string;
  platform: string;
  attribution_window_days: number;
  created_at: string;
  updated_at: string;
}

interface CreateLinkRequest {
  short_code: string;
  destination_url: string;
  title: string;
  platform: string;
  attribution_window_days: number;
  youtube_video_id?: string | null;
}

interface UpdateLinkRequest {
  title?: string;
  platform?: string;
  destination_url?: string;
  attribution_window_days?: number;
  youtube_video_id?: string | null;
}

interface ApiResponse<T> {
  data?: T;
  error?: string;
}

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<Link | Link[]>>,
  userId: string
) {
  try {
    // Apply rate limiting
    await rateLimiters.links(req, res);

    switch (req.method) {
      case 'GET':
        // Get all links for the user
        const { data: links, error: getError } = await supabaseAdmin
          .from('links')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (getError) throw getError;
        return res.status(200).json({ data: links });

      case 'POST':
        // Validate request body
        const createData = req.body as CreateLinkRequest;
        if (!createData.short_code || !createData.destination_url) {
          return res.status(400).json({ error: 'Missing required fields' });
        }

        // Create a new link
        const { data: newLink, error: createError } = await supabaseAdmin
          .from('links')
          .insert([{
            user_id: userId,
            ...createData,
          }])
          .select()
          .single();

        if (createError) throw createError;
        return res.status(201).json({ data: newLink });

      case 'PUT':
        // Validate request
        const { id } = req.query;
        if (!id || typeof id !== 'string') {
          return res.status(400).json({ error: 'Valid link ID is required' });
        }

        const updateData = req.body as UpdateLinkRequest;
        if (Object.keys(updateData).length === 0) {
          return res.status(400).json({ error: 'No update data provided' });
        }

        // Verify ownership
        const { data: existingLink, error: checkError } = await supabaseAdmin
          .from('links')
          .select('user_id')
          .eq('id', id)
          .single();

        if (checkError) {
          if (checkError.code === 'PGRST116') {
            return res.status(404).json({ error: 'Link not found' });
          }
          throw checkError;
        }

        if (existingLink.user_id !== userId) {
          return res.status(403).json({ error: 'Forbidden' });
        }

        // Update the link
        const { data: updatedLink, error: updateError } = await supabaseAdmin
          .from('links')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();

        if (updateError) throw updateError;
        return res.status(200).json({ data: updatedLink });

      case 'DELETE':
        // Validate request
        const linkId = req.query.id;
        if (!linkId || typeof linkId !== 'string') {
          return res.status(400).json({ error: 'Valid link ID is required' });
        }

        // Verify ownership
        const { data: linkToDelete, error: deleteCheckError } = await supabaseAdmin
          .from('links')
          .select('user_id')
          .eq('id', linkId)
          .single();

        if (deleteCheckError) {
          if (deleteCheckError.code === 'PGRST116') {
            return res.status(404).json({ error: 'Link not found' });
          }
          throw deleteCheckError;
        }

        if (linkToDelete.user_id !== userId) {
          return res.status(403).json({ error: 'Forbidden' });
        }

        // Delete the link
        const { error: deleteError } = await supabaseAdmin
          .from('links')
          .delete()
          .eq('id', linkId);

        if (deleteError) throw deleteError;
        return res.status(204).end();

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  } catch (error) {
    console.error('Error in links API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
    return res.status(500).json({ error: errorMessage });
  }
}

export default withAuth(handler); 