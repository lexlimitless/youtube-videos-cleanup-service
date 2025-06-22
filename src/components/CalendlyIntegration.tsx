import React, { useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import CalendlyHelpGuide from './CalendlyHelpGuide';

interface IntegrationRow {
  provider: string;
  is_connected: boolean;
}

// Helper function to generate a random string for the code verifier
const generateRandomString = (length: number): string => {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
};

// Helper function to generate the code challenge from the code verifier
const generateCodeChallenge = async (verifier: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await window.crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode(...new Uint8Array(digest)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
};

interface CalendlyIntegrationProps {
  isConnected: boolean;
  onConnectionChange: () => void;
}

export default function CalendlyIntegration({ isConnected, onConnectionChange }: CalendlyIntegrationProps) {
  const [loading, setLoading] = useState(false);
  const [showHelpGuide, setShowHelpGuide] = useState(false);
  const { getToken } = useAuth();

  const handleConnect = async () => {
    setLoading(true);
    try {
      const clientId = import.meta.env.VITE_CALENDLY_CLIENT_ID;

      if (!clientId) {
        alert('The Calendly Client ID is not configured correctly. Please check the environment variables.');
        setLoading(false);
        return;
      }

      const codeVerifier = generateRandomString(128);
      const codeChallenge = await generateCodeChallenge(codeVerifier);
      
      sessionStorage.setItem('calendly_code_verifier', codeVerifier);
      
      const redirectUri = `${window.location.origin}/integrations/calendly-callback`;
      
      const authUrl = `https://auth.calendly.com/oauth/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&code_challenge=${codeChallenge}&code_challenge_method=S256`;
      
      window.location.href = authUrl;
    } catch (error) {
      console.error('Failed to start Calendly connection:', error);
      alert('Could not initiate connection with Calendly. Please try again.');
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) {
        throw new Error('User not authenticated');
      }

      const response = await fetch('/api/user/integrations', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ provider: 'calendly' }),
      });

      if (!response.ok) {
        throw new Error('Failed to disconnect');
      }
      
      onConnectionChange(); // Notify parent component of change
    } catch (error) {
      alert('Failed to disconnect from Calendly. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {isConnected ? (
        <div className="flex items-center gap-4">
          <button
            className="bg-red-100 text-red-700 hover:bg-red-200 rounded-md px-4 py-2 font-semibold"
            onClick={handleDisconnect}
            disabled={loading}
          >
            {loading ? 'Disconnecting...' : 'Disconnect'}
          </button>
        </div>
      ) : (
        <button
          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-md px-4 py-2 font-semibold shadow-soft"
          onClick={handleConnect}
          disabled={loading}
        >
          {loading ? 'Redirecting...' : 'Connect Calendly'}
        </button>
      )}
    </div>
  );
} 