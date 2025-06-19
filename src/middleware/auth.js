import { createClerkClient } from '@clerk/backend';

export function withAuth(handler) {
  return async (req, res) => {
    try {
      const clerk = createClerkClient({ 
        secretKey: process.env.CLERK_SECRET_KEY,
        publishableKey: process.env.CLERK_PUBLISHABLE_KEY
      });
      
      // Convert Next.js req to a proper Request object
      const url = new URL(req.url || '', `https://${req.headers.host || 'localhost'}`);
      const request = new Request(url, {
        method: req.method,
        headers: req.headers,
        body: req.body ? JSON.stringify(req.body) : undefined,
      });
      
      const authResult = await clerk.authenticateRequest(request);
      
      // Extract userId from the JWT token
      let userId;
      if (authResult.token) {
        try {
          // Decode the JWT token (base64 decode the payload part)
          const tokenParts = authResult.token.split('.');
          if (tokenParts.length === 3) {
            const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
            userId = payload.sub; // 'sub' is the user ID in Clerk JWT tokens
          }
        } catch (decodeError) {
          console.error('Error decoding JWT token:', decodeError);
        }
      }
      
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      return handler(req, res, userId);
    } catch (error) {
      console.error('Auth middleware error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}

// Standalone function to extract userId from request
export async function getUserIdFromRequest(req) {
  try {
    const clerk = createClerkClient({ 
      secretKey: process.env.CLERK_SECRET_KEY,
      publishableKey: process.env.CLERK_PUBLISHABLE_KEY
    });
    
    // Convert Next.js req to a proper Request object
    const url = new URL(req.url || '', `https://${req.headers.host || 'localhost'}`);
    const request = new Request(url, {
      method: req.method,
      headers: req.headers,
      body: req.body ? JSON.stringify(req.body) : undefined,
    });
    
    const authResult = await clerk.authenticateRequest(request);
    
    // Extract userId from the JWT token
    if (authResult.token) {
      try {
        // Decode the JWT token (base64 decode the payload part)
        const tokenParts = authResult.token.split('.');
        if (tokenParts.length === 3) {
          const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
          return payload.sub; // 'sub' is the user ID in Clerk JWT tokens
        }
      } catch (decodeError) {
        console.error('Error decoding JWT token:', decodeError);
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error getting userId from request:', error);
    return null;
  }
} 