export interface ContentItem {
  platform: 'YouTube' | 'Instagram';
  title: string;
  tag: string;
  clicks: number;
  calls: number;
  sales: number;
  revenue: number;
  createdDate: string;
}

export interface ChartDataPoint {
  date: string;
  Revenue: number;
  Clicks: number;
  Calls: number;
  Sales: number;
}

export interface MetricSummary {
  title: string;
  value: string;
  change: string;
  icon: string;
  prevValue: number;
}

export type SortField = 'clicks' | 'calls' | 'sales' | 'revenue';
export type SortDirection = 'asc' | 'desc';
export type Platform = 'All' | 'YouTube' | 'Instagram';
export type Metric = 'Revenue' | 'Clicks' | 'Calls' | 'Sales'; 