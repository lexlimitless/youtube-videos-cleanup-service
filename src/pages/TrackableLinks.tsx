import React, { useState, useMemo } from 'react';
import {
  Card,
  Table,
  TableHead,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
  Button,
  TextInput,
  Select,
  SelectItem,
  DateRangePicker,
  DateRangePickerValue,
  Badge,
} from '@tremor/react';
import { Plus, MoreHorizontal, Download } from 'lucide-react';
import { format, parseISO, isWithinInterval } from 'date-fns';

// Dummy data generator
const platforms = ['YouTube', 'Instagram'];
const attributionWindows = ['1 day', '7 days', '14 days'];
const dummyLinks = Array.from({ length: 20 }, (_, i) => {
  const platform = i % 2 === 0 ? 'YouTube' : 'Instagram';
  const createdDate = new Date(2025, 5, 1 + i);
  return {
    id: i + 1,
    title: platform === 'YouTube' ? `YouTube Content #${i + 1}` : `Instagram Promo #${i + 1}`,
    platform,
    url: platform === 'YouTube'
      ? `https://youtube.com/watch?v=abc${100 + i}`
      : `https://linkin.bio/amazinggains${i}`,
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
  const [dateRange, setDateRange] = useState<DateRangePickerValue>(initialDateRange);
  const [sortField, setSortField] = useState<'createdDate' | 'revenue'>('createdDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [showModal, setShowModal] = useState(false);
  const [links, setLinks] = useState(dummyLinks);
  const [visibleRows, setVisibleRows] = useState(10);

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

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Search by title..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="px-4 py-2 rounded-md border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 text-sm w-64"
          />
          <DateRangePicker
            value={dateRange}
            onValueChange={setDateRange}
            className="ml-2"
          />
        </div>
        <Button
          className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-md px-4 py-2 flex items-center gap-2 shadow-sm"
          onClick={() => setShowModal(true)}
        >
          <Plus size={18} /> Create Trackable Link
        </Button>
      </div>

      {/* Table */}
      <Card className="overflow-auto max-h-[70vh] rounded-xl shadow-sm" onScroll={handleScroll}>
        <Table className="min-w-full">
          <TableHead className="sticky top-0 bg-white z-10">
            <TableRow>
              <TableHeaderCell className="text-gray-500 font-semibold">Title/Label</TableHeaderCell>
              <TableHeaderCell className="text-gray-500 font-semibold">Platform</TableHeaderCell>
              <TableHeaderCell className="text-gray-500 font-semibold">Destination URL</TableHeaderCell>
              <TableHeaderCell className="text-gray-500 font-semibold">QR Code</TableHeaderCell>
              <TableHeaderCell
                className="text-gray-500 font-semibold cursor-pointer"
                onClick={() => setSortField(f => (f === 'createdDate' ? (setSortDirection(d => d === 'desc' ? 'asc' : 'desc'), 'createdDate') : (setSortDirection('desc'), 'createdDate')))}
              >
                Created Date {sortField === 'createdDate' && (sortDirection === 'desc' ? '↓' : '↑')}
              </TableHeaderCell>
              <TableHeaderCell className="text-gray-500 font-semibold">Clicks</TableHeaderCell>
              <TableHeaderCell className="text-gray-500 font-semibold">Calls Booked</TableHeaderCell>
              <TableHeaderCell className="text-gray-500 font-semibold">Sales Made</TableHeaderCell>
              <TableHeaderCell
                className="text-gray-500 font-semibold cursor-pointer"
                onClick={() => setSortField(f => (f === 'revenue' ? (setSortDirection(d => d === 'desc' ? 'asc' : 'desc'), 'revenue') : (setSortDirection('desc'), 'revenue')))}
              >
                Revenue {sortField === 'revenue' && (sortDirection === 'desc' ? '↓' : '↑')}
              </TableHeaderCell>
              <TableHeaderCell className="text-gray-500 font-semibold">Actions</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredLinks.map(link => (
              <TableRow key={link.id} className="hover:bg-gray-50">
                <TableCell className="font-medium text-gray-800">{link.title}</TableCell>
                <TableCell>
                  <Badge color={link.platform === 'YouTube' ? 'blue' : 'rose'}>{link.platform}</Badge>
                </TableCell>
                <TableCell>
                  <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline text-sm">
                    {link.url}
                  </a>
                </TableCell>
                <TableCell>
                  <Button
                    variant="light"
                    className="rounded-full p-2"
                    onClick={() => handleDownloadQR(link)}
                  >
                    <Download size={16} />
                  </Button>
                </TableCell>
                <TableCell>{format(parseISO(link.createdDate), 'dd MMM yyyy')}</TableCell>
                <TableCell>{link.clicks}</TableCell>
                <TableCell>{link.calls}</TableCell>
                <TableCell>{link.sales}</TableCell>
                <TableCell>${link.revenue.toLocaleString()}</TableCell>
                <TableCell>
                  <Button variant="light" className="rounded-full p-2">
                    <MoreHorizontal size={18} />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {filteredLinks.length === 0 && (
          <div className="text-center text-gray-400 py-8">No trackable links found.</div>
        )}
      </Card>

      {/* Modal for creating a new trackable link */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Create Trackable Link</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Title</label>
                <input
                  type="text"
                  name="title"
                  value={form.title}
                  onChange={handleFormChange}
                  placeholder="Optional"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Platform</label>
                <select
                  name="platform"
                  value={form.platform}
                  onChange={handleFormChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
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
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
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
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Attribution Window</label>
                <select
                  name="attribution"
                  value={form.attribution}
                  onChange={handleFormChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                >
                  {attributionWindows.map(w => (
                    <option key={w} value={w}>{w}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-4 mt-6">
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition-colors"
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
          </div>
        </div>
      )}
    </div>
  );
} 