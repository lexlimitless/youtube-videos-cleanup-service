import React, { useState } from 'react';

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

interface YouTubeVideoCardProps {
  video: YouTubeVideo;
  isSelected: boolean;
  onSelect: (video: YouTubeVideo) => void;
}

function formatDuration(isoDuration: string): string {
  // Parse ISO 8601 duration to hh:mm:ss or mm:ss
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return '';
  const [, h, m, s] = match.map(x => parseInt(x || '0', 10));
  if (h) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function YouTubeVideoCard({ video, isSelected, onSelect }: YouTubeVideoCardProps) {
  const [showDesc, setShowDesc] = useState(false);

  const formatViewCount = (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M views`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K views`;
    }
    return `${count} views`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffInDays === 0) {
      return 'Today';
    } else if (diffInDays === 1) {
      return 'Yesterday';
    } else if (diffInDays < 7) {
      return `${diffInDays} days ago`;
    } else if (diffInDays < 30) {
      const weeks = Math.floor(diffInDays / 7);
      return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
    } else if (diffInDays < 365) {
      const months = Math.floor(diffInDays / 30);
      return `${months} month${months > 1 ? 's' : ''} ago`;
    } else {
      const years = Math.floor(diffInDays / 365);
      return `${years} year${years > 1 ? 's' : ''} ago`;
    }
  };

  return (
    <div 
      className={`relative bg-white rounded-lg shadow-md overflow-hidden cursor-pointer transition-all duration-200 border-2 ${
        isSelected ? 'ring-4 ring-blue-500 border-blue-400 shadow-lg' : 'border-transparent hover:border-blue-300 hover:shadow-lg'
      }`}
      onClick={() => onSelect(video)}
      tabIndex={0}
      aria-pressed={isSelected}
      role="button"
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onSelect(video); }}
    >
      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute top-2 right-2 z-10">
          <div className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
      )}

      {/* Thumbnail (16:9) */}
      <div className="relative aspect-w-16 aspect-h-9 bg-gray-200">
        <img 
          src={video.thumbnail_url} 
          alt={video.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute bottom-1 right-1 bg-black bg-opacity-75 text-white text-xs px-1 py-0.5 rounded">
          {formatDuration(video.duration)}
        </div>
      </div>

      {/* Video info */}
      <div className="p-3">
        <h3 className="font-medium text-gray-900 text-sm line-clamp-2 mb-2 leading-tight" title={video.title}>
          {video.title}
        </h3>
        <div className="flex flex-col text-xs text-gray-500 mt-2">
          <span>{formatViewCount(video.view_count)}</span>
          <span>{formatDate(video.published_at)}</span>
        </div>
        {/* Description on hover/click */}
        <div className="mt-2 text-xs text-gray-400">
          <button
            className="underline hover:text-gray-600 focus:outline-none"
            onMouseEnter={() => setShowDesc(true)}
            onMouseLeave={() => setShowDesc(false)}
            onFocus={() => setShowDesc(true)}
            onBlur={() => setShowDesc(false)}
            tabIndex={-1}
            aria-label="Show description"
          >
            {showDesc ? video.description : 'Show description'}
          </button>
        </div>
      </div>

      {/* Hover overlay */}
      <div className={`absolute inset-0 bg-blue-500 bg-opacity-10 transition-opacity duration-200 pointer-events-none ${
        isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
      }`} />
    </div>
  );
} 