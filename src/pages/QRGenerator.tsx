import React, { useState, useEffect, useRef } from 'react';
import { QRCodeCanvas, QRCodeSVG } from 'qrcode.react';
import {
  Download,
  Copy,
  Layers,
  CreditCard,
  CheckCircle2,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { LoadingState } from '../components/ui/LoadingState';
import { cardService } from '../services/cardService';
import { batchService } from '../services/batchService';
import { Card, Batch } from '../types';
import { getDynamicUrl, copyToClipboard } from '../utils';
import { useToast } from '../hooks/useToast';

export const QRGenerator: React.FC = () => {
  const { success, error, info } = useToast();
  const [activeTab, setActiveTab] = useState<'single' | 'batch'>('single');
  const [cards, setCards] = useState<Card[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Single card mode state
  const [selectedCardId, setSelectedCardId] = useState<string>('');
  const [customToken, setCustomToken] = useState<string>('');
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);

  // Batch mode state
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [isBulkExporting, setIsBulkExporting] = useState<boolean>(false);

  const singleCanvasRef = useRef<HTMLDivElement>(null);
  const singleSvgRef = useRef<HTMLDivElement>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [cardsData, batchesData] = await Promise.all([
        cardService.getCards(),
        batchService.getBatches(),
      ]);
      setCards(cardsData);
      setBatches(batchesData);

      if (cardsData.length > 0) {
        setSelectedCardId(cardsData[0].id);
      }
      if (batchesData.length > 0) {
        setSelectedBatchId(batchesData[0].id);
      }
    } catch (err) {
      error('Failed to load data', (err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const selectedCard = cards.find(c => c.id === selectedCardId);
  const tokenToUse = isCustomMode ? customToken.toUpperCase() : selectedCard?.public_token || '7KQ4M8X2';
  const cardNoToUse = isCustomMode ? 'CUSTOM' : selectedCard?.internal_card_no || 'CARD-0001';
  const dynamicUrl = getDynamicUrl(tokenToUse);

  const handleCopy = async () => {
    const ok = await copyToClipboard(dynamicUrl);
    if (ok) {
      success('Copied Dynamic URL', dynamicUrl);
    }
  };

  const downloadSinglePNG = (cardNo = cardNoToUse) => {
    const canvas = singleCanvasRef.current?.querySelector('canvas');
    if (!canvas) {
      error('QR canvas unavailable');
      return;
    }
    const link = document.createElement('a');
    link.download = `${cardNo}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    success(`Downloaded ${cardNo}.png`);
  };

  const downloadSingleSVG = (cardNo = cardNoToUse) => {
    const svg = singleSvgRef.current?.querySelector('svg');
    if (!svg) {
      error('QR svg unavailable');
      return;
    }
    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);
    const link = document.createElement('a');
    link.download = `${cardNo}.svg`;
    link.href = svgUrl;
    link.click();
    URL.revokeObjectURL(svgUrl);
    success(`Downloaded ${cardNo}.svg`);
  };

  // Batch Cards
  const batchCards = selectedBatchId ? cards.filter(c => c.batch_id === selectedBatchId) : [];

  const handleDownloadBatchCard = (card: Card, format: 'png' | 'svg') => {
    const element = document.getElementById(`batch-qr-${card.id}`);
    if (!element) return;

    if (format === 'png') {
      const canvas = element.querySelector('canvas');
      if (canvas) {
        const link = document.createElement('a');
        link.download = `${card.internal_card_no}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        success(`Downloaded ${card.internal_card_no}.png`);
      }
    } else {
      const svg = element.querySelector('svg');
      if (svg) {
        const svgData = new XMLSerializer().serializeToString(svg);
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const svgUrl = URL.createObjectURL(svgBlob);
        const link = document.createElement('a');
        link.download = `${card.internal_card_no}.svg`;
        link.href = svgUrl;
        link.click();
        URL.revokeObjectURL(svgUrl);
        success(`Downloaded ${card.internal_card_no}.svg`);
      }
    }
  };

  const handleExportAllBatchSVGs = async () => {
    if (batchCards.length === 0) return;
    setIsBulkExporting(true);
    info('Exporting Batch SVGs', `Downloading ${batchCards.length} vector QR assets...`);

    for (let i = 0; i < batchCards.length; i++) {
      const card = batchCards[i];
      handleDownloadBatchCard(card, 'svg');
      // small delay to prevent browser download throttling
      await new Promise(res => setTimeout(res, 200));
    }

    setIsBulkExporting(false);
    success('Bulk Export Complete', `Exported all ${batchCards.length} QR SVGs.`);
  };

  if (isLoading) {
    return <LoadingState message="Loading QR Generator environment..." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="QR Code Generator & Print Master"
        description="Render and export physical QR codes mapped directly to permanent dynamic URLs."
      />

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('single')}
          className={`py-3 px-6 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'single'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          Single Card Generator
        </button>
        <button
          onClick={() => setActiveTab('batch')}
          className={`py-3 px-6 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'batch'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          Batch QR Production Sheet
        </button>
      </div>

      {activeTab === 'single' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Config Controls */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900">Card & Token Selection</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsCustomMode(!isCustomMode)}
                    className="text-xs text-brand-600 hover:text-brand-800 font-medium"
                  >
                    {isCustomMode ? 'Switch to Card Inventory' : 'Custom Token Input'}
                  </button>
                </div>
              </div>

              {!isCustomMode ? (
                <div>
                  <Select
                    label="Select Inventory Card"
                    value={selectedCardId}
                    onChange={e => setSelectedCardId(e.target.value)}
                    options={cards.map(c => ({
                      value: c.id,
                      label: `${c.internal_card_no} — ${c.client_name || 'Unassigned'} (Token: ${c.public_token})`,
                    }))}
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  <Input
                    label="Custom Token (6-12 chars)"
                    placeholder="e.g. 7KQ4M8X2"
                    value={customToken}
                    onChange={e => setCustomToken(e.target.value.toUpperCase())}
                    helperText="Creates a QR payload for any arbitrary public token"
                  />
                </div>
              )}

              {/* URL Preview */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                  Dynamic QR Payload (Permanent URL)
                </label>
                <div className="p-3 rounded-xl bg-slate-900 text-slate-200 font-mono text-xs sm:text-sm flex items-center justify-between gap-3 border border-slate-800">
                  <span className="truncate text-brand-300 font-medium">{dynamicUrl}</span>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopy}
                      leftIcon={<Copy className="w-3.5 h-3.5" />}
                      className="text-white hover:bg-slate-800 shrink-0 text-xs"
                    >
                      Copy
                    </Button>
                    <a
                      href={`/c/${tokenToUse}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors shrink-0"
                      title="Test /c/:token Route"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>

              {/* QR Verification Area */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Pre-Print QR Verification
                </div>
                <div className="text-xs text-slate-600 font-mono break-all">
                  <strong>QR Content:</strong> {dynamicUrl}
                </div>
                <div className="pt-2 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Valid dynamic URL
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Token: {tokenToUse}
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Card: {cardNoToUse}
                  </div>
                </div>
              </div>

              {selectedCard && !isCustomMode && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-xs text-slate-600">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-slate-400 block mb-0.5">Assigned Client:</span>
                    <span className="font-semibold text-slate-800">{selectedCard.client_name || '—'}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-slate-400 block mb-0.5">Google Review Target (Backend Destination):</span>
                    <span className="font-mono text-slate-700 truncate block">{selectedCard.destination_url}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* QR Code Output Box */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs text-center">
              <h3 className="text-base font-bold text-slate-900 mb-0.5 font-mono">{cardNoToUse}</h3>
              <p className="text-xs font-mono text-brand-700 font-semibold mb-4">Token: {tokenToUse}</p>

              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 inline-block shadow-inner mb-5">
                <div ref={singleCanvasRef}>
                  <QRCodeCanvas
                    value={dynamicUrl}
                    size={220}
                    level="H"
                    includeMargin={true}
                  />
                </div>
                <div ref={singleSvgRef} className="hidden">
                  <QRCodeSVG value={dynamicUrl} size={600} level="H" includeMargin={true} />
                </div>
              </div>

              <div className="space-y-2">
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => downloadSinglePNG()}
                  leftIcon={<Download className="w-4 h-4" />}
                  className="w-full"
                >
                  Download {cardNoToUse}.png
                </Button>
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => downloadSingleSVG()}
                  leftIcon={<Download className="w-4 h-4" />}
                  className="w-full"
                >
                  Download {cardNoToUse}.svg
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Batch QR Mode */
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="w-full sm:w-96">
              <Select
                label="Select Batch for QR Sheet"
                value={selectedBatchId}
                onChange={e => setSelectedBatchId(e.target.value)}
                options={batches.map(b => ({
                  value: b.id,
                  label: `${b.batch_name} (${b.quantity} cards) — ${b.client_name || 'Client'}`,
                }))}
              />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500">
                <strong>{batchCards.length}</strong> cards in batch
              </span>
              <Button
                variant="primary"
                size="sm"
                onClick={handleExportAllBatchSVGs}
                isLoading={isBulkExporting}
                leftIcon={<Download className="w-3.5 h-3.5" />}
              >
                Bulk Export All SVGs
              </Button>
            </div>
          </div>

          {batchCards.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 text-slate-500">
              No cards found for this batch.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {batchCards.map(card => {
                const cardDynamicUrl = getDynamicUrl(card.public_token);
                return (
                  <div
                    key={card.id}
                    id={`batch-qr-${card.id}`}
                    className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs text-center flex flex-col items-center justify-between space-y-3"
                  >
                    <div>
                      <div className="font-mono font-bold text-sm text-slate-900">{card.internal_card_no}</div>
                      <div className="text-[11px] font-mono text-brand-700 font-semibold">{card.public_token}</div>
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 inline-block">
                      <QRCodeCanvas value={cardDynamicUrl} size={140} level="M" includeMargin={true} />
                      <div className="hidden">
                        <QRCodeSVG value={cardDynamicUrl} size={400} level="M" includeMargin={true} />
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 w-full">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadBatchCard(card, 'png')}
                        className="flex-1 text-xs py-1 h-7"
                      >
                        {card.internal_card_no}.png
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadBatchCard(card, 'svg')}
                        className="flex-1 text-xs py-1 h-7"
                      >
                        {card.internal_card_no}.svg
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
