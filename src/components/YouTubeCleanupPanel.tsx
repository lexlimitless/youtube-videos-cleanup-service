import React, { useState } from 'react';
import { useAuth } from '@clerk/clerk-react';

interface CleanupOptions {
  removeUnreferenced: boolean;
  maxAgeDays: number;
  staleFetchDays: number;
  inactiveUserDays: number;
  removeDisconnected: boolean;
  dryRun: boolean;
  targetUserId: string;
}

interface CleanupResult {
  success: boolean;
  dryRun: boolean;
  summary: {
    totalVideosBefore: number;
    totalVideosAfter: number;
    videosDeleted: number;
    usersProcessed: number;
  };
  details: {
    unreferencedVideos: number;
    oldVideos: number;
    staleVideos: number;
    disconnectedVideos: number;
    inactiveUserVideos: number;
  };
  errors: string[];
  timestamp: string;
}

const YouTubeCleanupPanel: React.FC = () => {
  const { getToken } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<CleanupResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [options, setOptions] = useState<CleanupOptions>({
    removeUnreferenced: true,
    maxAgeDays: 90,
    staleFetchDays: 30,
    inactiveUserDays: 180,
    removeDisconnected: true,
    dryRun: true,
    targetUserId: ''
  });

  const handleOptionChange = (key: keyof CleanupOptions, value: any) => {
    setOptions(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleCleanup = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const token = await getToken();
      
      const response = await fetch('/api/admin/cleanup-youtube-videos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...options,
          targetUserId: options.targetUserId || null
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Cleanup failed');
      }

      setResult(data.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        YouTube Videos Cleanup
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Priority cleanup */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">Priority Cleanup</h3>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="removeUnreferenced"
              checked={options.removeUnreferenced}
              onChange={(e) => handleOptionChange('removeUnreferenced', e.target.checked)}
              className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
            />
            <label htmlFor="removeUnreferenced" className="ml-2 block text-sm text-gray-700">
              <span className="font-semibold text-red-600">PRIORITY:</span> Remove videos not referenced by any trackable links
            </label>
          </div>
          
          <div className="text-xs text-gray-500 bg-yellow-50 p-2 rounded">
            This will remove videos that are not linked to any trackable links in the system. 
            These videos take up storage space without serving any purpose.
          </div>
        </div>

        {/* Age-based cleanup */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">Cleanup Settings</h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Remove videos older than (days)
            </label>
            <input
              type="number"
              min="0"
              value={options.maxAgeDays}
              onChange={(e) => handleOptionChange('maxAgeDays', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Remove stale videos (not fetched in days)
            </label>
            <input
              type="number"
              min="0"
              value={options.staleFetchDays}
              onChange={(e) => handleOptionChange('staleFetchDays', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Remove from inactive users (days)
            </label>
            <input
              type="number"
              min="0"
              value={options.inactiveUserDays}
              onChange={(e) => handleOptionChange('inactiveUserDays', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Additional options */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">Additional Options</h3>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="removeDisconnected"
              checked={options.removeDisconnected}
              onChange={(e) => handleOptionChange('removeDisconnected', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="removeDisconnected" className="ml-2 block text-sm text-gray-700">
              Remove videos from disconnected integrations
            </label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="dryRun"
              checked={options.dryRun}
              onChange={(e) => handleOptionChange('dryRun', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="dryRun" className="ml-2 block text-sm text-gray-700">
              Dry run (simulate cleanup without deleting)
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Target User ID (optional)
            </label>
            <input
              type="text"
              value={options.targetUserId}
              onChange={(e) => handleOptionChange('targetUserId', e.target.value)}
              placeholder="Leave empty for all users"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={handleCleanup}
          disabled={isLoading}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Running Cleanup...' : 'Run Cleanup'}
        </button>
        
        <button
          onClick={() => {
            setOptions(prev => ({ ...prev, dryRun: true }));
            handleCleanup();
          }}
          disabled={isLoading}
          className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Running...' : 'Dry Run'}
        </button>
      </div>

      {/* Error display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
            </div>
          </div>
        </div>
      )}

      {/* Results display */}
      {result && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">
            Cleanup Results {result.dryRun && '(Dry Run)'}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-md">
              <div className="text-2xl font-bold text-blue-600">
                {formatNumber(result.summary.totalVideosBefore)}
              </div>
              <div className="text-sm text-blue-700">Videos Before</div>
            </div>
            
            <div className="bg-green-50 p-4 rounded-md">
              <div className="text-2xl font-bold text-green-600">
                {formatNumber(result.summary.totalVideosAfter)}
              </div>
              <div className="text-sm text-green-700">Videos After</div>
            </div>
            
            <div className="bg-red-50 p-4 rounded-md">
              <div className="text-2xl font-bold text-red-600">
                {formatNumber(result.summary.videosDeleted)}
              </div>
              <div className="text-sm text-red-700">Videos {result.dryRun ? 'Would Be' : ''} Deleted</div>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-md">
              <div className="text-2xl font-bold text-purple-600">
                {formatNumber(result.summary.usersProcessed)}
              </div>
              <div className="text-sm text-purple-700">Users Processed</div>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-md">
            <h4 className="font-medium text-gray-800 mb-2">Deletion Breakdown</h4>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
            <div>
              <span className="font-medium text-red-600">Unreferenced:</span> {formatNumber(result.details.unreferencedVideos)}
            </div>
            <div>
              <span className="font-medium">Old Videos:</span> {formatNumber(result.details.oldVideos)}
            </div>
            <div>
              <span className="font-medium">Stale Videos:</span> {formatNumber(result.details.staleVideos)}
            </div>
            <div>
              <span className="font-medium">Disconnected:</span> {formatNumber(result.details.disconnectedVideos)}
            </div>
            <div>
              <span className="font-medium">Inactive Users:</span> {formatNumber(result.details.inactiveUserVideos)}
            </div>
          </div>
          </div>

          {result.errors.length > 0 && (
            <div className="bg-yellow-50 p-4 rounded-md">
              <h4 className="font-medium text-yellow-800 mb-2">Warnings</h4>
              <ul className="text-sm text-yellow-700 space-y-1">
                {result.errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="text-xs text-gray-500">
            Completed at: {formatDate(result.timestamp)}
          </div>
        </div>
      )}
    </div>
  );
};

export default YouTubeCleanupPanel; 