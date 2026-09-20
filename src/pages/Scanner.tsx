import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import {
  ScanLine,
  Camera,
  CameraOff,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ArrowRight,
  Sparkles,
  CreditCard,
  Search,
  Zap,
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Button } from '../components/ui/Button';
import { cardService } from '../services/cardService';
import { Card } from '../types';
import { extractTokenFromUrl, getDynamicUrl } from '../utils';
import { useToast } from '../hooks/useToast';

export const Scanner: React.FC = () => {
  const navigate = useNavigate();
  const { success, error } = useToast();

  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [detectedRaw, setDetectedRaw] = useState<string>('');
  const [extractedToken, setExtractedToken] = useState<string | null>(null);
  const [matchedCard, setMatchedCard] = useState<Card | null>(null);
  const [scanStatus, setScanStatus] = useState<'idle' | 'scanning' | 'success' | 'invalid' | 'not_found'>('idle');

  // Manual Test Input
  const [manualInput, setManualInput] = useState('7KQ4M8X2');

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'qr-reader-container';

  const stopScanner = async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch (err) {
        console.warn('Error stopping scanner:', err);
      }
    }
    setIsScanning(false);
  };

  const startScanner = async () => {
    setCameraError(null);
    setScanStatus('scanning');

    try {
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode(scannerContainerId);
      }

      await html5QrCodeRef.current.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          handleScanResult(decodedText);
        },
        () => {
          // ignore scan frame errors
        }
      );

      setIsScanning(true);
    } catch (err: any) {
      console.error('Camera start failed:', err);
      const errMsg = err?.name === 'NotAllowedError'
        ? 'Camera permission denied. Please allow camera access in browser.'
        : 'Could not access camera hardware. Use manual test mode below.';
      setCameraError(errMsg);
      setScanStatus('invalid');
      setIsScanning(false);
    }
  };

  const handleScanResult = async (rawInput: string) => {
    setDetectedRaw(rawInput);
    const token = extractTokenFromUrl(rawInput);

    if (!token) {
      setScanStatus('invalid');
      setExtractedToken(null);
      setMatchedCard(null);
      error('Scan Error', 'The scanned QR code is not a valid CardSync dynamic URL');
      return;
    }

    setExtractedToken(token);

    try {
      const foundCard = await cardService.getCardByToken(token);
      if (foundCard) {
        // Record scan event
        const updated = await cardService.recordCardScan(token);
        setMatchedCard(updated || foundCard);
        setScanStatus('success');
        success('Card Detected & Verified', `${foundCard.internal_card_no} (${foundCard.client_name || 'Client'})`);
        // Stop scanning after successful match
        stopScanner();
      } else {
        setScanStatus('not_found');
        setMatchedCard(null);
        error('Unknown Card', `Public token ${token} does not exist in CRM database.`);
      }
    } catch (err) {
      setScanStatus('invalid');
    }
  };

  const handleManualTest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    handleScanResult(manualInput.trim());
  };

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="NFC & QR Card Scanner"
        description="Verify dynamic PVC cards, decode public tokens, simulate live tap events, and inspect target destinations."
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Col: Live Scanner Viewport & Manual Test */}
        <div className="lg:col-span-6 space-y-5">
          <div className="bg-slate-900 rounded-2xl p-6 text-white border border-slate-800 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ScanLine className="w-5 h-5 text-brand-400" />
                <h3 className="text-base font-bold text-white">Live Camera Scanner</h3>
              </div>
              <span
                className={`text-xs px-2.5 py-1 rounded-full font-mono font-medium border ${
                  isScanning
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-800 animate-pulse'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                {isScanning ? 'LIVE SCANNER' : 'STANDBY'}
              </span>
            </div>

            {/* Video Viewport Box */}
            <div className="relative aspect-square max-h-80 w-full bg-slate-950 rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center">
              <div id={scannerContainerId} className="w-full h-full" />

              {!isScanning && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-3 bg-slate-950/90">
                  <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400">
                    <Camera className="w-7 h-7" />
                  </div>
                  <p className="text-sm font-medium text-slate-300">Camera is currently paused</p>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={startScanner}
                    leftIcon={<Camera className="w-4 h-4" />}
                    className="bg-brand-600 hover:bg-brand-500"
                  >
                    Start Optical Scanner
                  </Button>
                </div>
              )}
            </div>

            {isScanning && (
              <div className="mt-4 flex justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={stopScanner}
                  leftIcon={<CameraOff className="w-4 h-4" />}
                  className="bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700"
                >
                  Stop Scanner
                </Button>
              </div>
            )}

            {cameraError && (
              <div className="mt-4 p-3 rounded-lg bg-rose-950/60 border border-rose-800/60 text-xs text-rose-300 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{cameraError}</span>
              </div>
            )}
          </div>

          {/* Quick Manual Simulation Tester */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-brand-600" />
              <h3 className="text-sm font-bold text-slate-900">Manual Card / URL Tester</h3>
            </div>
            <p className="text-xs text-slate-500">
              Paste a full dynamic URL (e.g. <code>https://go.yourdomain.com/c/7KQ4M8X2</code>) or a direct token (e.g. <code>7KQ4M8X2</code>) to simulate a physical scan.
            </p>

            <form onSubmit={handleManualTest} className="flex gap-2">
              <input
                type="text"
                value={manualInput}
                onChange={e => setManualInput(e.target.value)}
                placeholder="7KQ4M8X2 or https://go.yourdomain.com/c/..."
                className="flex-1 rounded-lg border border-slate-300 px-3.5 py-2 text-sm font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
              <Button type="submit" variant="secondary" size="md" leftIcon={<Search className="w-4 h-4" />}>
                Test Decode
              </Button>
            </form>

            <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
              <span className="text-slate-400">Sample tokens:</span>
              {['7KQ4M8X2', '9XP2K1R8', '4MN8T5W3', '3HZ7P9L2'].map(token => (
                <button
                  key={token}
                  type="button"
                  onClick={() => {
                    setManualInput(token);
                    handleScanResult(token);
                  }}
                  className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-[11px] transition-colors"
                >
                  {token}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Col: Scan Diagnostics & Resolved Card Details */}
        <div className="lg:col-span-6 space-y-5">
          {/* Pipeline Status */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-600" />
              Decoder Pipeline Status
            </h3>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div
                className={`p-3 rounded-xl border ${
                  detectedRaw
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold'
                    : 'bg-slate-50 text-slate-500 border-slate-200'
                }`}
              >
                1. QR Scanned
              </div>
              <div
                className={`p-3 rounded-xl border ${
                  extractedToken
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold'
                    : 'bg-slate-50 text-slate-500 border-slate-200'
                }`}
              >
                2. Token Decoded
              </div>
              <div
                className={`p-3 rounded-xl border ${
                  matchedCard
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold'
                    : scanStatus === 'not_found'
                    ? 'bg-rose-50 text-rose-800 border-rose-200 font-semibold'
                    : 'bg-slate-50 text-slate-500 border-slate-200'
                }`}
              >
                3. Card Resolved
              </div>
            </div>

            {detectedRaw && (
              <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
                <div>
                  <span className="text-slate-400 font-medium">Scanned Raw Input:</span>
                  <div className="font-mono text-slate-800 bg-slate-50 p-2 rounded border border-slate-200 break-all mt-0.5">
                    {detectedRaw}
                  </div>
                </div>
                {extractedToken && (
                  <div>
                    <span className="text-slate-400 font-medium">Extracted Public Security Token:</span>
                    <div className="font-mono text-brand-700 font-bold bg-brand-50/60 p-2 rounded border border-brand-200 mt-0.5">
                      {extractedToken}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Result Card Preview */}
          {matchedCard ? (
            <div className="bg-white rounded-2xl p-6 border-2 border-emerald-500/80 shadow-md space-y-5 animate-in fade-in">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xl font-bold text-slate-900">{matchedCard.internal_card_no}</span>
                    <StatusBadge status={matchedCard.status} type="card" />
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">Assigned to {matchedCard.client_name}</p>
                </div>
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
              </div>

              <div className="space-y-3 pt-2 text-xs">
                <div>
                  <span className="text-slate-400 block font-medium mb-1">Permanent Dynamic URL (Payload):</span>
                  <div className="p-2.5 rounded-lg bg-slate-100 font-mono text-slate-800 break-all">
                    {getDynamicUrl(matchedCard.public_token)}
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 block font-medium mb-1">Current Review Destination:</span>
                  <div className="p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-200 font-mono text-emerald-900 break-all">
                    {matchedCard.destination_url}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-slate-400 block">Total Scans:</span>
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      {matchedCard.total_scans} scans
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-slate-400 block">Batch Origin:</span>
                    <span className="font-mono text-slate-700 text-xs truncate block">
                      {matchedCard.batch_name || matchedCard.batch_id}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 flex-wrap">
                <a
                  href={`/c/${matchedCard.public_token}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold transition-colors"
                >
                  <span>Open Test Route (/c/{matchedCard.public_token})</span>
                  <ExternalLink className="w-3.5 h-3.5 text-brand-600" />
                </a>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/cards/${matchedCard.id}`)}
                  rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                >
                  Manage Card in CRM
                </Button>
                <a
                  href={matchedCard.destination_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors"
                >
                  <span>Test Destination</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          ) : scanStatus === 'not_found' ? (
            <div className="bg-rose-50/80 rounded-2xl p-6 border border-rose-200 text-center space-y-3">
              <AlertTriangle className="w-8 h-8 text-rose-600 mx-auto" />
              <h4 className="text-sm font-bold text-rose-900">Unregistered Physical Card</h4>
              <p className="text-xs text-rose-700 max-w-sm mx-auto">
                The extracted public token <strong className="font-mono">{extractedToken}</strong> is not associated with any card record in the CRM inventory.
              </p>
            </div>
          ) : (
            <div className="bg-slate-50 rounded-2xl p-8 border-2 border-dashed border-slate-200 text-center text-slate-400 space-y-2">
              <CreditCard className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-xs font-medium">No card scanned yet. Point the camera at a QR code or test with a sample token above.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
