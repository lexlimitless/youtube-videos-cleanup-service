import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth, useUser } from '@clerk/clerk-react';
import { ArrowLeft } from 'lucide-react';
import YouTubeVideoGrid from '../components/YouTubeVideoGrid';
import { TrackableLink } from '../types/trackableLinks';

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

const platforms = ['YouTube', 'Instagram'];
const attributionWindows = [1, 7, 14];

export default function TrackableLinkForm() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [form, setForm] = useState({
    title: '',
    platform: '',
    url: '',
    attribution_window_days: 7,
  });

  // YouTube video selection state
  const [selectedYouTubeVideo, setSelectedYouTubeVideo] = useState<YouTubeVideo | null>(null);

  // Load existing link data if editing
  useEffect(() => {
    if (id) {
      loadLinkData();
    }
  }, [id]);

  const loadLinkData = async () => {
    if (!user || !id) return;
    
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("No auth token");

      const response = await fetch(`/api/user/links?id=${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        throw new Error('Failed to load link');
      }

      const { data: link } = await response.json();
      
      setForm({
        title: link.title || '',
        platform: link.platform || '',
        url: link.destination_url || '',
        attribution_window_days: link.attribution_window_days || 7,
      });

      // Load YouTube video data if exists
      if (link.youtube_video_id) {
        // You might want to fetch the video details here
        // For now, we'll just set a placeholder
        setSelectedYouTubeVideo({
          id: link.youtube_video_id,
          title: 'Selected Video',
          description: '',
          thumbnail_url: '',
          published_at: '',
          view_count: 0,
          like_count: 0,
          comment_count: 0,
          duration: '',
          channel_id: '',
          channel_title: '',
        });
      }
    } catch (error) {
      console.error('Error loading link:', error);
      alert('Failed to load link data');
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Validate required fields
    if (!form.platform) {
      alert('Please select a platform');
      return;
    }

    if (!form.url) {
      alert('Please enter a destination URL');
      return;
    }

    setSaving(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("No auth token");

      // If YouTube video is selected, fetch detailed information first
      if (form.platform === 'YouTube' && selectedYouTubeVideo?.id) {
        try {
          const videoDetailsResponse = await fetch(`/api/user/youtube/videos?videoId=${selectedYouTubeVideo.id}`, {
            headers: { 'Authorization': `Bearer ${token}` },
          });
          
          if (videoDetailsResponse.ok) {
            console.log('Video details fetched and stored successfully');
          } else {
            console.warn('Failed to fetch video details, but continuing with link creation');
          }
        } catch (error) {
          console.warn('Error fetching video details:', error);
        }
      }

      if (id) {
        // Update existing link
        const response = await fetch(`/api/user/links?id=${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({
            destination_url: form.url,
            title: form.title,
            platform: form.platform,
            attribution_window_days: form.attribution_window_days,
            youtube_video_id: selectedYouTubeVideo?.id || null,
          }),
        });
        
        if (!response.ok) throw new Error('Failed to update link');
      } else {
        // Create new link
        const response = await fetch('/api/user/links', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({
            destination_url: form.url,
            title: form.title || `Untitled Link`,
            platform: form.platform,
            attribution_window_days: form.attribution_window_days,
            youtube_video_id: selectedYouTubeVideo?.id || null,
          }),
        });
        
        if (!response.ok) throw new Error('Failed to create link');
      }

      // Redirect to trackable links page
      navigate('/links');
    } catch (error) {
      console.error('Error saving link:', error);
      alert('Failed to save link. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full max-w-4xl mx-auto px-6 py-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate('/links')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft size={20} />
          Back to Links
        </button>
        <h1 className="text-2xl font-bold text-gray-900">
          {id ? 'Edit Trackable Link' : 'Create New Trackable Link'}
        </h1>
      </div>

      {/* Action Buttons - Moved to top */}
      <div className="flex gap-4 mb-6">
        <button
          type="button"
          onClick={() => navigate('/links')}
          className="bg-gray-200 text-gray-700 py-3 px-6 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="bg-emerald-600 text-white py-3 px-6 rounded-lg hover:bg-emerald-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : (id ? 'Save Changes' : 'Create Link')}
        </button>
      </div>

      {/* Form */}
      <div className="bg-white rounded-xl shadow-soft p-8">
        <form onSubmit={handleSave} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title
            </label>
            <input
              type="text"
              name="title"
              value={form.title}
              onChange={handleFormChange}
              placeholder="Enter a title for your link (optional)"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Platform <span className="text-red-500">*</span>
            </label>
            <select
              name="platform"
              value={form.platform}
              onChange={handleFormChange}
              required
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="">Select a platform</option>
              {platforms.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Destination URL <span className="text-red-500">*</span>
            </label>
            <input
              type="url"
              name="url"
              value={form.url}
              onChange={handleFormChange}
              required
              placeholder="https://example.com"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Attribution Window (days)
            </label>
            <select
              name="attribution_window_days"
              value={form.attribution_window_days}
              onChange={handleFormChange}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              {attributionWindows.map(days => (
                <option key={days} value={days}>{days} days</option>
              ))}
            </select>
          </div>



          {/* YouTube Video Selection */}
          {form.platform === 'YouTube' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-4">
                Select YouTube Video (Optional)
              </label>
              <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
                <YouTubeVideoGrid
                  onVideoSelect={setSelectedYouTubeVideo}
                  selectedVideo={selectedYouTubeVideo}
                />
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
} 