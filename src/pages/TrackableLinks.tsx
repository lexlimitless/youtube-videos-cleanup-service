import React, { useState, useMemo } from 'react';
import { Copy, MoreHorizontal, Download } from 'lucide-react';
import { format, parseISO, isWithinInterval } from 'date-fns';
import { Dialog } from '@headlessui/react';

const platforms = ['YouTube', 'Instagram'];
const attributionWindows = ['1 day', '7 days', '14 days'];
const dummyLinks = Array.from({ length: 20 }, (_, i) => {
  const platform = i % 2 === 0 ? 'YouTube' : 'Instagram';
  const createdDate = new Date(2025, 5, 1 + i);
  const short = `amg.ly/${1000 + i}`;
  return {
    id: i + 1,
    title: platform === 'YouTube' ? `YouTube Content #${i + 1}` : `Instagram Promo #${i + 1}`,
    platform,
    url: platform === 'YouTube'
      ? `https://youtube.com/watch?v=abc${100 + i}`
      : `https://linkin.bio/amazinggains${i}`,
    shortLink: short,
    createdDate: format(createdDate, 'yyyy-MM-dd'),
    clicks: Math.floor(Math.random() * 800),
    calls: Math.floor(Math.random() * 20),
    sales: Math.floor(Math.random() * 10),
    revenue: Math.floor(Math.random() * 3000),
    tags: i % 3 === 0 ? ['promo', 'summer'] : [],
    attribution: attributionWindows[i % 3],
  };
});

const initialDateRange = {
  from: new Date(2025, 5, 1),
  to: new Date(2025, 5, 20),
};

export default function TrackableLinks() {
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState<{ from: Date | null; to: Date | null }>(initialDateRange);
  const [sortField, setSortField] = useState<'createdDate' | 'revenue'>('createdDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [showModal, setShowModal] = useState(false);
  const [links, setLinks] = useState(dummyLinks);
  const [visibleRows, setVisibleRows] = useState(10);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // Modal form state
  const [form, setForm] = useState({
    title: '',
    platform: 'YouTube',
    url: '',
    tags: '',
    attribution: '7 days',
  });

  // Filtered and sorted data
  const filteredLinks = useMemo(() => {
    let filtered = links.filter(link =>
      link.title.toLowerCase().includes(search.toLowerCase())
    );
    if (dateRange.from && dateRange.to) {
      filtered = filtered.filter(link =>
        isWithinInterval(parseISO(link.createdDate), {
          start: dateRange.from!,
          end: dateRange.to!,
        })
      );
    }
    filtered.sort((a, b) => {
      if (sortField === 'createdDate') {
        const aDate = parseISO(a.createdDate).getTime();
        const bDate = parseISO(b.createdDate).getTime();
        return sortDirection === 'desc' ? bDate - aDate : aDate - bDate;
      } else {
        return sortDirection === 'desc' ? b.revenue - a.revenue : a.revenue - b.revenue;
      }
    });
    return filtered.slice(0, visibleRows);
  }, [links, search, dateRange, sortField, sortDirection, visibleRows]);

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
  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setLinks([
      {
        id: links.length + 1,
        title: form.title || `Untitled Link #${links.length + 1}`,
        platform: form.platform,
        url: form.url,
        shortLink: `amg.ly/${1000 + links.length + 1}`,
        createdDate: format(new Date(), 'yyyy-MM-dd'),
        clicks: Math.floor(Math.random() * 800),
        calls: Math.floor(Math.random() * 20),
        sales: Math.floor(Math.random() * 10),
        revenue: Math.floor(Math.random() * 3000),
        tags: form.tags ? form.tags.split(',').map(t => t.trim()) : [],
        attribution: form.attribution,
      },
      ...links,
    ]);
    setShowModal(false);
    setForm({ title: '', platform: 'YouTube', url: '', tags: '', attribution: '7 days' });
  };

  // Download QR code (dummy)
  const handleDownloadQR = (link: any) => {
    // In real app, generate QR and download as PNG
    alert(`Download QR for: ${link.url}`);
  };

  // Copy shortened link
  const handleCopy = (link: any) => {
    navigator.clipboard.writeText(link.shortLink);
    setCopiedId(link.id);
    setTimeout(() => setCopiedId(null), 1200);
  };

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
            onChange={e => setDateRange((r: { from: Date | null; to: Date | null }) => ({ ...r, from: e.target.value ? new Date(e.target.value) : null }))}
            className="ml-2 px-2 py-1 rounded border border-gray-200 text-sm"
          />
          <span className="mx-1 text-gray-400">to</span>
          <input
            type="date"
            value={dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : ''}
            onChange={e => setDateRange((r: { from: Date | null; to: Date | null }) => ({ ...r, to: e.target.value ? new Date(e.target.value) : null }))}
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
      <div className="overflow-auto max-h-[70vh] rounded-xl shadow-soft bg-white w-full max-w-full">
        <table className="min-w-full divide-y divide-gray-200 w-full max-w-full">
          <thead className="sticky top-0 bg-white z-10">
            <tr>
              <th className="text-gray-500 font-semibold px-2 py-1 text-xs text-left whitespace-nowrap">Title/Label</th>
              <th className="text-gray-500 font-semibold px-2 py-1 text-xs text-left whitespace-nowrap">Platform</th>
              <th className="text-gray-500 font-semibold px-2 py-1 text-xs text-left whitespace-nowrap">Shortened Link</th>
              <th className="text-gray-500 font-semibold px-2 py-1 text-xs text-left whitespace-nowrap">Destination URL</th>
              <th className="text-gray-500 font-semibold px-2 py-1 text-xs text-left whitespace-nowrap">QR Code</th>
              <th className="text-gray-500 font-semibold px-2 py-1 text-xs cursor-pointer whitespace-nowrap" onClick={() => setSortField(f => (f === 'createdDate' ? (setSortDirection(d => d === 'desc' ? 'asc' : 'desc'), 'createdDate') : (setSortDirection('desc'), 'createdDate')))}>
                Created Date {sortField === 'createdDate' && (sortDirection === 'desc' ? '↓' : '↑')}
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
                    <span className="text-gray-700 font-mono bg-gray-100 px-2 py-1 rounded-md text-xs select-all">{link.shortLink}</span>
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
                  <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-emerald-700 hover:underline text-xs">
                    {link.url}
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
                <td className="px-2 py-1 text-xs whitespace-nowrap">{format(parseISO(link.createdDate), 'dd MMM yyyy')}</td>
                <td className="px-2 py-1 text-xs whitespace-nowrap">{link.clicks}</td>
                <td className="px-2 py-1 text-xs whitespace-nowrap">{link.calls}</td>
                <td className="px-2 py-1 text-xs whitespace-nowrap">{link.sales}</td>
                <td className="px-2 py-1 text-xs whitespace-nowrap">${link.revenue.toLocaleString()}</td>
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
                <label className="block text-sm font-medium text-gray-700">Tags</label>
                <input
                  type="text"
                  name="tags"
                  value={form.tags}
                  onChange={handleFormChange}
                  placeholder="Comma separated"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring focus:ring-emerald-200 focus:ring-opacity-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Attribution Window</label>
                <select
                  name="attribution"
                  value={form.attribution}
                  onChange={handleFormChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring focus:ring-emerald-200 focus:ring-opacity-50"
                >
                  {attributionWindows.map(w => (
                    <option key={w} value={w}>{w}</option>
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