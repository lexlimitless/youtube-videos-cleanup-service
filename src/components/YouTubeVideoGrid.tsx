import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@clerk/clerk-react';
import YouTubeVideoCard from './YouTubeVideoCard';

interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string;
  published_at: string;
  view_count: number;
  like_count: number;
  comment_count: number;
  duration: string;
  channel_id: string;
  channel_title: string;
}

interface YouTubeVideoGridProps {
  onVideoSelect: (video: YouTubeVideo | null) => void;
  selectedVideo: YouTubeVideo | null;
}

export default function YouTubeVideoGrid({ onVideoSelect, selectedVideo }: YouTubeVideoGridProps) {
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState<number>(0);
  const { getToken } = useAuth();
  const observer = useRef<IntersectionObserver>();
  const loadingRef = useRef<HTMLDivElement>(null);

  const fetchVideos = useCallback(async (currentOffset?: number) => {
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      const token = await getToken();
      const params = new URLSearchParams({
        limit: '15',
        offset: (currentOffset ?? offset).toString(),
      });

      const response = await fetch(`/api/user/youtube/videos?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 400) {
          setError(data.message || 'YouTube integration not connected');
        } else {
          setError(data.message || 'Failed to fetch videos');
        }
        return;
      }

      if (currentOffset && currentOffset > 0) {
        setVideos(prev => [...prev, ...data.videos]);
      } else {
        setVideos(data.videos);
      }

      setOffset(data.nextOffset ?? 0);
      setHasMore(data.hasMore);
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Error fetching videos:', err);
    } finally {
      setLoading(false);
    }
  }, [loading, getToken, offset]);

  // Intersection observer for infinite scroll
  const lastVideoElementRef = useCallback((node: HTMLDivElement) => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loading) {
        fetchVideos(offset);
      }
    });
    
    if (node) observer.current.observe(node);
  }, [loading, hasMore, offset, fetchVideos]);

  useEffect(() => {
    fetchVideos(0);
  }, [fetchVideos]);

  const handleVideoSelect = (video: YouTubeVideo) => {
    if (selectedVideo?.id === video.id) {
      onVideoSelect(null); // Deselect if same video
    } else {
      onVideoSelect(video);
    }
  };

  const handleRetry = () => {
    setError(null);
    setOffset(0);
    fetchVideos(0);
  };

  const handleGoToIntegrations = () => {
    window.location.href = '/integrations';
  };

  if (error) {
    return (
      <div className="bg-white rounded-lg p-6 text-center" role="alert">
        <div className="text-red-500 mb-4">
          <svg className="w-12 h-12 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <h3 className="text-lg font-semibold mb-2">Unable to Load Videos</h3>
          <p className="text-gray-600 mb-4">{error}</p>
        </div>
        <div className="flex gap-3 justify-center">
          <button
            onClick={handleRetry}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            Try Again
          </button>
          <button
            onClick={handleGoToIntegrations}
            className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            Go to Integrations
          </button>
        </div>
      </div>
    );
  }

  if (videos.length === 0 && !loading) {
    return (
      <div className="bg-white rounded-lg p-6 text-center" role="status">
        <div className="text-gray-500">
          <svg className="w-12 h-12 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
          </svg>
          <h3 className="text-lg font-semibold mb-2">No Videos Found</h3>
          <p className="text-gray-600">No videos were found on your YouTube channel.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4" role="region" aria-label="YouTube video grid">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {videos.map((video, index) => (
          <div
            key={video.id}
            ref={index === videos.length - 1 ? lastVideoElementRef : undefined}
          >
            <YouTubeVideoCard
              video={video}
              isSelected={selectedVideo?.id === video.id}
              onSelect={handleVideoSelect}
            />
          </div>
        ))}
      </div>

      {/* Loading indicator */}
      {loading && (
        <div ref={loadingRef} className="flex justify-center py-6">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-500"></div>
        </div>
      )}

      {/* Fallback Load More button */}
      {!loading && hasMore && (
        <div className="flex justify-center py-4">
          <button
            onClick={() => fetchVideos(offset)}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-md text-sm font-medium shadow"
            aria-label="Load more videos"
          >
            Load More
          </button>
        </div>
      )}

      {/* End of results */}
      {!hasMore && videos.length > 0 && (
        <div className="text-center py-4 text-gray-500 text-sm">
          No more videos to load
        </div>
      )}
    </div>
  );
} 