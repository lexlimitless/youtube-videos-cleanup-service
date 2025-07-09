import { verifyToken } from '@clerk/backend';

export function withAuth(handler) {
  return async (req, res) => {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        return res.status(401).json({ error: 'Unauthorized: No token provided' });
      }
      
      const claims = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY });
      
      if (!claims || !claims.sub) {
        console.error('[Auth Middleware] - Verification failed: No claims or user ID found.');
        return res.status(401).json({ error: 'Unauthorized: Invalid token' });
      }
      
      const userId = claims.sub;
      
      // Attach the auth details to the request object
      req.auth = { userId }; 

      // Call the handler with the MODIFIED request object
      return handler(req, res);

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
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return null;
    const claims = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY });
    return claims?.sub || null;
  } catch (error) {
    console.error('Error getting userId from request:', error);
    return null;
  }
} 