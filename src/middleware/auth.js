import { createClerkClient } from '@clerk/backend';

const clerk = createClerkClient({ 
  secretKey: process.env.CLERK_SECRET_KEY,
});

export function withAuth(handler) {
  return async (req, res) => {
    console.log(`[Auth Middleware] - Starting auth for: ${req.url}`);
    try {
      // The Clerk SDK can extract the token from the headers automatically.
      const claims = await clerk.verifyToken(req.headers.authorization?.split(' ')[1]);
      
      if (!claims || !claims.sub) {
        console.error('[Auth Middleware] - Verification failed: No claims or user ID found.');
        return res.status(401).json({ error: 'Unauthorized: Invalid token' });
      }
      
      const userId = claims.sub;
      console.log(`[Auth Middleware] - Auth successful for user: ${userId}`);
      
      return handler(req, res, userId);

    } catch (error) {
      console.error(`[Auth Middleware] - CRITICALUTHENTICATION ERROR:`, error);
      
      // Provide a more specific error message if the token is expired
      if (error.message?.includes('expired')) {
        return res.status(401).json({ error: 'Unauthorized: Token has expired.' });
      }
      
      return res.status(401).json({ error: 'Unauthorized' });
    }
  };
}

// This standalone function is no longer needed with the simplified middleware
// and can be removed if it's not used anywhere else.
// For now, it will be left as is to avoid breaking other parts of the app.
export async function getUserIdFromRequest(req) {
  try {
    const claims = await clerk.verifyToken(req.headers.authorization?.split(' ')[1]);
    return claims?.sub || null;
  } catch (error) {
    console.error('Error getting userId from request:', error);
    return null;
  }
} 