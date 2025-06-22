import { verifyToken } from '@clerk/backend';
import { supabaseAdmin } from '../server/supabase-admin.js';

export const withAuth = (handler) => async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.auth = { userId: user.id };

    return handler(req, res);
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

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
    // Silently fail in production
    return null;
  }
} 