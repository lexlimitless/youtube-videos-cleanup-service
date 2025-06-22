import React, { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import CalendlyIntegration from '../components/CalendlyIntegration';
import CalendlyHelpGuide from '../components/CalendlyHelpGuide';

const integrations = [
  {
    name: 'Calendly',
    key: 'calendly',
    description: 'Track calls booked via Calendly and attribute them to your links.',
    icon: '/integrations/calendly.svg',
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
  const [isLoading, setIsLoading] = useState(true);
  const { getToken } = useAuth();
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [diagnosticResult, setDiagnosticResult] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteResult, setDeleteResult] = useState('');

  const checkCalendlyStatus = async () => {
    setIsLoading(true);
    try {
      const token = await getToken();
      if (!token) {
        // Handle case where user is not authenticated
        setIsLoading(false);
        setCalendlyConnected(false);
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
        setCalendlyConnected(!!calendly);
      } else {
        setCalendlyConnected(false);
      }
    } catch (err) {
      setCalendlyConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunDiagnostic = async () => {
    setIsDiagnosing(true);
    setDiagnosticResult('Running diagnostics... Please check the Vercel logs for detailed output.');

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
        setDiagnosticResult('Diagnostic complete! See the Vercel logs for the full report. A summary is also available in your browser\'s console.');
        console.log('--- Calendly Diagnostic Summary ---', data.subscriptions);
      } else {
        setDiagnosticResult(`Error running diagnostic: ${data.error || 'Unknown error'}`);
        console.error('Diagnostic failed:', data);
      }
    } catch (error) {
      if (error instanceof Error) {
        setDiagnosticResult(`An unexpected error occurred: ${error.message}`);
      } else {
        setDiagnosticResult('An unexpected error occurred.');
      }
      console.error('Unexpected diagnostic error:', error);
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

  useEffect(() => {
    checkCalendlyStatus();
  }, []);

  const filtered = integrations.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col w-full max-w-full px-0 bg-gray-50 font-sans min-h-screen">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Integrations</h1>
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

            {integration.status === 'coming' && (
              <span className="absolute top-4 right-4 bg-gray-100 text-gray-400 text-xs font-bold px-3 py-1 rounded-full">Coming Soon</span>
            )}

            {integration.key === 'calendly' && (
              <div className="w-full mt-auto pt-4">
                <CalendlyIntegration isConnected={calendlyConnected} onConnectionChange={checkCalendlyStatus} />
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
          <div className="mt-4 p-4 bg-gray-100 rounded">
            <p className="text-sm text-gray-700">{diagnosticResult}</p>
          </div>
        )}
        {deleteResult && (
          <div className="mt-4 p-4 bg-red-100 border border-red-200 rounded">
            <p className="text-sm text-red-700">{deleteResult}</p>
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