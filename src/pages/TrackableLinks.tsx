import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Copy, MoreHorizontal, Download } from 'lucide-react';
import { format, parseISO, isWithinInterval } from 'date-fns';
import { useAuth, useUser } from '@clerk/clerk-react';
import { TrackableLink, LinkStats } from '../types/trackableLinks';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';

const platforms = ['YouTube', 'Instagram'];
const attributionWindows = [1, 7, 14];
const SHORT_LINK_DOMAIN = import.meta.env.VITE_SHORT_LINK_DOMAIN || 'https://www.pepperlytics.com';



export default function TrackableLinks() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState<{ from: Date | null; to: Date | null }>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date()
  });
  const [sortField, setSortField] = useState<'created_at' | 'revenue'>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [links, setLinks] = useState<TrackableLink[]>([]);
  const [linkStats, setLinkStats] = useState<Record<string, LinkStats>>({});
  const [visibleRows, setVisibleRows] = useState(10);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [menuLink, setMenuLink] = useState<TrackableLink | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Fetch links and stats
  async function fetchLinks() {
    if (!user) return;
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("No auth token");

      const response = await fetch('/api/user/links', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const { data: linksData, error: linksError } = await response.json();
      if (linksError) throw linksError;
      setLinks(linksData || []);

      // Fetch stats for each link
      const stats: Record<string, LinkStats> = {};
      for (const link of linksData || []) {
        const [clicks, calls, sales] = await Promise.all([
          fetch(`/api/user/clicks?short_code=${link.short_code}`, { headers: { 'Authorization': `Bearer ${token}` } }).then(res => res.json()),
          fetch(`/api/user/calls?short_code=${link.short_code}`, { headers: { 'Authorization': `Bearer ${token}` } }).then(res => res.json()),
          fetch(`/api/user/sales?short_code=${link.short_code}`, { headers: { 'Authorization': `Bearer ${token}` } }).then(res => res.json()),
        ]);
        stats[link.id] = {
          clicks: clicks.data?.length || 0,
          calls: calls.data?.length || 0,
          sales: sales.data?.length || 0,
          revenue: sales.data?.reduce((sum: number, sale: { amount?: number }) => sum + (sale.amount || 0), 0) || 0,
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

  useEffect(() => {
    if (!menuAnchor) return;
    function handleClick(event: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        menuAnchor &&
        !menuAnchor.contains(event.target as Node)
      ) {
        setMenuAnchor(null);
        setMenuLink(null);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuAnchor, menuLink]);

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



  // Download QR code
  async function downloadQRCode(url: string, filename: string) {
    const response = await fetch(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`);
    const blob = await response.blob();
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}-qr.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  }

  // Copy shortened link
  const handleCopy = (link: TrackableLink) => {
    const shortUrl = `${SHORT_LINK_DOMAIN}/${link.short_code}`;
    navigator.clipboard.writeText(shortUrl);
    setCopiedId(link.id);
    setTimeout(() => setCopiedId(null), 1200);
  };

  // Duplicate link
  const handleDuplicate = async (link: TrackableLink) => {
    if (!user) return;
    try {
      const token = await getToken();
      if (!token) throw new Error("No auth token");

      // Generate new short code
      let shortCode = Math.floor(Math.random() * 10000).toString();
      const duplicateResponse = await fetch('/api/user/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          short_code: shortCode,
          destination_url: link.destination_url,
          title: link.title + ' (Copy)',
          platform: link.platform,
          attribution_window_days: link.attribution_window_days,
        }),
      });
      const { data: newLink, error } = await duplicateResponse.json();
      if (error) throw error;
      await fetchLinks();
    } catch (error) {
      alert('Failed to duplicate link.');
    }
  };

  // Edit link
  const handleEdit = (link: TrackableLink) => {
    navigate(`/links/edit/${link.id}`);
  };

  // Delete link
  const handleDelete = async (link: TrackableLink) => {
    if (!window.confirm('Are you sure you want to delete this link?')) return;
    try {
      const token = await getToken();
      if (!token) throw new Error("No auth token");

      const response = await fetch(`/api/user/links?id=${link.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to delete link');
      await fetchLinks();
    } catch (error) {
      console.error('Error deleting link:', error);
      alert('Failed to delete link.');
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
          onClick={() => navigate('/links/new')}
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
                  <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                    link.platform === 'YouTube' ? 'bg-blue-100 text-blue-700' : 
                    link.platform === 'Instagram' ? 'bg-rose-100 text-rose-700' : 
                    'bg-gray-100 text-gray-700'
                  }`}>{link.platform || 'Not Set'}</span>
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
                    onClick={() => downloadQRCode(`${SHORT_LINK_DOMAIN}/${link.short_code}`, link.title || `link-${link.short_code}`)}
                  >
                    <Download size={16} />
                  </button>
                </td>
                <td className="px-2 py-1 text-xs whitespace-nowrap">{format(parseISO(link.created_at), 'dd MMM yyyy')}</td>
                <td className="px-2 py-1 text-xs whitespace-nowrap">{linkStats[link.id]?.clicks || 0}</td>
                <td className="px-2 py-1 text-xs whitespace-nowrap">{linkStats[link.id]?.calls || 0}</td>
                <td className="px-2 py-1 text-xs whitespace-nowrap">{linkStats[link.id]?.sales || 0}</td>
                <td className="px-2 py-1 text-xs whitespace-nowrap">${(linkStats[link.id]?.revenue || 0).toLocaleString()}</td>
                <td className="px-2 py-1 text-xs whitespace-nowrap relative">
                  <button
                    className="rounded-full p-2 hover:bg-gray-100 focus:outline-none"
                    onClick={e => {
                      setMenuAnchor(e.currentTarget as HTMLElement);
                      setMenuLink(link);
                    }}
                  >
                    <MoreHorizontal size={18} />
                  </button>
                  {menuAnchor && menuLink && createPortal(
                    <div
                      ref={menuRef}
                      className="z-50 w-40 rounded-xl bg-white shadow-soft flex flex-col py-2"
                      style={{
                        position: 'fixed',
                        top: menuAnchor.getBoundingClientRect().bottom + 8,
                        left: menuAnchor.getBoundingClientRect().left,
                      }}
                      tabIndex={-1}
                    >
                      <button
                        className="w-full text-left px-4 py-2 text-sm font-medium hover:bg-gray-100"
                        onClick={() => { handleDuplicate(menuLink); setMenuAnchor(null); setMenuLink(null); }}
                      >
                        Duplicate
                      </button>
                      <button
                        className="w-full text-left px-4 py-2 text-sm font-medium hover:bg-gray-100"
                        onClick={() => { handleEdit(menuLink); setMenuAnchor(null); setMenuLink(null); }}
                      >
                        Edit
                      </button>
                      <button
                        className="w-full text-left px-4 py-2 text-sm font-medium text-red-600 hover:bg-gray-100"
                        onClick={() => { handleDelete(menuLink); setMenuAnchor(null); setMenuLink(null); }}
                      >
                        Delete
                      </button>
                    </div>,
                    document.body
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredLinks.length === 0 && (
          <div className="text-center text-gray-400 py-8">No trackable links found.</div>
        )}
      </div>


    </div>
  );
} 