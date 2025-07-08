import React, { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import CalendlyIntegration from '../components/CalendlyIntegration';
import CalendlyHelpGuide from '../components/CalendlyHelpGuide';
import YouTubeIntegration from '../components/YouTubeIntegration';

const integrations = [
  {
    name: 'Calendly',
    key: 'calendly',
    description: 'Track calls booked via Calendly and attribute them to your links.',
    icon: '/integrations/calendly.svg',
    status: 'dynamic', // will be replaced with real status
  },
  {
    name: 'YouTube',
    key: 'youtube',
    description: 'Track video views and engagement from your YouTube channel.',
    icon: '/integrations/youtube.svg',
    status: 'dynamic', // will be replaced with real status
  },
  {
    name: 'Stripe',
    key: 'stripe',
    description: 'Track sales and payments via Stripe.',
    icon: '/integrations/stripe.svg',
    status: 'coming',
  },
  {
    name: 'Zapier',
    key: 'zapier',
    description: 'Automate workflows and connect with 1000+ apps.',
    icon: '/integrations/zapier.svg',
    status: 'coming',
  },
  {
    name: 'Google Calendar',
    key: 'google-calendar',
    description: 'Sync events and prevent double-booking.',
    icon: '/integrations/google-calendar.svg',
    status: 'coming',
  },
  {
    name: 'Zoom',
    key: 'zoom',
    description: 'Include Zoom details in your events.',
    icon: '/integrations/zoom.svg',
    status: 'coming',
  },
  {
    name: 'PayPal',
    key: 'paypal',
    description: 'Collect payment before the meeting.',
    icon: '/integrations/paypal.svg',
    status: 'coming',
  },
  {
    name: 'Slack',
    key: 'slack',
    description: 'Share your links in Slack.',
    icon: '/integrations/slack.svg',
    status: 'coming',
  },
  // Add more as needed
];

export default function Integrations() {
  const [search, setSearch] = useState('');
  const [calendlyConnected, setCalendlyConnected] = useState(false);
  const [youtubeConnected, setYoutubeConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { getToken } = useAuth();
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [diagnosticResult, setDiagnosticResult] = useState<string | null>(null);
  const [diagnosticCallbackUrl, setDiagnosticCallbackUrl] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteResult, setDeleteResult] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDiagnosingYouTube, setIsDiagnosingYouTube] = useState(false);
  const [youtubeDiagnosticResult, setYoutubeDiagnosticResult] = useState<any>(null);
  const [isDeletingYouTube, setIsDeletingYouTube] = useState(false);
  const [youtubeDeleteResult, setYoutubeDeleteResult] = useState('');

  const checkIntegrationStatus = async () => {
    setIsLoading(true);
    try {
      const token = await getToken();
      if (!token) {
        // Handle case where user is not authenticated
        setIsLoading(false);
        setCalendlyConnected(false);
        setYoutubeConnected(false);
        return;
      }

      const response = await fetch('/api/user/integrations', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const result = await response.json();
      if (response.ok && Array.isArray(result.data)) {
        const calendly = result.data.find(
          (row: any) => row.provider === 'calendly' && row.is_connected
        );
        const youtube = result.data.find(
          (row: any) => row.provider === 'youtube' && row.is_connected
        );
        setCalendlyConnected(!!calendly);
        setYoutubeConnected(!!youtube);
      } else {
        setCalendlyConnected(false);
        setYoutubeConnected(false);
      }
    } catch (err) {
      setCalendlyConnected(false);
      setYoutubeConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunDiagnostic = async () => {
    setIsDiagnosing(true);
    setDiagnosticResult(null);
    setDiagnosticCallbackUrl(null);

    try {
      const token = await getToken();
      const response = await fetch('/api/user/diagnose-calendly', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        let resultText = `Check complete. Found ${data.calendly_subscriptions.length} webhook(s) on Calendly.`;
        resultText += `\n\nDB says our webhook ID is: ${data.local_webhook_id || 'Not Found'}`;
        
        const ourWebhook = data.calendly_subscriptions.find((sub: any) => data.local_webhook_id && sub.uri.includes(data.local_webhook_id));
        
        if (ourWebhook) {
          resultText += `\n\nFound our webhook on Calendly: ${ourWebhook.uri}`;
          resultText += `\nState: ${ourWebhook.state}`;
          setDiagnosticCallbackUrl(ourWebhook.callback_url);
        } else {
          resultText += `\n\nOur webhook was NOT found on Calendly. Please try disconnecting and reconnecting.`;
        }

        setDiagnosticResult(resultText);
      } else {
        setDiagnosticResult(`Error running diagnostic: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      if (error instanceof Error) {
        setDiagnosticResult(`An unexpected error occurred: ${error.message}`);
      } else {
        setDiagnosticResult('An unexpected error occurred.');
      }
    } finally {
      setIsDiagnosing(false);
    }
  };

  const handleForceDelete = async () => {
    if (!window.confirm('Are you sure you want to delete ALL Calendly webhook subscriptions for your organization? This action cannot be undone and may affect other users if the webhook is shared.')) {
      return;
    }

    setIsDeleting(true);
    setDeleteResult('Attempting to delete all webhooks...');

    try {
      const token = await getToken();
      const response = await fetch('/api/user/diagnose-calendly', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      setDeleteResult(data.message || data.error || 'An unknown error occurred.');
    } catch (error) {
      if (error instanceof Error) {
        setDeleteResult(`An unexpected error occurred: ${error.message}`);
      } else {
        setDeleteResult('An unexpected error occurred.');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRunYouTubeDiagnostic = async () => {
    setIsDiagnosingYouTube(true);
    setYoutubeDiagnosticResult(null);

    try {
      const token = await getToken();
      const response = await fetch('/api/user/diagnose-youtube', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        setYoutubeDiagnosticResult(data);
      } else {
        setYoutubeDiagnosticResult({ error: data.error || 'Unknown error', status: data.status });
      }
    } catch (error) {
      if (error instanceof Error) {
        setYoutubeDiagnosticResult({ error: `An unexpected error occurred: ${error.message}`, status: 'error' });
      } else {
        setYoutubeDiagnosticResult({ error: 'An unexpected error occurred.', status: 'error' });
      }
    } finally {
      setIsDiagnosingYouTube(false);
    }
  };

  const handleForceDeleteYouTube = async () => {
    if (!window.confirm('Are you sure you want to force disconnect your YouTube integration? This action cannot be undone and will remove all YouTube data.')) {
      return;
    }

    setIsDeletingYouTube(true);
    setYoutubeDeleteResult('Attempting to force disconnect YouTube...');

    try {
      const token = await getToken();
      const response = await fetch('/api/user/diagnose-youtube', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      setYoutubeDeleteResult(data.message || data.error || 'An unknown error occurred.');
      
      if (response.ok) {
        // Refresh integration status after successful deletion
        checkIntegrationStatus();
      }
    } catch (error) {
      if (error instanceof Error) {
        setYoutubeDeleteResult(`An unexpected error occurred: ${error.message}`);
      } else {
        setYoutubeDeleteResult('An unexpected error occurred.');
      }
    } finally {
      setIsDeletingYouTube(false);
    }
  };

  useEffect(() => {
    checkIntegrationStatus();
    
    // Handle URL parameters for success/error messages
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const error = urlParams.get('error');
    const message = urlParams.get('message');
    const channel = urlParams.get('channel');
    
    if (success === 'youtube_connected' && channel) {
      setSuccessMessage(`Successfully connected to YouTube channel: ${channel}`);
      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (error) {
      let errorMsg = 'An error occurred during integration.';
      if (error === 'youtube_oauth_error' && message) {
        errorMsg = `YouTube OAuth error: ${message}`;
      } else if (error === 'youtube_no_code') {
        errorMsg = 'No authorization code received from YouTube.';
      } else if (error === 'youtube_token_exchange_failed') {
        errorMsg = 'Failed to exchange authorization code for access token.';
      } else if (error === 'youtube_no_access_token') {
        errorMsg = 'No access token received from YouTube.';
      } else if (error === 'youtube_channel_fetch_failed') {
        errorMsg = 'Failed to fetch YouTube channel information.';
      } else if (error === 'youtube_no_channels') {
        errorMsg = 'No YouTube channels found for this account.';
      } else if (error === 'youtube_database_error') {
        errorMsg = 'Failed to save YouTube integration to database.';
      } else if (error === 'youtube_unexpected_error') {
        errorMsg = 'An unexpected error occurred during YouTube integration.';
      }
      setErrorMessage(errorMsg);
      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const filtered = integrations.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col w-full max-w-full px-0 bg-gray-50 font-sans min-h-screen">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Integrations</h1>
      
      {/* Success/Error Messages */}
      {successMessage && (
        <div className="mb-6 p-4 bg-green-100 border border-green-200 rounded-lg">
          <div className="flex items-center justify-between">
            <p className="text-green-700">{successMessage}</p>
            <button
              onClick={() => setSuccessMessage(null)}
              className="text-green-500 hover:text-green-700"
            >
              ×
            </button>
          </div>
        </div>
      )}
      
      {errorMessage && (
        <div className="mb-6 p-4 bg-red-100 border border-red-200 rounded-lg">
          <div className="flex items-center justify-between">
            <p className="text-red-700">{errorMessage}</p>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-red-500 hover:text-red-700"
            >
              ×
            </button>
          </div>
        </div>
      )}
      <div className="flex items-center gap-4 mb-8">
        <input
          type="text"
          placeholder="Find integrations, apps, and more"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="px-4 py-2 rounded-md border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100 text-sm w-96 shadow-soft"
        />
        <select className="px-3 py-2 rounded-md border border-gray-200 bg-white text-sm shadow-soft">
          <option>Most popular</option>
          <option>Connected</option>
          <option>Coming soon</option>
        </select>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {filtered.map(integration => (
          <div
            key={integration.key}
            className="bg-white rounded-xl shadow-soft p-5 flex flex-col items-start gap-3 min-h-[160px] relative border border-gray-100 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center gap-3 mb-2">
              <img src={integration.icon} alt={integration.name} className="w-8 h-8" />
              <span className="text-lg font-semibold text-gray-900">{integration.name}</span>
            </div>
            <span className="text-gray-600 text-sm mb-2">{integration.description}</span>
            
            {integration.key === 'calendly' && !isLoading && (
                calendlyConnected ? (
                  <span className="absolute top-4 right-4 bg-emerald-100 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full">Connected</span>
                ) : (
                  <span className="absolute top-4 right-4 bg-gray-100 text-gray-500 text-xs font-bold px-3 py-1 rounded-full">Not Connected</span>
                )
            )}
            {integration.key === 'youtube' && !isLoading && (
                youtubeConnected ? (
                  <span className="absolute top-4 right-4 bg-emerald-100 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full">Connected</span>
                ) : (
                  <span className="absolute top-4 right-4 bg-gray-100 text-gray-500 text-xs font-bold px-3 py-1 rounded-full">Not Connected</span>
                )
            )}

            {integration.status === 'coming' && (
              <span className="absolute top-4 right-4 bg-gray-100 text-gray-400 text-xs font-bold px-3 py-1 rounded-full">Coming Soon</span>
            )}

            {integration.key === 'calendly' && (
              <div className="w-full mt-auto pt-4">
                <CalendlyIntegration isConnected={calendlyConnected} onConnectionChange={checkIntegrationStatus} />
              </div>
            )}
            {integration.key === 'youtube' && (
              <div className="w-full mt-auto pt-4">
                <YouTubeIntegration isConnected={youtubeConnected} onConnectionChange={checkIntegrationStatus} />
              </div>
            )}
          </div>
        ))}
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-xl font-semibold text-gray-700 mb-2">Calendly Diagnostic Tool</h2>
        <p className="text-gray-600 mb-4">
          If you're having trouble with Calendly tracking, use these tools to inspect and manage your webhook subscriptions.
        </p>
        <div className="flex space-x-4">
          <button
            onClick={handleRunDiagnostic}
            disabled={isDiagnosing}
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded disabled:bg-gray-400"
          >
            {isDiagnosing ? 'Running...' : 'Check Webhooks'}
          </button>
          <button
            onClick={handleForceDelete}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded disabled:bg-gray-400"
          >
            {isDeleting ? 'Deleting...' : 'Force Delete All Webhooks'}
          </button>
        </div>
        {diagnosticResult && (
          <div className="mt-4 p-4 bg-gray-100 rounded space-y-2">
            <pre className="text-sm text-gray-700 whitespace-pre-wrap">{diagnosticResult}</pre>
            {diagnosticCallbackUrl && (
              <div>
                <p className="text-sm font-semibold text-gray-800">Callback URL on Calendly:</p>
                <code className="block bg-gray-200 p-2 rounded text-xs text-black break-all">
                  {diagnosticCallbackUrl}
                </code>
              </div>
            )}
          </div>
        )}
        {deleteResult && (
          <div className="mt-4 p-4 bg-red-100 border border-red-200 rounded">
            <p className="text-sm text-red-700">{deleteResult}</p>
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-xl font-semibold text-gray-700 mb-2">YouTube Diagnostic Tool</h2>
        <p className="text-gray-600 mb-4">
          If you're having trouble with YouTube integration, use these tools to inspect and manage your connection.
        </p>
        <div className="flex space-x-4">
          <button
            onClick={handleRunYouTubeDiagnostic}
            disabled={isDiagnosingYouTube}
            className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded disabled:bg-gray-400"
          >
            {isDiagnosingYouTube ? 'Running...' : 'Check Connection'}
          </button>
          <button
            onClick={handleForceDeleteYouTube}
            disabled={isDeletingYouTube}
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded disabled:bg-gray-400"
          >
            {isDeletingYouTube ? 'Disconnecting...' : 'Force Disconnect'}
          </button>
        </div>
        {youtubeDiagnosticResult && (
          <div className="mt-4 p-4 bg-gray-100 rounded space-y-4">
            {youtubeDiagnosticResult.error ? (
              <div className="text-red-700">
                <h3 className="font-semibold">Error:</h3>
                <p>{youtubeDiagnosticResult.error}</p>
                {youtubeDiagnosticResult.status && (
                  <p className="text-sm mt-2">Status: {youtubeDiagnosticResult.status}</p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-800">Status: {youtubeDiagnosticResult.status}</h3>
                  <p className="text-gray-600">{youtubeDiagnosticResult.message}</p>
                </div>
                
                {youtubeDiagnosticResult.integration && (
                  <div>
                    <h4 className="font-semibold text-gray-700">Integration Details:</h4>
                    <div className="bg-white p-3 rounded border text-sm">
                      <p><strong>Connected:</strong> {youtubeDiagnosticResult.integration.is_connected ? 'Yes' : 'No'}</p>
                      <p><strong>Channel ID:</strong> {youtubeDiagnosticResult.integration.provider_channel_id || 'Not set'}</p>
                      <p><strong>Channel Title:</strong> {youtubeDiagnosticResult.integration.provider_channel_title || 'Not set'}</p>
                      <p><strong>Token Expires:</strong> {youtubeDiagnosticResult.integration.provider_token_expires_at ? new Date(youtubeDiagnosticResult.integration.provider_token_expires_at).toLocaleString() : 'Not set'}</p>
                    </div>
                  </div>
                )}

                {youtubeDiagnosticResult.youtube_data && (
                  <div>
                    <h4 className="font-semibold text-gray-700">YouTube Data:</h4>
                    <div className="bg-white p-3 rounded border text-sm">
                      <p><strong>Channel ID:</strong> {youtubeDiagnosticResult.youtube_data.channel_id}</p>
                      <p><strong>Channel Title:</strong> {youtubeDiagnosticResult.youtube_data.channel_title}</p>
                      <p><strong>Subscribers:</strong> {youtubeDiagnosticResult.youtube_data.subscriber_count || 'Hidden'}</p>
                      <p><strong>Videos:</strong> {youtubeDiagnosticResult.youtube_data.video_count || 'Hidden'}</p>
                      <p><strong>Total Views:</strong> {youtubeDiagnosticResult.youtube_data.view_count || 'Hidden'}</p>
                    </div>
                  </div>
                )}

                {youtubeDiagnosticResult.api_tests && (
                  <div>
                    <h4 className="font-semibold text-gray-700">API Tests:</h4>
                    <div className="bg-white p-3 rounded border text-sm">
                      <p><strong>Access Token:</strong> <span className={youtubeDiagnosticResult.api_tests.access_token_valid ? 'text-green-600' : 'text-red-600'}>
                        {youtubeDiagnosticResult.api_tests.access_token_valid ? '✓ Valid' : '✗ Invalid'}
                      </span></p>
                      <p><strong>Channel Info:</strong> <span className={youtubeDiagnosticResult.api_tests.channel_info_accessible ? 'text-green-600' : 'text-red-600'}>
                        {youtubeDiagnosticResult.api_tests.channel_info_accessible ? '✓ Accessible' : '✗ Not Accessible'}
                      </span></p>
                      <p><strong>Videos:</strong> <span className={youtubeDiagnosticResult.api_tests.videos_accessible ? 'text-green-600' : 'text-red-600'}>
                        {youtubeDiagnosticResult.api_tests.videos_accessible ? '✓ Accessible' : '✗ Not Accessible'}
                      </span> ({youtubeDiagnosticResult.api_tests.video_count} found)</p>
                    </div>
                  </div>
                )}

                {youtubeDiagnosticResult.data_consistency && (
                  <div>
                    <h4 className="font-semibold text-gray-700">Data Consistency:</h4>
                    <div className="bg-white p-3 rounded border text-sm">
                      <p><strong>Channel ID Match:</strong> <span className={youtubeDiagnosticResult.data_consistency.channel_id_matches ? 'text-green-600' : 'text-red-600'}>
                        {youtubeDiagnosticResult.data_consistency.channel_id_matches ? '✓ Match' : '✗ Mismatch'}
                      </span></p>
                      <p><strong>Local Channel ID:</strong> {youtubeDiagnosticResult.data_consistency.local_vs_youtube.local_channel_id || 'Not set'}</p>
                      <p><strong>YouTube Channel ID:</strong> {youtubeDiagnosticResult.data_consistency.local_vs_youtube.youtube_channel_id}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        {youtubeDeleteResult && (
          <div className="mt-4 p-4 bg-red-100 border border-red-200 rounded">
            <p className="text-sm text-red-700">{youtubeDeleteResult}</p>
          </div>
        )}
      </div>
      
      {calendlyConnected && (
        <div className="mt-8">
          <CalendlyHelpGuide />
        </div>
      )}
    </div>
  );
} 