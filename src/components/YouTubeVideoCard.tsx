import React, { useState } from 'react';

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
}

interface YouTubeVideoCardProps {
  video: YouTubeVideo;
  isSelected: boolean;
  onSelect: (video: YouTubeVideo) => void;
}



export default function YouTubeVideoCard({ video, isSelected, onSelect }: YouTubeVideoCardProps) {
  const [showDesc, setShowDesc] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);





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
          src={video.thumbnail_url || ''} 
          alt={video.title || 'Video thumbnail'}
          className="w-full h-full object-cover"
        />

      </div>

      {/* Video info */}
      <div className="p-3">
        <h3 className="font-medium text-gray-900 text-sm line-clamp-3 leading-tight" title={video.title || ''}>
          {video.title || 'Untitled Video'}
        </h3>
      </div>

      {/* Hover overlay */}
      <div className={`absolute inset-0 bg-blue-500 bg-opacity-10 transition-opacity duration-200 pointer-events-none ${
        isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
      }`} />
    </div>
  );
} 