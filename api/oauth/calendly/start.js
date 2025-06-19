export default async function handler(req, res) {
  console.log('Calendly OAuth start endpoint hit');
  const CALENDLY_CLIENT_ID = process.env.CALENDLY_CLIENT_ID || '';
  const REDIRECT_URI = process.env.CALENDLY_REDIRECT_URI || 'https://www.moreclientslesscrickets.com/api/oauth/calendly/callback';
  
  const { state: stateFromQuery } = req.query;
  if (!stateFromQuery) {
    console.error('Missing state in request');
    return res.status(400).send('Missing state');
  }
  let decodedState;
  try {
    decodedState = JSON.parse(Buffer.from(stateFromQuery, 'base64').toString());
    console.log('Decoded state in start endpoint:', decodedState);
  } catch (e) {
    console.error('Failed to decode state:', e);
  }
  console.log('Received state in start endpoint:', stateFromQuery);

  // Log environment for debugging
  console.log('Using PRODUCTION Calendly environment');
  console.log('Client ID:', CALENDLY_CLIENT_ID);
  console.log('Redirect URI:', REDIRECT_URI);

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CALENDLY_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    state: stateFromQuery,
  });

  const calendlyAuthUrl = `https://auth.calendly.com/oauth/authorize?${params.toString()}`;
  console.log('Redirecting to Calendly OAuth:', calendlyAuthUrl);

  try {
    res.writeHead(302, { Location: calendlyAuthUrl });
    res.end();
  } catch (e) {
    console.error('Redirect error:', e);
    res.status(500).send('Redirect error');
  }
} 