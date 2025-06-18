import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function CalendlyIntegration() {
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function checkWebhookStatus() {
      // This should check if the current user has a Calendly token stored
      const { data, error } = await supabase.from('user_integrations').select('provider, is_connected').eq('provider', 'calendly').single();
      setIsConnected(!!data?.is_connected);
    }
    checkWebhookStatus();
  }, []);

  const handleConnect = () => {
    setLoading(true);
    // Redirect to backend endpoint that starts the OAuth flow
    window.location.href = '/api/oauth/calendly/start';
  };

  return (
    <div className="p-4 border rounded-lg shadow-sm">
      <h2 className="text-lg font-semibold mb-2">Calendly Integration</h2>
      {isConnected ? (
        <div className="flex items-center text-green-600">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
          <span>Connected</span>
        </div>
      ) : (
        <div>
          <p className="text-gray-600 mb-2">
            To connect your Calendly account:
          </p>
          <ol className="list-decimal pl-5 mb-4">
            <li>Click the <strong>Connect Calendly</strong> button below.</li>
            <li>Authorize this app to access your Calendly account.</li>
            <li>After authorizing, you'll be redirected back and see a green "Connected" badge.</li>
            <li>Once connected, your bookings will be tracked and attributed to your links.</li>
          </ol>
          <button
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-md px-4 py-2 font-semibold shadow-soft"
            onClick={handleConnect}
            disabled={loading}
          >
            {loading ? 'Redirecting...' : 'Connect Calendly'}
          </button>
        </div>
      )}
    </div>
  );
} 