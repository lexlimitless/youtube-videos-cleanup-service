import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';

export default function CalendlyCallback() {
  const [error, setError] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { getToken } = useAuth();

  useEffect(() => {
    const exchangeCodeForToken = async () => {
      const params = new URLSearchParams(location.search);
      const code = params.get('code');

      if (!code) {
        setError('Authorization code not found in URL.');
        return;
      }

      const codeVerifier = sessionStorage.getItem('calendly_code_verifier');
      if (!codeVerifier) {
        setError('Code verifier not found in session storage. Please try connecting again.');
        return;
      }

      try {
        // Exchange authorization code for access token
        const tokenResponse = await fetch('https://auth.calendly.com/oauth/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            grant_type: 'authorization_code',
            client_id: import.meta.env.VITE_CALENDLY_CLIENT_ID,
            code: code,
            redirect_uri: `${window.location.origin}/integrations/calendly-callback`,
            code_verifier: codeVerifier,
          }),
        });

        if (!tokenResponse.ok) {
            const errorBody = await tokenResponse.json();
            throw new Error(errorBody.error_description || 'Failed to fetch access token from Calendly');
        }

        const tokenData = await tokenResponse.json();
        const accessToken = tokenData.access_token;
        
        // Get Clerk token to authenticate with our backend
        const clerkToken = await getToken();

        // Send the access token to our backend to complete the integration
        const backendResponse = await fetch('/api/user/integrations/connect', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${clerkToken}`,
            },
            body: JSON.stringify({
                provider: 'calendly',
                accessToken: accessToken,
            }),
        });

        if (!backendResponse.ok) {
            throw new Error('Failed to save integration details to the backend.');
        }

        // Clean up and redirect
        sessionStorage.removeItem('calendly_code_verifier');
        navigate('/integrations');

      } catch (err: any) {
        setError(err.message);
        console.error('Error during token exchange or backend update:', err);
      }
    };

    exchangeCodeForToken();
  }, [location, navigate, getToken]);

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      {error ? (
        <div className="text-red-500 text-center">
          <h2 className="text-xl font-bold mb-2">Error Connecting to Calendly</h2>
          <p>{error}</p>
          <button onClick={() => navigate('/integrations')} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            Return to Integrations
          </button>
        </div>
      ) : (
        <div className="text-center">
          <h2 className="text-xl font-semibold">Connecting to Calendly...</h2>
          <p className="mt-2">Please wait while we securely set up your integration.</p>
        </div>
      )}
    </div>
  );
} 