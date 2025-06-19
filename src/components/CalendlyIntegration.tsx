import React, { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';

interface IntegrationRow {
  provider: string;
  is_connected: boolean;
}

export default function CalendlyIntegration() {
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const { userId } = useAuth();

  useEffect(() => {
    async function checkIntegrationStatus() {
      if (!userId) {
        return;
      }
      
      try {
        const response = await fetch('/api/user/integrations');
        const result = await response.json();
        if (response.ok && Array.isArray(result.data)) {
          const calendly = result.data.find(
            (row: IntegrationRow) => row.provider === 'calendly' && row.is_connected
          );
          setIsConnected(!!calendly);
        } else {
          setIsConnected(false);
        }
      } catch (err) {
        setIsConnected(false);
      }
    }

    // Check status when component mounts or userId changes
    checkIntegrationStatus();
  }, [userId]);

  const handleConnect = () => {
    setLoading(true);
    const stateObj = {
      user_id: userId,
      nonce: Math.random().toString(36).substring(2)
    };
    const state = btoa(JSON.stringify(stateObj));
    window.location.href = `/api/oauth/calendly/start?state=${state}`;
  };

  const handleDisconnect = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/user/integrations', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ provider: 'calendly' }),
      });

      if (!response.ok) {
        throw new Error('Failed to disconnect');
      }

      setIsConnected(false);
    } catch (error) {
      alert('Failed to disconnect from Calendly. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 border rounded-lg shadow-sm">
      <h2 className="text-lg font-semibold mb-2">Calendly Integration</h2>
      {isConnected ? (
        <div>
          <div className="flex items-center text-green-600 mb-4">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
            <span>Connected</span>
          </div>
          <button
            className="bg-red-600 hover:bg-red-700 text-white rounded-md px-4 py-2 font-semibold shadow-soft"
            onClick={handleDisconnect}
            disabled={loading}
          >
            {loading ? 'Disconnecting...' : 'Disconnect Calendly'}
          </button>
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