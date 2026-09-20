import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CreditCard,
  Copy,
  Eye,
  Edit2,
  QrCode,
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Table, Column } from '../components/ui/Table';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import { SearchInput } from '../components/ui/SearchInput';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingState } from '../components/ui/LoadingState';
import { cardService } from '../services/cardService';
import { clientService } from '../services/clientService';
import { Card, CardStatus, Client } from '../types';
import { formatDate, getDynamicUrl, copyToClipboard } from '../utils';
import { ALL_CARD_STATUSES } from '../lib/constants';
import { useToast } from '../hooks/useToast';

export const Cards: React.FC = () => {
  const navigate = useNavigate();
  const { success, error } = useToast();
  const [cards, setCards] = useState<Card[]>([]);
  const [filteredCards, setFilteredCards] = useState<Card[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [clientFilter, setClientFilter] = useState<string>('all');

  // Modal for Edit Destination / Status Change
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editDestinationUrl, setEditDestinationUrl] = useState('');
  const [editStatus, setEditStatus] = useState<CardStatus>('Ready');
  const [isSaving, setIsSaving] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [cardsData, clientsData] = await Promise.all([
        cardService.getCards(),
        clientService.getClients(),
      ]);
      setCards(cardsData);
      setClients(clientsData);
    } catch (err) {
      error('Failed to load cards', (err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter effect
  useEffect(() => {
    let result = [...cards];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        c =>
          c.internal_card_no.toLowerCase().includes(q) ||
          c.public_token.toLowerCase().includes(q) ||
          (c.client_name && c.client_name.toLowerCase().includes(q)) ||
          c.destination_url.toLowerCase().includes(q)
      );
    }

    if (statusFilter !== 'all') {
      result = result.filter(c => c.status === statusFilter);
    }

    if (clientFilter !== 'all') {
      result = result.filter(c => c.client_id === clientFilter);
    }

    setFilteredCards(result);
  }, [cards, searchQuery, statusFilter, clientFilter]);

  const handleCopy = async (card: Card, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = getDynamicUrl(card.public_token);
    const copied = await copyToClipboard(url);
    if (copied) {
      success('Copied Dynamic URL', url);
    } else {
      error('Failed to copy URL');
    }
  };

  const handleOpenEdit = (card: Card, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedCard(card);
    setEditDestinationUrl(card.destination_url);
    setEditStatus(card.status);
    setIsEditModalOpen(true);
  };

  const handleSaveCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCard) return;

    setIsSaving(true);
    try {
      if (editDestinationUrl !== selectedCard.destination_url) {
        await cardService.updateCardDestination(selectedCard.id, editDestinationUrl);
      }
      if (editStatus !== selectedCard.status) {
        await cardService.updateCardStatus(selectedCard.id, editStatus);
      }
      success('Card Updated', `Saved destination and status for ${selectedCard.internal_card_no}`);
      setIsEditModalOpen(false);
      await loadData();
    } catch (err) {
      error('Update failed', (err as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  const columns: Column<Card>[] = [
    {
      header: 'Card Number',
      accessorKey: 'internal_card_no',
      cell: card => (
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-slate-900">{card.internal_card_no}</span>
        </div>
      ),
    },
    {
      header: 'Client',
      accessorKey: 'client_name',
      cell: card => (
        <span className="font-medium text-slate-800">{card.client_name || 'Unassigned'}</span>
      ),
    },
    {
      header: 'Public Token',
      accessorKey: 'public_token',
      cell: card => (
        <span className="inline-flex items-center px-2 py-0.5 rounded font-mono text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
          {card.public_token}
        </span>
      ),
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: card => <StatusBadge status={card.status} type="card" size="sm" />,
    },
    {
      header: 'Destination (Google Review)',
      accessorKey: 'destination_url',
      cell: card => (
        <div className="max-w-xs truncate text-xs font-mono text-slate-500" title={card.destination_url}>
          {card.destination_url}
        </div>
      ),
    },
    {
      header: 'Scans',
      accessorKey: 'total_scans',
      cell: card => (
        <span className="font-mono font-bold text-slate-900 px-2 py-0.5 bg-slate-50 rounded">
          {card.total_scans || 0}
        </span>
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
        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
          <button
            onClick={e => handleCopy(card, e)}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
            title="Copy Dynamic URL"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigate(`/cards/${card.id}`)}
            className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-slate-100 rounded-md transition-colors"
            title="View Card Details"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={e => handleOpenEdit(card, e)}
            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-md transition-colors"
            title="Quick Edit Destination / Status"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cards Inventory"
        description="Search, view, configure destinations, and update status for all dynamic PVC cards."
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
              variant="primary"
              size="sm"
              onClick={() => navigate('/batches')}
              leftIcon={<CreditCard className="w-4 h-4" />}
            >
              Generate Batch
            </Button>
          </div>
        }
      />

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Search */}
          <div className="sm:col-span-1">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search card #, token, client..."
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full text-sm py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="all">All Card Statuses ({cards.length})</option>
              {ALL_CARD_STATUSES.map(st => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          {/* Client Filter */}
          <div>
            <select
              value={clientFilter}
              onChange={e => setClientFilter(e.target.value)}
              className="w-full text-sm py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="all">All Clients ({clients.length})</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>
                  {c.business_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filter Summary Count */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
          <span>
            Showing <strong className="text-slate-800">{filteredCards.length}</strong> of{' '}
            <strong className="text-slate-800">{cards.length}</strong> total cards
          </span>
          {(searchQuery || statusFilter !== 'all' || clientFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
                setClientFilter('all');
              }}
              className="text-brand-600 hover:text-brand-800 font-medium"
            >
              Reset filters
            </button>
          )}
        </div>
      </div>

      {/* Cards Table */}
      {isLoading ? (
        <LoadingState message="Loading card records..." />
      ) : (
        <Table
          columns={columns}
          data={filteredCards}
          keyExtractor={c => c.id}
          onRowClick={c => navigate(`/cards/${c.id}`)}
          emptyState={
            <EmptyState
              icon={CreditCard}
              title="No cards found"
              description={
                searchQuery || statusFilter !== 'all' || clientFilter !== 'all'
                  ? 'No cards match your current search and filter criteria.'
                  : 'No cards in inventory yet. Create your first batch to generate cards.'
              }
              actionLabel={
                searchQuery || statusFilter !== 'all' || clientFilter !== 'all'
                  ? undefined
                  : 'Generate Card Batch'
              }
              onAction={() => navigate('/batches')}
              actionIcon={<CreditCard className="w-4 h-4" />}
            />
          }
        />
      )}

      {/* Quick Edit Modal */}
      {selectedCard && (
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title={`Edit ${selectedCard.internal_card_no}`}
          description={`Update destination URL or status for token ${selectedCard.public_token}`}
          maxWidth="md"
        >
          <form onSubmit={handleSaveCard} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Permanent Dynamic URL (NFC & QR payload)
              </label>
              <div className="p-2.5 rounded-lg bg-slate-100 border border-slate-200 text-xs font-mono text-slate-700 flex items-center justify-between">
                <span>{getDynamicUrl(selectedCard.public_token)}</span>
                <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded uppercase font-sans">
                  Fixed
                </span>
              </div>
            </div>

            <div>
              <Input
                label="Destination URL (Google Review Link)"
                type="url"
                required
                value={editDestinationUrl}
                onChange={e => setEditDestinationUrl(e.target.value)}
                helperText="Where users are forwarded when accessing the dynamic link"
              />
            </div>

            <div>
              <Select
                label="Card Lifecycle Status"
                value={editStatus}
                onChange={e => setEditStatus(e.target.value as CardStatus)}
                options={ALL_CARD_STATUSES.map(st => ({ value: st, label: st }))}
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditModalOpen(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" isLoading={isSaving}>
                Save Changes
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
