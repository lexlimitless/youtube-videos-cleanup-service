import React, { useMemo, useState } from 'react';
import { Title } from '@tremor/react';
import { format, subMonths } from 'date-fns';
import {
  AreaChart as ReAreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';
import { Menu } from '@headlessui/react';
import { ChevronDown } from 'lucide-react';

// Generate dummy aggregate data for the last 12 months
const months = Array.from({ length: 12 }, (_, i) => {
  const date = subMonths(new Date(), 11 - i);
  return format(date, 'MMM yyyy');
});

const dummyData = months.map((month, i) => {
  const revenue = 5000 + i * 1200 + Math.floor(Math.random() * 800);
  const calls = 20 + Math.floor(Math.random() * 10);
  const sales = 10 + Math.floor(Math.random() * 8);
  return {
    month,
    revenue,
    calls,
    sales,
  };
});

// Calculate revenue growth %
const dataWithGrowth = dummyData.map((row, i, arr) => {
  if (i === 0) return { ...row, growth: null };
  const prev = arr[i - 1].revenue;
  const growth = prev ? ((row.revenue - prev) / prev) * 100 : null;
  return { ...row, growth };
});

export default function Dashboard() {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: subMonths(new Date(), 2),
    to: new Date(),
  });
  const [showCalendar, setShowCalendar] = useState(false);
  const quickRanges = [
    { label: 'LAST 30 DAYS', days: 30 },
    { label: 'LAST 90 DAYS', days: 90 },
    { label: 'LAST 365 DAYS', days: 365 },
    { label: 'YTD', ytd: true },
    { label: 'ALL', all: true },
  ];
  function formatRange(from: Date, to: Date) {
    return `${format(from, 'yyyy-MM-dd')} to ${format(to, 'yyyy-MM-dd')}`;
  }

  // Chart data for AreaChart
  const chartData = useMemo(() =>
    dataWithGrowth.map(row => ({
      month: row.month,
      Revenue: row.revenue,
    })),
    []
  );

  // Prepare transposed data for the table
  const revenueRow = dataWithGrowth.map(row => row.revenue);
  const growthRow = dataWithGrowth.map(row => row.growth == null ? null : row.growth);
  const callsRow = dataWithGrowth.map(row => row.calls);
  const salesRow = dataWithGrowth.map(row => row.sales);

  return (
    <main className="flex flex-col w-full max-w-full px-0 bg-gray-50 font-sans">
      <div className="mb-8 flex items-center justify-between w-full max-w-full">
        <Title className="text-2xl font-semibold text-gray-900 mb-2">Business Performance</Title>
        {/* Date Range Selector */}
        <Menu as="div" className="relative inline-block text-left">
          <div>
            <Menu.Button
              className="flex items-center border border-gray-200 rounded-md px-4 py-2 bg-white text-gray-900 font-semibold text-base shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              onClick={() => setShowCalendar((v) => !v)}
            >
              {formatRange(dateRange.from, dateRange.to)}
              <ChevronDown className="ml-2 w-4 h-4" />
            </Menu.Button>
          </div>
          {showCalendar && (
            <Menu.Items static className="absolute right-0 mt-2 w-[420px] rounded-xl bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50 p-6">
              <div className="flex flex-col gap-4">
                <div className="flex gap-4 mb-2">
                  {quickRanges.map((range) => (
                    <button
                      key={range.label}
                      className="text-xs font-bold px-2 py-1 rounded hover:bg-gray-100 text-gray-700"
                      onClick={() => {
                        if (range.days) {
                          setDateRange({ from: subMonths(new Date(), Math.floor(range.days / 30)), to: new Date() });
                        } else if (range.ytd) {
                          setDateRange({ from: new Date(new Date().getFullYear(), 0, 1), to: new Date() });
                        } else if (range.all) {
                          setDateRange({ from: new Date(2020, 0, 1), to: new Date() });
                        }
                        setShowCalendar(false);
                      }}
                    >
                      {range.label}
                    </button>
                  ))}
                </div>
                {/* Calendar UI placeholder */}
                <div className="flex gap-8">
                  <div>
                    <div className="text-center text-xs font-bold mb-2">Mar 2025</div>
                    <div className="grid grid-cols-7 gap-1 text-xs text-gray-400 mb-1">
                      <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-xs">
                      {/* Render days for left calendar (placeholder) */}
                      {[...Array(35)].map((_, i) => (
                        <span key={i} className="w-6 h-6 flex items-center justify-center rounded cursor-pointer hover:bg-emerald-100">{i < 7 ? '' : i - 6}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-center text-xs font-bold mb-2">Jun 2025</div>
                    <div className="grid grid-cols-7 gap-1 text-xs text-gray-400 mb-1">
                      <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-xs">
                      {/* Render days for right calendar (placeholder) */}
                      {[...Array(35)].map((_, i) => (
                        <span key={i} className="w-6 h-6 flex items-center justify-center rounded cursor-pointer hover:bg-emerald-100">{i < 7 ? '' : i - 6}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </Menu.Items>
          )}
        </Menu>
      </div>
      {/* Granularity selector */}
      <div className="flex gap-2 bg-gray-100 rounded-xl px-2 py-1 mb-6 w-full max-w-full">
        {['DAY', 'WEEK', 'MONTH', 'QUARTER', 'YEAR'].map((g) => (
          <button
            key={g}
            className={`text-sm font-bold px-3 py-1 rounded ${g === 'MONTH' ? 'bg-gray-400 text-white' : 'text-gray-700 hover:bg-gray-200'}`}
          >
            {g}
          </button>
        ))}
      </div>
      <div className="bg-white rounded-xl shadow-soft p-6 mb-8 w-full max-w-full">
        <div className="h-72 w-full max-w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ReAreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#077848" stopOpacity={0.7}/>
                  <stop offset="95%" stopColor="#077848" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="month" tick={{ fontSize: 13, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 13, fill: '#6b7280' }} axisLine={false} tickLine={false} width={60} tickFormatter={v => `$${v}`}/>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <Tooltip formatter={v => `$${v.toLocaleString()}`}/>
              <Area type="monotone" dataKey="Revenue" stroke="#077848" fillOpacity={1} fill="url(#colorRevenue)" />
            </ReAreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-soft p-6 w-full max-w-full">
        <Title className="text-lg font-semibold text-gray-900 mb-4">Monthly Metrics</Title>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 w-full max-w-full">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="text-gray-600 font-semibold px-3 py-2 text-sm text-left whitespace-nowrap">Metric</th>
                {months.map(month => (
                  <th key={month} className="text-gray-600 font-semibold px-3 py-2 text-sm text-center whitespace-nowrap">{month}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="font-medium text-gray-800 px-3 py-2 text-sm whitespace-nowrap">Revenue</td>
                {revenueRow.map((val, i) => (
                  <td key={i} className="text-gray-900 text-center px-3 py-2 text-sm whitespace-nowrap">${val.toLocaleString()}</td>
                ))}
              </tr>
              <tr>
                <td className="font-medium text-gray-800 px-3 py-2 text-sm whitespace-nowrap">Revenue Growth %</td>
                {growthRow.map((val, i) => (
                  <td key={i} className={val == null ? 'text-gray-400 text-center px-3 py-2 text-sm whitespace-nowrap' : val >= 0 ? 'text-emerald-700 text-center px-3 py-2 text-sm whitespace-nowrap' : 'text-red-600 text-center px-3 py-2 text-sm whitespace-nowrap'}>
                    {val == null ? '--' : `${val > 0 ? '+' : ''}${val.toFixed(1)}%`}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="font-medium text-gray-800 px-3 py-2 text-sm whitespace-nowrap">Total Calls Booked</td>
                {callsRow.map((val, i) => (
                  <td key={i} className="text-gray-700 text-center px-3 py-2 text-sm whitespace-nowrap">{val}</td>
                ))}
              </tr>
              <tr>
                <td className="font-medium text-gray-800 px-3 py-2 text-sm whitespace-nowrap">Total Sales</td>
                {salesRow.map((val, i) => (
                  <td key={i} className="text-gray-700 text-center px-3 py-2 text-sm whitespace-nowrap">{val}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}