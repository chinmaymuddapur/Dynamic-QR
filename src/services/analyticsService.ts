import { DashboardStats, Card, Client, ActivityLog, DailyScanStat } from '../types';
import { db } from './storage';

export const analyticsService = {
  async getDashboardStats(): Promise<DashboardStats> {
    const cards = db.getCards();

    const totalCards = cards.length;
    const activeCards = cards.filter(c => ['Ready', 'Printed', 'Delivered', 'Sold'].includes(c.status)).length;
    const linkPending = cards.filter(c => c.status === 'Link Pending').length;
    const printed = cards.filter(c => c.status === 'Printed').length;
    const delivered = cards.filter(c => c.status === 'Delivered').length;
    const sold = cards.filter(c => c.status === 'Sold').length;
    const disabled = cards.filter(c => c.status === 'Disabled').length;
    const totalScans = cards.reduce((acc, c) => acc + (c.total_scans || 0), 0);

    // Mock today's scans: ~8% of total scans or dynamic sum
    const scansToday = Math.max(12, Math.round(totalScans * 0.08));

    return {
      totalCards,
      activeCards,
      linkPending,
      printed,
      delivered,
      sold,
      disabled,
      totalScans,
      scansToday,
    };
  },

  async getRecentCards(limit = 5): Promise<Card[]> {
    const cards = db.getCards();
    return [...cards].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, limit);
  },

  async getRecentClients(limit = 5): Promise<Client[]> {
    const clients = db.getClients();
    return [...clients].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, limit);
  },

  async getRecentActivity(limit = 10): Promise<ActivityLog[]> {
    const activity = db.getActivity();
    return activity.slice(0, limit);
  },

  async getMostScannedCards(limit = 6): Promise<Card[]> {
    const cards = db.getCards();
    return [...cards].sort((a, b) => (b.total_scans || 0) - (a.total_scans || 0)).slice(0, limit);
  },

  async getDailyScanTrend(): Promise<DailyScanStat[]> {
    // Generate 14 days of realistic scan trend data
    const days: DailyScanStat[] = [];
    const baseDate = new Date();
    const mockPatterns = [18, 25, 31, 28, 45, 52, 48, 39, 42, 58, 64, 61, 72, 85];

    for (let i = 13; i >= 0; i--) {
      const d = new Date(baseDate);
      d.setDate(d.getDate() - i);
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      days.push({
        date: label,
        scans: mockPatterns[13 - i] || Math.floor(Math.random() * 40) + 20,
      });
    }

    return days;
  },
};
