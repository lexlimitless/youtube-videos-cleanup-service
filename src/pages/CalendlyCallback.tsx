import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';

export default function CalendlyCallback() {
  const [error, setError] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { getToken } = useAuth();

  useEffect(() => {
    const completeConnection = async () => {
      const params = new URLSearchParams(location.search);
      const code = params.get('code');

      if (!code) {
        setError('Authorization code not found in URL.');
        return;
      }

      const codeVerifier = sessionStorage.getItem('calendly_code_verifier');
      if (!codeVerifier) {
        setError('Security code verifier not found. Please try connecting again.');
        return;
      }

      try {
        const clerkToken = await getToken();

        // Send the authorization code and verifier to our secure backend
        const backendResponse = await fetch('/api/user/integrations/connect', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${clerkToken}`,
            },
            body: JSON.stringify({
                provider: 'calendly',
                code: code,
                codeVerifier: codeVerifier,
            }),
        });

        if (!backendResponse.ok) {
            const errorBody = await backendResponse.json();
            throw new Error(errorBody.error || 'Failed to complete connection with the backend.');
        }

        sessionStorage.removeItem('calendly_code_verifier');
        navigate('/integrations');

      } catch (err: any) {
        setError(err.message);
      }
    };

    completeConnection();
  }, [location, navigate, getToken]);

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      {error ? (
        <div className="text-red-500 text-center p-4">
          <h2 className="text-xl font-bold mb-2">Error Connecting to Calendly</h2>
          <p>{error}</p>
          <button onClick={() => navigate('/integrations')} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            Return to Integrations
          </button>
        </div>
      ) : (
        <div className="text-center">
          <h2 className="text-xl font-semibold">Finalizing Connection...</h2>
          <p className="mt-2">Please wait while we securely set up your integration.</p>
        </div>
      )}
    </div>
  );
} 