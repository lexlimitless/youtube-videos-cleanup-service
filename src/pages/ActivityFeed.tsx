import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { formatDistanceToNow } from 'date-fns';

type ActivityEvent = {
  event_type: 'Click' | 'Call' | 'Sale';
  link_title: string;
  destination_url: string;
  details: string;
  timestamp: string;
};

const ActivityFeed = () => {
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const { getToken } = useAuth();

  const fetchActivities = useCallback(async (newPage: number, currentFilter: string) => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      const token = await getToken();
      const response = await fetch(`/api/user/activity-feed?filter=${currentFilter}&page=${newPage}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch activities');
      }

      const { data } = await response.json();
      
      setActivities(prev => newPage === 1 ? data : [...prev, ...data]);
      setHasMore(data.length > 0);
      setPage(newPage);

    } catch (error) {
      console.error(error);
      // Here you could set an error state and display a message to the user
    } finally {
      setIsLoading(false);
    }
  }, [getToken, isLoading]);

  useEffect(() => {
    fetchActivities(1, filter);
  }, [filter]); // Re-fetch when filter changes

  const handleFilterChange = (newFilter: string) => {
    setActivities([]); // Clear activities before fetching new filtered data
    setPage(1);
    setHasMore(true);
    setFilter(newFilter);
  };

  const loadMore = () => {
    if (!isLoading && hasMore) {
      fetchActivities(page + 1, filter);
    }
  };

  const filters = [
    { key: 'all', label: 'All Events' },
    { key: 'clicks', label: 'Clicks Only' },
    { key: 'calls', label: 'Calls Only' },
    { key: 'sales', label: 'Sales Only' },
  ];

  return (
    <div className="flex flex-col w-full max-w-full px-0 bg-gray-50 font-sans min-h-screen">
      <h1 className="text-2xl font-semibold text-gray-900 mb-4">Activity Feed</h1>
      <p className="text-gray-600 mb-6">A unified log of all interactions across your links.</p>

      <div className="bg-white rounded-lg shadow-md">
        <div className="p-4 border-b border-gray-200">
          <div className="flex space-x-1">
            {filters.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => handleFilterChange(key)}
                className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${
                  filter === key
                    ? 'bg-emerald-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Event</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {activities.map((activity, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center bg-gray-100 rounded-full">
                        {activity.event_type === 'Click' && '🖱️'}
                        {activity.event_type === 'Call' && '📞'}
                        {activity.event_type === 'Sale' && '💰'}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{activity.event_type}</div>
                        <div className="text-sm text-gray-500">{activity.link_title}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-normal text-sm text-gray-800 break-words">{activity.details}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {isLoading && <p className="text-center p-4">Loading...</p>}

        {!isLoading && activities.length === 0 && (
          <p className="text-center p-8 text-gray-500">No activities found for this filter.</p>
        )}

        {hasMore && !isLoading && (
          <div className="p-4 border-t border-gray-200 text-center">
            <button
              onClick={loadMore}
              className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700"
            >
              Load More
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityFeed; 