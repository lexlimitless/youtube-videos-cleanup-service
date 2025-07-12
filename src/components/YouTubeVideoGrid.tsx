import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@clerk/clerk-react';
import YouTubeVideoCard from './YouTubeVideoCard';

interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string;
  published_at: string;
  view_count: number | null;
  like_count: number | null;
  comment_count: number | null;
  duration: string | null;
  channel_id: string;
  channel_title: string;
  privacyStatus?: string | null;
  videoType?: 'video' | 'short' | 'live' | null;
}

interface YouTubeVideoGridProps {
  onVideoSelect: (video: YouTubeVideo | null) => void;
  selectedVideo: YouTubeVideo | null;
}

export default function YouTubeVideoGrid({ onVideoSelect, selectedVideo }: YouTubeVideoGridProps) {
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [filteredVideos, setFilteredVideos] = useState<YouTubeVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState<number>(0);
  const [youtubePageToken, setYoutubePageToken] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [videoTypeFilters, setVideoTypeFilters] = useState({
    videos: true,
    shorts: true,
    lives: true,
  });
  const { getToken } = useAuth();
  const lastVideoElement = useRef<HTMLDivElement | null>(null);
  const currentOffsetRef = useRef<number>(0);
  const currentPageTokenRef = useRef<string | null>(null);

  const fetchVideos = useCallback(async (currentOffset?: number, pageToken?: string | null) => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const requestOffset = currentOffset ?? currentOffsetRef.current;
      const requestPageToken = pageToken ?? currentPageTokenRef.current;
      const params = new URLSearchParams({
        limit: '15',
        offset: requestOffset.toString(),
      });
      if (requestPageToken) {
        params.append('youtubePageToken', requestPageToken);
      }
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
      if (requestOffset > 0 || requestPageToken) {
        setVideos(prev => [...prev, ...data.videos]);
      } else {
        setVideos(data.videos);
      }
      setOffset(data.nextOffset ?? 0);
      currentOffsetRef.current = data.nextOffset ?? 0;
      setHasMore(data.hasMore);
      setYoutubePageToken(data.youtubePageToken || null);
      currentPageTokenRef.current = data.youtubePageToken || null;
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Error fetching videos:', err);
    } finally {
      setLoading(false);
    }
  }, [loading, getToken]);

  // Attach intersection observer to last video element
  useEffect(() => {
    console.log('🔍 [useEffect] filteredVideos.length:', filteredVideos.length, 'loading:', loading, 'hasMore:', hasMore);
    if (loading || !hasMore || searchQuery.trim()) {
      console.log('🔍 [useEffect] Not attaching observer: loading, no more videos, or search active');
      return;
    }
    const node = lastVideoElement.current;
    if (!node) {
      console.log('🔍 [useEffect] No node to observe');
      return;
    }
    console.log('🔍 [useEffect] Attaching observer to node:', node);
    const observer = new window.IntersectionObserver(entries => {
      console.log('🔍 [IntersectionObserver] entries:', entries, 'loading:', loading, 'hasMore:', hasMore);
      if (entries[0].isIntersecting && !loading && hasMore && !searchQuery.trim()) {
        console.log('🔍 [IntersectionObserver] Triggering fetchVideos with offset:', currentOffsetRef.current, 'pageToken:', currentPageTokenRef.current);
        fetchVideos(currentOffsetRef.current, currentPageTokenRef.current);
      }
    });
    observer.observe(node);
    return () => {
      console.log('🔍 [useEffect] Detaching observer from node:', node);
      observer.disconnect();
    };
  }, [filteredVideos.length, loading, hasMore, searchQuery, fetchVideos]);

  // Filter videos based on search query and video type filters
  useEffect(() => {
    let filtered = videos;

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(video => 
        video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        video.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply video type filters
    filtered = filtered.filter(video => {
      if (!video.videoType) return true; // Include videos without type info
      
      switch (video.videoType) {
        case 'video':
          return videoTypeFilters.videos;
        case 'short':
          return videoTypeFilters.shorts;
        case 'live':
          return videoTypeFilters.lives;
        default:
          return true;
      }
    });

    setFilteredVideos(filtered);
  }, [videos, searchQuery, videoTypeFilters]);

  useEffect(() => {
    fetchVideos(0, null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    setYoutubePageToken(null);
    currentOffsetRef.current = 0;
    currentPageTokenRef.current = null;
    fetchVideos(0, null);
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
      {/* Search Bar */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search videos by title or description..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Video Type Filters */}
      <div className="mb-4">
        <div className="flex gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={videoTypeFilters.videos}
              onChange={(e) => setVideoTypeFilters(prev => ({ ...prev, videos: e.target.checked }))}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">Videos</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={videoTypeFilters.shorts}
              onChange={(e) => setVideoTypeFilters(prev => ({ ...prev, shorts: e.target.checked }))}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">Shorts</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={videoTypeFilters.lives}
              onChange={(e) => setVideoTypeFilters(prev => ({ ...prev, lives: e.target.checked }))}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">Lives</span>
          </label>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {filteredVideos.map((video, index) => (
          <div
            key={video.id}
            ref={index === filteredVideos.length - 1 && !searchQuery.trim() ? lastVideoElement : undefined}
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
        <div className="flex justify-center py-6">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-500"></div>
        </div>
      )}
      {/* Fallback Load More button */}
      {!loading && hasMore && (
        <div className="flex justify-center py-4">
          <button
            onClick={() => fetchVideos(currentOffsetRef.current, currentPageTokenRef.current)}
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