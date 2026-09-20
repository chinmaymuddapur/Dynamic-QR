import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CreditCard,
  Layers,
  Activity,
  CheckCircle2,
  Clock,
  Printer,
  Truck,
  ShoppingBag,
  Ban,
  ArrowUpRight,
  Plus,
  QrCode,
  Building2,
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Table, Column } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { LoadingState } from '../components/ui/LoadingState';
import { analyticsService } from '../services/analyticsService';
import { DashboardStats, Card, Client, ActivityLog } from '../types';
import { formatDate, formatRelativeTime } from '../utils';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentCards, setRecentCards] = useState<Card[]>([]);
  const [recentClients, setRecentClients] = useState<Client[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [statsData, cardsData, clientsData, actData] = await Promise.all([
        analyticsService.getDashboardStats(),
        analyticsService.getRecentCards(5),
        analyticsService.getRecentClients(4),
        analyticsService.getRecentActivity(6),
      ]);
      setStats(statsData);
      setRecentCards(cardsData);
      setRecentClients(clientsData);
      setActivityLogs(actData);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (isLoading || !stats) {
    return <LoadingState message="Loading dashboard metrics & live stats..." />;
  }

  const cardColumns: Column<Card>[] = [
    {
      header: 'Card Number',
      accessorKey: 'internal_card_no',
      cell: card => (
        <div className="flex items-center gap-2">
          <span className="font-mono font-semibold text-slate-900">{card.internal_card_no}</span>
          <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
            {card.public_token}
          </span>
        </div>
      ),
    },
    {
      header: 'Client',
      accessorKey: 'client_name',
      cell: card => <span className="font-medium text-slate-800">{card.client_name || '—'}</span>,
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: card => <StatusBadge status={card.status} type="card" size="sm" />,
    },
    {
      header: 'Scans',
      accessorKey: 'total_scans',
      cell: card => (
        <span className="font-mono font-medium text-slate-700">{card.total_scans || 0}</span>
      ),
    },
    {
      header: 'Created',
      accessorKey: 'created_at',
      cell: card => <span className="text-slate-500 text-xs">{formatDate(card.created_at)}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Admin CRM Dashboard"
        description="Real-time status overview of dynamic PVC cards, client allocations, and scan activity."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/qr-generator')}
              leftIcon={<QrCode className="w-4 h-4" />}
            >
              QR Generator
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/batches')}
              leftIcon={<Layers className="w-4 h-4" />}
            >
              New Batch
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/clients')}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Add Client
            </Button>
          </div>
        }
      />

      {/* Primary Key Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Cards"
          value={stats.totalCards}
          icon={CreditCard}
          subtitle="All generated PVC units"
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
          onClick={() => navigate('/cards')}
        />
        <StatCard
          title="Active Cards"
          value={stats.activeCards}
          icon={CheckCircle2}
          change="+12% this week"
          changeType="positive"
          subtitle="Ready, printed, or active"
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          onClick={() => navigate('/cards')}
        />
        <StatCard
          title="Total Scans"
          value={stats.totalScans}
          icon={Activity}
          change={`+${stats.scansToday} today`}
          changeType="positive"
          subtitle="Dynamic redirect events"
          iconBg="bg-brand-50"
          iconColor="text-brand-600"
          onClick={() => navigate('/analytics')}
        />
        <StatCard
          title="Link Pending"
          value={stats.linkPending}
          icon={Clock}
          subtitle="Awaiting review link setup"
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
          onClick={() => navigate('/cards')}
        />
      </div>

      {/* Status Breakdown Secondary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3 p-2 rounded-lg bg-indigo-50/50">
          <div className="p-2 rounded-lg bg-indigo-100 text-indigo-700">
            <Printer className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs text-indigo-900 font-medium">Printed</div>
            <div className="text-lg font-bold text-indigo-950 font-mono">{stats.printed}</div>
          </div>
        </div>

        <div className="flex items-center gap-3 p-2 rounded-lg bg-teal-50/50">
          <div className="p-2 rounded-lg bg-teal-100 text-teal-700">
            <Truck className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs text-teal-900 font-medium">Delivered</div>
            <div className="text-lg font-bold text-teal-950 font-mono">{stats.delivered}</div>
          </div>
        </div>

        <div className="flex items-center gap-3 p-2 rounded-lg bg-emerald-50/50">
          <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
            <ShoppingBag className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs text-emerald-900 font-medium">Sold</div>
            <div className="text-lg font-bold text-emerald-950 font-mono">{stats.sold}</div>
          </div>
        </div>

        <div className="flex items-center gap-3 p-2 rounded-lg bg-rose-50/50">
          <div className="p-2 rounded-lg bg-rose-100 text-rose-700">
            <Ban className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs text-rose-900 font-medium">Disabled</div>
            <div className="text-lg font-bold text-rose-950 font-mono">{stats.disabled}</div>
          </div>
        </div>
      </div>

      {/* 2-Column Section: Recent Cards & Right Panel (Recent Clients + Activity) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Recent Cards Table */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Recent Cards</h2>
              <p className="text-xs text-slate-500">Latest PVC card entries in circulation</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/cards')}
              rightIcon={<ArrowUpRight className="w-3.5 h-3.5" />}
            >
              View All Cards
            </Button>
          </div>

          <Table
            columns={cardColumns}
            data={recentCards}
            keyExtractor={card => card.id}
            onRowClick={card => navigate(`/cards/${card.id}`)}
          />
        </div>

        {/* Right 1 Col: Recent Clients & Activity Feed */}
        <div className="space-y-6">
          {/* Recent Clients */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-brand-600" />
                Recent Clients
              </h3>
              <Button variant="ghost" size="sm" onClick={() => navigate('/clients')} className="text-xs">
                View All
              </Button>
            </div>
            <div className="space-y-3">
              {recentClients.map(client => (
                <div
                  key={client.id}
                  onClick={() => navigate('/clients')}
                  className="p-2.5 rounded-lg border border-slate-100 hover:border-slate-200 hover:bg-slate-50/60 cursor-pointer transition-colors flex items-center justify-between"
                >
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-semibold text-slate-900 truncate">{client.business_name}</p>
                    <p className="text-[11px] text-slate-500 truncate">{client.contact_name}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-mono font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                      {client.card_count || 0} cards
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity Log */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-brand-600" />
              Recent Activity
            </h3>
            <div className="space-y-3.5">
              {activityLogs.map(log => (
                <div key={log.id} className="flex items-start gap-2.5 text-xs">
                  <div className="w-2 h-2 rounded-full bg-brand-500 shrink-0 mt-1.5" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 leading-tight">{log.action}</p>
                    <p className="text-slate-500 text-[11px] mt-0.5 leading-snug">{log.description}</p>
                    <span className="text-[10px] text-slate-400 font-mono mt-1 block">
                      {formatRelativeTime(log.timestamp)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
