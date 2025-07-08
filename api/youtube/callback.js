import { supabaseAdmin } from '../../src/server/supabase-admin.js';

async function handler(req, res) {
  // 1. Extract code and state from query
  const { code, state, error } = req.query;

  // 2. If error, redirect to integrations page with error
  if (error) {
    return res.redirect(`/integrations?error=youtube_oauth_error&message=${encodeURIComponent(error)}`);
  }

  // 3. If no code or state, redirect with error
  if (!code || !state) {
    return res.redirect('/integrations?error=youtube_no_code_or_state');
  }

  // 4. At this point, we do NOT know the userId (Google does not send it)
  //    We need the frontend to handle this:
  //    - Redirect to a frontend route (e.g., /integrations/youtube-callback?code=...&state=...)
  //    - The frontend can read sessionStorage for youtube_oauth_state and youtube_oauth_user_id
  //    - The frontend then POSTs code, state, and userId to a secure backend endpoint to finish the connection

  // For now, redirect to a frontend handler route
  return res.redirect(`/integrations/youtube-callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`);
}

export default handler; 