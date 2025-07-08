import React, { useState } from 'react';
import { useAuth } from '@clerk/clerk-react';

function generateRandomState(length = 32) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

interface YouTubeIntegrationProps {
  isConnected: boolean;
  onConnectionChange: () => void;
}

export default function YouTubeIntegration({ isConnected, onConnectionChange }: YouTubeIntegrationProps) {
  const [loading, setLoading] = useState(false);
  const { getToken, userId } = useAuth();

  const handleConnect = async () => {
    setLoading(true);
    try {
      const clientId = import.meta.env.VITE_YOUTUBE_CLIENT_ID;

      if (!clientId) {
        alert('The YouTube Client ID is not configured correctly. Please check the environment variables.');
        setLoading(false);
        return;
      }

      const redirectUri = `${window.location.origin}/api/youtube/callback`;
      const state = generateRandomState();
      // Store the state and userId in sessionStorage for retrieval after callback
      sessionStorage.setItem('youtube_oauth_state', state);
      sessionStorage.setItem('youtube_oauth_user_id', userId || '');

      // YouTube OAuth 2.0 authorization URL
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `response_type=code&` +
        `client_id=${clientId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `scope=${encodeURIComponent('https://www.googleapis.com/auth/youtube.readonly')}&` +
        `access_type=offline&` +
        `prompt=consent&` +
        `state=${state}`;
      
      window.location.href = authUrl;
    } catch (error) {
      console.error('Failed to start YouTube connection:', error);
      alert('Could not initiate connection with YouTube. Please try again.');
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
        body: JSON.stringify({ provider: 'youtube' }),
      });

      if (!response.ok) {
        throw new Error('Failed to disconnect');
      }
      
      onConnectionChange(); // Notify parent component of change
    } catch (error) {
      alert('Failed to disconnect from YouTube. Please try again.');
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
          className="bg-red-600 hover:bg-red-700 text-white rounded-md px-4 py-2 font-semibold shadow-soft"
          onClick={handleConnect}
          disabled={loading}
        >
          {loading ? 'Redirecting...' : 'Connect YouTube Channel'}
        </button>
      )}
    </div>
  );
} 