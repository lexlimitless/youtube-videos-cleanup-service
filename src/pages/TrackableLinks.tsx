import React, { useState, useMemo, useEffect } from 'react';
import { Copy, MoreHorizontal, Download } from 'lucide-react';
import { format, parseISO, isWithinInterval } from 'date-fns';
import { Dialog } from '@headlessui/react';
import { useUser } from '@clerk/clerk-react';
import { supabase, downloadQRCode } from '../lib/supabase';
import { TrackableLink, LinkStats } from '../types/trackableLinks';

const platforms = ['YouTube', 'Instagram'];
const attributionWindows = [1, 7, 14];
const SHORT_LINK_DOMAIN = import.meta.env.VITE_SHORT_LINK_DOMAIN || 'https://moreclientslesscrickets.com';

export default function TrackableLinks() {
  const { user } = useUser();
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState<{ from: Date | null; to: Date | null }>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date()
  });
  const [sortField, setSortField] = useState<'created_at' | 'revenue'>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [showModal, setShowModal] = useState(false);
  const [links, setLinks] = useState<TrackableLink[]>([]);
  const [linkStats, setLinkStats] = useState<Record<string, LinkStats>>({});
  const [visibleRows, setVisibleRows] = useState(10);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal form state
  const [form, setForm] = useState({
    title: '',
    platform: 'YouTube',
    url: '',
    attribution_window_days: 7,
  });

  // Fetch links and stats
  async function fetchLinks() {
    if (!user) return;
    setLoading(true);
    try {
      // Fetch links
      const { data: linksData, error: linksError } = await supabase
        .from('links')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (linksError) throw linksError;
      setLinks(linksData || []);

      // Fetch stats for each link
      const stats: Record<string, LinkStats> = {};
      for (const link of linksData || []) {
        const [clicks, calls, sales] = await Promise.all([
          supabase.from('clicks').select('id').eq('short_code', link.short_code),
          supabase.from('calls').select('id').eq('short_code', link.short_code),
          supabase.from('sales').select('id, amount').eq('short_code', link.short_code),
        ]);
        stats[link.id] = {
          clicks: clicks.data?.length || 0,
          calls: calls.data?.length || 0,
          sales: sales.data?.length || 0,
          revenue: sales.data?.reduce((sum, sale) => sum + (sale.amount || 0), 0) || 0,
        };
      }
      setLinkStats(stats);
    } catch (error) {
      console.error('Error fetching links:', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLinks();
  }, [user]);

  // Restore filtered and sorted data
  const filteredLinks = useMemo(() => {
    let filtered = links.filter(link =>
      link.title?.toLowerCase().includes(search.toLowerCase())
    );
    if (dateRange.from && dateRange.to) {
      filtered = filtered.filter(link =>
        isWithinInterval(parseISO(link.created_at), {
          start: dateRange.from!,
          end: dateRange.to!,
        })
      );
    }
    filtered.sort((a, b) => {
      if (sortField === 'created_at') {
        const aDate = parseISO(a.created_at).getTime();
        const bDate = parseISO(b.created_at).getTime();
        return sortDirection === 'desc' ? bDate - aDate : aDate - bDate;
      } else {
        const aRevenue = linkStats[a.id]?.revenue || 0;
        const bRevenue = linkStats[b.id]?.revenue || 0;
        return sortDirection === 'desc' ? bRevenue - aRevenue : aRevenue - bRevenue;
      }
    });
    return filtered.slice(0, visibleRows);
  }, [links, linkStats, search, dateRange, sortField, sortDirection, visibleRows]);

  // Infinite scroll handler
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollTop + clientHeight >= scrollHeight - 10 && visibleRows < links.length) {
      setVisibleRows(v => Math.min(v + 10, links.length));
    }
  };

  // Modal form handlers
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      // Generate short code
      let shortCode;
      // Fallback to frontend short code generation
      shortCode = Math.floor(Math.random() * 10000).toString();

      // Create link
      const { data: link, error: linkError } = await supabase
        .from('links')
        .insert([{
          user_id: user.id,
          short_code: shortCode,
          destination_url: form.url,
          title: form.title || `Untitled Link ${links.length + 1}`,
          platform: form.platform,
          attribution_window_days: form.attribution_window_days,
        }])
        .select()
        .single();

      if (linkError) throw linkError;

      // Re-fetch links and stats from backend for robust UI update
      await fetchLinks();
      setVisibleRows(10);
      setShowModal(false);
      setForm({ title: '', platform: 'YouTube', url: '', attribution_window_days: 7 });
    } catch (error) {
      console.error('Error creating link:', error);
      alert('Failed to create link. Please try again.');
    }
  };

  // Download QR code
  const handleDownloadQR = async (link: TrackableLink) => {
    const shortUrl = `${SHORT_LINK_DOMAIN}/${link.short_code}`;
    await downloadQRCode(shortUrl, link.title || `link-${link.short_code}`);
  };

  // Copy shortened link
  const handleCopy = (link: TrackableLink) => {
    const shortUrl = `${SHORT_LINK_DOMAIN}/${link.short_code}`;
    navigator.clipboard.writeText(shortUrl);
    setCopiedId(link.id);
    setTimeout(() => setCopiedId(null), 1200);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full max-w-full px-0 min-h-screen bg-gray-50 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 w-full max-w-full">
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Search by title..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="px-4 py-2 rounded-md border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100 text-sm w-64"
          />
          <input
            type="date"
            value={dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : ''}
            onChange={e => setDateRange(r => ({ ...r, from: e.target.value ? new Date(e.target.value) : null }))}
            className="ml-2 px-2 py-1 rounded border border-gray-200 text-sm"
          />
          <span className="mx-1 text-gray-400">to</span>
          <input
            type="date"
            value={dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : ''}
            onChange={e => setDateRange(r => ({ ...r, to: e.target.value ? new Date(e.target.value) : null }))}
            className="px-2 py-1 rounded border border-gray-200 text-sm"
          />
        </div>
        <button
          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-md px-4 py-2 flex items-center gap-2 shadow-soft font-semibold"
          onClick={() => setShowModal(true)}
        >
          + Create Trackable Link
        </button>
      </div>

      {/* Table */}
      <div className="overflow-auto max-h-[70vh] rounded-xl shadow-soft bg-white w-full max-w-full" onScroll={handleScroll}>
        <table className="min-w-full divide-y divide-gray-200 w-full max-w-full">
          <thead className="sticky top-0 bg-white z-10">
            <tr>
              <th className="text-gray-500 font-semibold px-2 py-1 text-xs text-left whitespace-nowrap">Title/Label</th>
              <th className="text-gray-500 font-semibold px-2 py-1 text-xs text-left whitespace-nowrap">Platform</th>
              <th className="text-gray-500 font-semibold px-2 py-1 text-xs text-left whitespace-nowrap">Shortened Link</th>
              <th className="text-gray-500 font-semibold px-2 py-1 text-xs text-left whitespace-nowrap">Destination URL</th>
              <th className="text-gray-500 font-semibold px-2 py-1 text-xs text-left whitespace-nowrap">QR Code</th>
              <th className="text-gray-500 font-semibold px-2 py-1 text-xs cursor-pointer whitespace-nowrap" onClick={() => setSortField(f => (f === 'created_at' ? (setSortDirection(d => d === 'desc' ? 'asc' : 'desc'), 'created_at') : (setSortDirection('desc'), 'created_at')))}>
                Created Date {sortField === 'created_at' && (sortDirection === 'desc' ? '↓' : '↑')}
              </th>
              <th className="text-gray-500 font-semibold px-2 py-1 text-xs text-left whitespace-nowrap">Clicks</th>
              <th className="text-gray-500 font-semibold px-2 py-1 text-xs text-left whitespace-nowrap">Calls Booked</th>
              <th className="text-gray-500 font-semibold px-2 py-1 text-xs text-left whitespace-nowrap">Sales Made</th>
              <th className="text-gray-500 font-semibold px-2 py-1 text-xs cursor-pointer whitespace-nowrap" onClick={() => setSortField(f => (f === 'revenue' ? (setSortDirection(d => d === 'desc' ? 'asc' : 'desc'), 'revenue') : (setSortDirection('desc'), 'revenue')))}>
                Revenue {sortField === 'revenue' && (sortDirection === 'desc' ? '↓' : '↑')}
              </th>
              <th className="text-gray-500 font-semibold px-2 py-1 text-xs text-left whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredLinks.map(link => (
              <tr key={link.id} className="hover:bg-gray-50">
                <td className="font-medium text-gray-800 px-2 py-1 text-xs whitespace-nowrap">{link.title}</td>
                <td className="px-2 py-1 text-xs whitespace-nowrap">
                  <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${link.platform === 'YouTube' ? 'bg-blue-100 text-blue-700' : 'bg-rose-100 text-rose-700'}`}>{link.platform}</span>
                </td>
                <td className="px-2 py-1 text-xs whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-700 font-mono bg-gray-100 px-2 py-1 rounded-md text-xs select-all">
                      {SHORT_LINK_DOMAIN.replace(/^https?:\/\//, '')}/{link.short_code}
                    </span>
                    <button
                      className={`rounded-full p-2 ${copiedId === link.id ? 'bg-emerald-100' : ''}`}
                      onClick={() => handleCopy(link)}
                      title="Copy shortened link"
                    >
                      <Copy size={14} className={copiedId === link.id ? 'text-emerald-600' : 'text-gray-500'} />
                    </button>
                  </div>
                </td>
                <td className="px-2 py-1 text-xs whitespace-nowrap">
                  <a href={link.destination_url} target="_blank" rel="noopener noreferrer" className="text-emerald-700 hover:underline text-xs">
                    {link.destination_url}
                  </a>
                </td>
                <td className="px-2 py-1 text-xs whitespace-nowrap">
                  <button
                    className="rounded-full p-2"
                    onClick={() => handleDownloadQR(link)}
                  >
                    <Download size={16} />
                  </button>
                </td>
                <td className="px-2 py-1 text-xs whitespace-nowrap">{format(parseISO(link.created_at), 'dd MMM yyyy')}</td>
                <td className="px-2 py-1 text-xs whitespace-nowrap">{linkStats[link.id]?.clicks || 0}</td>
                <td className="px-2 py-1 text-xs whitespace-nowrap">{linkStats[link.id]?.calls || 0}</td>
                <td className="px-2 py-1 text-xs whitespace-nowrap">{linkStats[link.id]?.sales || 0}</td>
                <td className="px-2 py-1 text-xs whitespace-nowrap">${(linkStats[link.id]?.revenue || 0).toLocaleString()}</td>
                <td className="px-2 py-1 text-xs whitespace-nowrap">
                  <button className="rounded-full p-2">
                    <MoreHorizontal size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredLinks.length === 0 && (
          <div className="text-center text-gray-400 py-8">No trackable links found.</div>
        )}
      </div>

      {/* Modal for creating a new trackable link */}
      <Dialog open={showModal} onClose={() => setShowModal(false)} className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="fixed inset-0 bg-black bg-opacity-40" aria-hidden="true" />
        <div className="relative bg-white rounded-xl shadow-lg p-8 w-full max-w-lg mx-auto">
          <Dialog.Panel>
            <Dialog.Title className="text-xl font-semibold mb-4">Create Trackable Link</Dialog.Title>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Title</label>
                <input
                  type="text"
                  name="title"
                  value={form.title}
                  onChange={handleFormChange}
                  placeholder="Optional"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring focus:ring-emerald-200 focus:ring-opacity-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Platform</label>
                <select
                  name="platform"
                  value={form.platform}
                  onChange={handleFormChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring focus:ring-emerald-200 focus:ring-opacity-50"
                >
                  {platforms.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Destination URL</label>
                <input
                  type="url"
                  name="url"
                  value={form.url}
                  onChange={handleFormChange}
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring focus:ring-emerald-200 focus:ring-opacity-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Attribution Window (days)</label>
                <select
                  name="attribution_window_days"
                  value={form.attribution_window_days}
                  onChange={handleFormChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring focus:ring-emerald-200 focus:ring-opacity-50"
                >
                  {attributionWindows.map(days => (
                    <option key={days} value={days}>{days} days</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-4 mt-6">
                <button
                  type="submit"
                  className="flex-1 bg-emerald-600 text-white py-2 px-4 rounded-md hover:bg-emerald-700 transition-colors font-semibold"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
} 