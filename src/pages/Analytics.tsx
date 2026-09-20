import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  TrendingUp,
  Activity,
  CreditCard,
  ArrowUpRight,
  Eye,
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Table, Column } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { LoadingState } from '../components/ui/LoadingState';
import { analyticsService } from '../services/analyticsService';
import { DashboardStats, Card, DailyScanStat } from '../types';
import { formatDate } from '../utils';

export const Analytics: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [trendData, setTrendData] = useState<DailyScanStat[]>([]);
  const [topCards, setTopCards] = useState<Card[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [statsData, trend, top] = await Promise.all([
        analyticsService.getDashboardStats(),
        analyticsService.getDailyScanTrend(),
        analyticsService.getMostScannedCards(10),
      ]);
      setStats(statsData);
      setTrendData(trend);
      setTopCards(top);
    } catch (err) {
      console.error('Error loading analytics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (isLoading || !stats) {
    return <LoadingState message="Calculating analytics metrics..." />;
  }

  // Chart max value calculation
  const maxScan = Math.max(...trendData.map(d => d.scans), 10);

  const topCardsColumns: Column<Card>[] = [
    {
      header: 'Rank',
      cell: (_item) => null, // filled below
    },
    {
      header: 'Card Number',
      accessorKey: 'internal_card_no',
      cell: card => (
        <span className="font-mono font-bold text-slate-900">{card.internal_card_no}</span>
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
      header: 'Total Scans',
      accessorKey: 'total_scans',
      cell: card => (
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-slate-900 bg-brand-50 text-brand-800 px-2 py-0.5 rounded">
            {card.total_scans}
          </span>
          <div className="w-16 bg-slate-100 h-2 rounded-full overflow-hidden hidden sm:block">
            <div
              className="bg-brand-500 h-full rounded-full"
              style={{ width: `${Math.min(100, (card.total_scans / (topCards[0]?.total_scans || 1)) * 100)}%` }}
            />
          </div>
        </div>
      ),
    },
    {
      header: 'Created',
      accessorKey: 'created_at',
      cell: card => <span className="text-xs text-slate-500">{formatDate(card.created_at)}</span>,
    },
    {
      header: 'Actions',
      cell: card => (
        <button
          onClick={() => navigate(`/cards/${card.id}`)}
          className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-slate-100 rounded-md transition-colors"
          title="View Card Details"
        >
          <Eye className="w-4 h-4" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics & Scan Performance"
        description="Monitor physical NFC & QR tap engagement, daily redirect throughput, and top-performing client cards."
      />

      {/* Top 4 Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Lifetime Scans"
          value={stats.totalScans}
          icon={Activity}
          change="+18.4% vs last month"
          changeType="positive"
          subtitle="All recorded card interactions"
          iconBg="bg-brand-50"
          iconColor="text-brand-600"
        />
        <StatCard
          title="Today's Scans"
          value={stats.scansToday}
          icon={TrendingUp}
          change="+8.2% vs yesterday"
          changeType="positive"
          subtitle="Active real-time taps"
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
        />
        <StatCard
          title="Active Cards in Circulation"
          value={stats.activeCards}
          icon={CreditCard}
          subtitle="Ready, printed, or sold"
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
          onClick={() => navigate('/cards')}
        />
        <StatCard
          title="Avg Scans / Card"
          value={(stats.totalScans / Math.max(1, stats.totalCards)).toFixed(1)}
          icon={BarChart3}
          subtitle="Customer engagement density"
          iconBg="bg-indigo-50"
          iconColor="text-indigo-600"
        />
      </div>

      {/* 14-Day Daily Scan Trend Bar Chart (Clean Responsive SVG) */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-brand-600" />
              14-Day Scan Traffic Trend
            </h3>
            <p className="text-xs text-slate-500">Daily NFC taps & QR scan redirection traffic</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <span className="w-3 h-3 rounded-sm bg-brand-500 inline-block" />
            <span>Redirect Scans</span>
          </div>
        </div>

        {/* SVG/Bar Visualization */}
        <div className="pt-4">
          <div className="h-56 flex items-end gap-2 sm:gap-4 border-b border-slate-200 pb-2 px-2">
            {trendData.map((item, idx) => {
              const heightPct = Math.max(8, (item.scans / maxScan) * 100);
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group relative">
                  {/* Tooltip on hover */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 bg-slate-900 text-white text-[10px] font-mono py-1 px-2 rounded pointer-events-none whitespace-nowrap z-10">
                    {item.scans} scans ({item.date})
                  </div>
                  <div
                    className="w-full bg-brand-500/80 hover:bg-brand-600 rounded-t-md transition-all duration-300 shadow-xs"
                    style={{ height: `${heightPct}%` }}
                  />
                  <span className="text-[10px] text-slate-400 font-medium truncate w-full text-center hidden sm:block">
                    {item.date}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Top Performing Cards Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Most Scanned Cards</h3>
            <p className="text-xs text-slate-500">Highest volume physical cards ranked by user engagement</p>
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
          columns={topCardsColumns.map((col, index) =>
            index === 0
              ? {
                  header: 'Rank',
                  cell: (_, rIdx = 0) => (
                    <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center font-mono">
                      #{rIdx + 1}
                    </span>
                  ),
                }
              : col
          )}
          data={topCards}
          keyExtractor={c => c.id}
          onRowClick={c => navigate(`/cards/${c.id}`)}
        />
      </div>
    </div>
  );
};
