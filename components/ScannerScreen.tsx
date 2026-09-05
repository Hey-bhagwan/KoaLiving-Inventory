'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { ScanMode } from '@/types';
import Toast, { useToast } from './Toast';
import { Camera, CameraOff, Loader2 } from 'lucide-react';

// Web Audio beep helper
function playBeep(success: boolean) {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.value = success ? 1200 : 300;
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (success ? 0.18 : 0.35));
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
  } catch (_) {}
}

export default function ScannerScreen() {
  const [mode, setMode] = useState<ScanMode>('INWARD');
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toasts, addToast, removeToast } = useToast();
  const scannerRef = useRef<unknown>(null);
  const cooldownRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const html5QrCode = scannerRef.current as { stop: () => Promise<void>; clear: () => void };
        await html5QrCode.stop();
        html5QrCode.clear();
      } catch (_) {}
      scannerRef.current = null;
    }
    setScanning(false);
  }, []);

  const handleScan = useCallback(async (sku: string) => {
    if (cooldownRef.current || loading) return;
    cooldownRef.current = true;
    setLoading(true);

    try {
      const res = await fetch('/api/inventory/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sku: sku.trim().toUpperCase(), type: mode }),
      });
      const data = await res.json();

      if (!res.ok) {
        playBeep(false);
        addToast(data.error || 'Scan failed', 'error');
      } else {
        playBeep(true);
        const qty = data.product?.quantity ?? '?';
        addToast(
          `${mode === 'INWARD' ? '+1' : '-1'} ${sku.toUpperCase()} — Stock: ${qty}`,
          'success'
        );
      }
    } catch {
      playBeep(false);
      addToast('Network error. Try again.', 'error');
    } finally {
      setLoading(false);
      setTimeout(() => { cooldownRef.current = false; }, 2000);
    }
  }, [mode, loading, addToast]);

  const startScanner = useCallback(async () => {
    const { Html5Qrcode } = await import('html5-qrcode');
    const scannerId = 'barcode-scanner-region';

    if (scannerRef.current) await stopScanner();

    const html5QrCode = new Html5Qrcode(scannerId);
    scannerRef.current = html5QrCode;

    try {
      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 280, height: 120 },
          aspectRatio: 1.5,
        },
        (decodedText: string) => {
          handleScan(decodedText);
        },
        undefined
      );
      setScanning(true);
    } catch (err) {
      console.error('Scanner failed to start:', err);
      addToast('Camera access denied or unavailable.', 'error');
      scannerRef.current = null;
    }
  }, [handleScan, stopScanner, addToast]);

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, [stopScanner]);

  return (
    <div className="flex flex-col items-center gap-6 max-w-md mx-auto w-full">
      <Toast toasts={toasts} onRemove={removeToast} />

      {/* Mode Toggle */}
      <div className="w-full bg-white rounded-2xl shadow p-5 flex flex-col gap-4">
        <h2 className="text-base font-semibold text-gray-700">Scan Mode</h2>
        <div className="flex rounded-xl overflow-hidden border border-gray-200 text-sm font-semibold">
          <button
            onClick={() => setMode('INWARD')}
            className={`flex-1 py-3 transition-colors ${
              mode === 'INWARD'
                ? 'bg-green-600 text-white'
                : 'bg-white text-gray-500 hover:bg-gray-50'
            }`}
          >
            ▼ Inward (+1 Stock)
          </button>
          <button
            onClick={() => setMode('OUTWARD')}
            className={`flex-1 py-3 transition-colors border-l border-gray-200 ${
              mode === 'OUTWARD'
                ? 'bg-red-600 text-white'
                : 'bg-white text-gray-500 hover:bg-gray-50'
            }`}
          >
            ▲ Outward (-1 Stock)
          </button>
        </div>
        <p className={`text-xs text-center font-medium ${mode === 'INWARD' ? 'text-green-700' : 'text-red-600'}`}>
          {mode === 'INWARD'
            ? 'Each scan will ADD 1 unit to stock (Production)'
            : 'Each scan will REMOVE 1 unit from stock (Pickup / Delivery)'}
        </p>
      </div>

      {/* Scanner Viewport */}
      <div className="w-full bg-white rounded-2xl shadow overflow-hidden">
        <div className="px-5 pt-5 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-700">Camera Scanner</h2>
          {loading && <Loader2 size={16} className="animate-spin text-indigo-500" />}
        </div>

        {/* html5-qrcode mounts here */}
        <div
          id="barcode-scanner-region"
          ref={containerRef}
          className="w-full mt-3"
          style={{ minHeight: scanning ? '240px' : '0px' }}
        />

        {!scanning && (
          <div className="flex flex-col items-center gap-3 py-10 text-gray-400">
            <CameraOff size={44} />
            <p className="text-sm">Camera is off</p>
          </div>
        )}

        <div className="px-5 py-4 flex gap-3">
          {!scanning ? (
            <button
              onClick={startScanner}
              className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              <Camera size={18} />
              Start Scanner
            </button>
          ) : (
            <button
              onClick={stopScanner}
              className="flex-1 flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-800 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              <CameraOff size={18} />
              Stop Scanner
            </button>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="w-full bg-indigo-50 border border-indigo-100 rounded-2xl p-4 text-sm text-indigo-800 space-y-1">
        <p className="font-semibold">How to use:</p>
        <ol className="list-decimal list-inside space-y-1 text-indigo-700">
          <li>Select Inward or Outward mode above.</li>
          <li>Tap <strong>Start Scanner</strong> and allow camera access.</li>
          <li>Hold the barcode label within the scan box.</li>
          <li>A beep + toast will confirm each scan (2-second cooldown).</li>
        </ol>
      </div>
    </div>
  );
}
