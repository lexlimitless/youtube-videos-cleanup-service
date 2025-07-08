import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';

export default function IntegrationsYouTubeCallback() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const { getToken } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const code = params.get('code');
    const state = params.get('state');
    const storedState = sessionStorage.getItem('youtube_oauth_state');
    const userId = sessionStorage.getItem('youtube_oauth_user_id');

    if (!code || !state) {
      setStatus('error');
      setMessage('Missing code or state in callback URL.');
      setTimeout(() => navigate('/integrations?error=youtube_callback_missing_params'), 2000);
      return;
    }
    if (!storedState || state !== storedState) {
      setStatus('error');
      setMessage('State mismatch. Please try connecting again.');
      setTimeout(() => navigate('/integrations?error=youtube_callback_state_mismatch'), 2000);
      return;
    }
    if (!userId) {
      setStatus('error');
      setMessage('User session not found. Please try connecting again.');
      setTimeout(() => navigate('/integrations?error=youtube_callback_no_user'), 2000);
      return;
    }

    // POST code, state, and userId to backend
    const finishConnection = async () => {
      try {
        const clerkToken = await getToken();
        const response = await fetch('/api/user/youtube/connect', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${clerkToken}`,
          },
          body: JSON.stringify({ code, state, userId }),
        });
        const data = await response.json();
        if (response.ok) {
          setStatus('success');
          setMessage('YouTube channel connected! Redirecting...');
          setTimeout(() => navigate('/integrations?success=youtube_connected&channel=' + encodeURIComponent(data.channel_title || '')), 2000);
        } else {
          setStatus('error');
          setMessage(data.error || 'Failed to connect YouTube channel.');
          setTimeout(() => navigate('/integrations?error=youtube_callback_backend_error'), 2000);
        }
      } catch (err) {
        setStatus('error');
        setMessage('Unexpected error. Please try again.');
        setTimeout(() => navigate('/integrations?error=youtube_callback_unexpected'), 2000);
      }
    };
    finishConnection();
  }, [location, navigate, getToken]);

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      {status === 'loading' && (
        <div className="text-center">
          <h2 className="text-xl font-semibold">Finalizing YouTube Connection...</h2>
          <p className="mt-2">Please wait while we securely set up your integration.</p>
        </div>
      )}
      {status === 'success' && (
        <div className="text-green-600 text-center p-4">
          <h2 className="text-xl font-bold mb-2">YouTube Connected!</h2>
          <p>{message}</p>
        </div>
      )}
      {status === 'error' && (
        <div className="text-red-500 text-center p-4">
          <h2 className="text-xl font-bold mb-2">Error Connecting to YouTube</h2>
          <p>{message}</p>
        </div>
      )}
    </div>
  );
} 