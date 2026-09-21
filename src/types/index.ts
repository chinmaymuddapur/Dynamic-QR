export type CardStatus =
  | 'Draft'
  | 'Link Pending'
  | 'Ready'
  | 'Printed'
  | 'Delivered'
  | 'Sold'
  | 'Disabled'
  | 'Archived';

export type ClientStatus = 'Active' | 'Inactive' | 'Archived';

export type BatchStatus = 'Draft' | 'Processing' | 'Completed' | 'Archived';

export interface Client {
  id: string;
  business_name: string;
  contact_name: string;
  phone: string;
  email: string;
  notes?: string;
  status: ClientStatus;
  created_at: string;
  card_count?: number;
}

export interface Batch {
  id: string;
  client_id: string;
  client_name?: string;
  batch_name: string;
  quantity: number;
  status: BatchStatus;
  destination_url?: string;
  created_at: string;
}

export interface Card {
  id: string;
  internal_card_no: string;
  public_token: string;
  client_id?: string;
  client_name?: string;
  batch_id?: string;
  batch_name?: string;
  original_url?: string;
  destination_url: string;
  status: CardStatus;
  scan_count?: number;
  total_scans: number;
  dynamic_url?: string;
  created_at: string;
  updated_at: string;
}

export interface ActivityLog {
  id: string;
  action: string;
  description: string;
  timestamp: string;
  type: 'card' | 'client' | 'batch' | 'destination' | 'status';
  entity_id?: string;
}

export interface DailyScanStat {
  date: string;
  scans: number;
}

export interface DashboardStats {
  totalCards: number;
  activeCards: number;
  linkPending: number;
  printed: number;
  delivered: number;
  sold: number;
  disabled: number;
  totalScans: number;
  scansToday: number;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'Super Admin' | 'Admin' | 'Manager';
  avatar_url?: string;
}
