export interface TrackableLink {
  id: string;
  user_id: string;
  short_code: string;
  destination_url: string;
  title: string;
  platform: 'YouTube' | 'Instagram';
  attribution_window_days: number;
  created_at: string;
}

export interface Click {
  id: string;
  short_code: string;
  timestamp: string;
  ip_address: string;
  user_agent: string;
  referrer: string;
  location: string;
  session_id: string;
}

export interface Call {
  id: string;
  short_code: string;
  timestamp: string;
  event_id: string;
  calendly_email: string;
}

export interface Sale {
  id: string;
  short_code: string;
  timestamp: string;
  amount: number;
  currency: string;
  stripe_customer_id: string;
}

export interface LinkStats {
  clicks: number;
  calls: number;
  sales: number;
  revenue: number;
} 