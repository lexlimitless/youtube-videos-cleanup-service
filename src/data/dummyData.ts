import { format, subDays } from 'date-fns';
import { ChartDataPoint, ContentItem, MetricSummary } from '../types/dashboard';

// Generate realistic daily data for the past 30 days
export const generateChartData = (): ChartDataPoint[] => {
  return Array.from({ length: 30 }, (_, i) => {
    const date = subDays(new Date(), 29 - i);
    const dayOfWeek = date.getDay();
    // Simulate weekly patterns (lower on weekends)
    const multiplier = dayOfWeek === 0 || dayOfWeek === 6 ? 0.6 : 1;
    
    // Add some randomness but maintain a general upward trend
    const trendFactor = 1 + (i * 0.02);
    
    return {
      date: format(date, 'MMM dd'),
      Revenue: Math.floor((Math.random() * 2000 + 3000) * multiplier * trendFactor),
      Clicks: Math.floor((Math.random() * 50 + 70) * multiplier * trendFactor),
      Calls: Math.floor((Math.random() * 8 + 12) * multiplier * trendFactor),
      Sales: Math.floor((Math.random() * 4 + 6) * multiplier * trendFactor),
    };
  });
};

// Generate table data with realistic content
export const tableData: ContentItem[] = [
  {
    platform: 'YouTube',
    title: 'How I Made $10K with a Podcast',
    tag: 'YT-10K-Podcast',
    clicks: 324,
    calls: 12,
    sales: 7,
    revenue: 2800,
    createdDate: '2025-06-01',
  },
  {
    platform: 'Instagram',
    title: 'IG Bio Link – June 2025',
    tag: 'IG-June25',
    clicks: 411,
    calls: 10,
    sales: 6,
    revenue: 2100,
    createdDate: '2025-06-03',
  },
  {
    platform: 'YouTube',
    title: 'Top 5 Business Automation Tools',
    tag: 'YT-automation-tools',
    clicks: 567,
    calls: 15,
    sales: 9,
    revenue: 3600,
    createdDate: '2025-05-28',
  },
  {
    platform: 'Instagram',
    title: 'Summer Sale Collection',
    tag: 'IG-summer-sale',
    clicks: 289,
    calls: 8,
    sales: 5,
    revenue: 1750,
    createdDate: '2025-06-05',
  },
  {
    platform: 'YouTube',
    title: 'Client Success Story: From $0 to $50K',
    tag: 'YT-success-story',
    clicks: 892,
    calls: 25,
    sales: 14,
    revenue: 5600,
    createdDate: '2025-05-15',
  },
  {
    platform: 'Instagram',
    title: 'Free Consultation Offer',
    tag: 'IG-free-consult',
    clicks: 378,
    calls: 18,
    sales: 8,
    revenue: 3200,
    createdDate: '2025-06-02',
  },
  {
    platform: 'YouTube',
    title: 'Marketing Strategy Masterclass',
    tag: 'YT-marketing-class',
    clicks: 645,
    calls: 20,
    sales: 12,
    revenue: 4800,
    createdDate: '2025-05-20',
  },
  {
    platform: 'Instagram',
    title: 'Limited Time Discount',
    tag: 'IG-limited-offer',
    clicks: 523,
    calls: 14,
    sales: 9,
    revenue: 3150,
    createdDate: '2025-06-04',
  },
];

// Calculate summary metrics
export const calculateMetrics = (): MetricSummary[] => {
  const totalRevenue = tableData.reduce((sum, item) => sum + item.revenue, 0);
  const totalClicks = tableData.reduce((sum, item) => sum + item.clicks, 0);
  const totalCalls = tableData.reduce((sum, item) => sum + item.calls, 0);
  const totalSales = tableData.reduce((sum, item) => sum + item.sales, 0);

  // Simulate previous period with slight variations
  const prevPeriodMultiplier = 0.85; // Simulating 15% growth

  return [
    {
      title: 'Revenue',
      value: `$${totalRevenue.toLocaleString()}`,
      change: '+17.6%',
      icon: '💰',
      prevValue: totalRevenue * prevPeriodMultiplier,
    },
    {
      title: 'Clicks',
      value: totalClicks.toLocaleString(),
      change: '+23.1%',
      icon: '🔗',
      prevValue: totalClicks * prevPeriodMultiplier,
    },
    {
      title: 'Calls',
      value: totalCalls.toLocaleString(),
      change: '+15.8%',
      icon: '📞',
      prevValue: totalCalls * prevPeriodMultiplier,
    },
    {
      title: 'Sales',
      value: totalSales.toLocaleString(),
      change: '+19.2%',
      icon: '🛍️',
      prevValue: totalSales * prevPeriodMultiplier,
    },
  ];
}; 