import { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from '../../../../src/middleware/auth';

interface AuthenticatedRequest extends NextApiRequest {
  auth?: {
    userId: string;
  };
}

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { videoId } = req.query;
  if (!videoId || typeof videoId !== 'string') {
    return res.status(400).json({ error: 'Video ID is required' });
  }

  try {
    // Import the handler from the API file
    const { default: apiHandler } = await import('../../../../api/user/youtube/video-details.js');
    
    // Create a mock request object that matches the expected format
    const mockReq = {
      ...req,
      auth: req.auth, // This should be set by the withAuth middleware
      query: req.query,
    };

    // Call the API handler
    return await apiHandler(mockReq, res);
  } catch (error) {
    console.error('Error in video details API route:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: 'An unexpected error occurred. Please try again later.'
    });
  }
}

export default withAuth(handler); 