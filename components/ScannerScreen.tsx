'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { ScanMode } from '@/types';
import Toast, { useToast } from './Toast';
import { Camera, CameraOff, Loader2, CheckCircle2 } from 'lucide-react';

const SUCCESS_PAUSE_SECONDS = 15; // full lockout after a confirmed scan
const ERROR_COOLDOWN_SECONDS = 3; // short breather after a failed scan, so an
// unmoving invalid barcode doesn't spam the API at ~10 decodes/sec

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

// Vibration helper — supported on Android Chrome; silently a no-op on iOS
// Safari and desktop browsers, so it's safe to call unconditionally.
function vibrate(pattern: number | number[]) {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  } catch (_) {}
}

type ScannerHandle = {
  stop: () => Promise<void>;
  clear: () => void;
  pause: (shouldPauseVideo?: boolean) => void;
  resume: () => void;
};

export default function ScannerScreen() {
  const [mode, setMode] = useState<ScanMode>('INWARD');
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);

  // Lockout state (covers both the 15s success pause and the shorter error cooldown)
  const [paused, setPaused] = useState(false);
  const [pauseKind, setPauseKind] = useState<'success' | 'error' | null>(null);
  const [pauseSecondsLeft, setPauseSecondsLeft] = useState(0);
  const [pauseTotalSeconds, setPauseTotalSeconds] = useState(0);
  const [lastSku, setLastSku] = useState<string | null>(null);

  const { toasts, addToast, removeToast } = useToast();
  const scannerRef = useRef<ScannerHandle | null>(null);
  const pausedRef = useRef(false); // synchronous guard, read inside the decode callback
  const containerRef = useRef<HTMLDivElement>(null);
  const pauseIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pauseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearPauseTimers = useCallback(() => {
    if (pauseIntervalRef.current) {
      clearInterval(pauseIntervalRef.current);
      pauseIntervalRef.current = null;
    }
    if (pauseTimeoutRef.current) {
      clearTimeout(pauseTimeoutRef.current);
      pauseTimeoutRef.current = null;
    }
  }, []);

  const beginLockout = useCallback((seconds: number, kind: 'success' | 'error', sku?: string) => {
    pausedRef.current = true;
    setPaused(true);
    setPauseKind(kind);
    setPauseSecondsLeft(seconds);
    setPauseTotalSeconds(seconds);
    if (sku) setLastSku(sku.toUpperCase());

    // Actually freeze the camera/decoder, not just ignore results — saves
    // battery and avoids the library queuing up decode callbacks in the background.
    if (scannerRef.current) {
      try {
        scannerRef.current.pause(true);
      } catch (_) {}
    }

    clearPauseTimers();
    pauseIntervalRef.current = setInterval(() => {
      setPauseSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);

    pauseTimeoutRef.current = setTimeout(() => {
      clearPauseTimers();
      pausedRef.current = false;
      setPaused(false);
      setPauseKind(null);
      if (scannerRef.current) {
        try {
          scannerRef.current.resume();
        } catch (_) {}
      }
    }, seconds * 1000);
  }, [clearPauseTimers]);

  // Lets the user manually end a lockout early (e.g. they're confident the
  // next item really is different and don't want to wait out the full 15s).
  const skipPause = useCallback(() => {
    clearPauseTimers();
    pausedRef.current = false;
    setPaused(false);
    setPauseKind(null);
    if (scannerRef.current) {
      try {
        scannerRef.current.resume();
      } catch (_) {}
    }
  }, [clearPauseTimers]);

  const stopScanner = useCallback(async () => {
    clearPauseTimers();
    pausedRef.current = false;
    setPaused(false);
    setPauseKind(null);

    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (_) {}
      scannerRef.current = null;
    }
    setScanning(false);
  }, [clearPauseTimers]);

  const handleScan = useCallback(async (sku: string) => {
    // Hard guard: while locked out (mid-request, mid-15s pause, or mid-error-cooldown)
    // every decode from the camera is ignored — this is what stops the same
    // barcode (or any barcode) from being scanned again immediately.
    if (pausedRef.current || loading) return;
    pausedRef.current = true;
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
        vibrate([80, 60, 80]); // short double-buzz for a failed scan
        addToast(data.error || 'Scan failed', 'error');
        beginLockout(ERROR_COOLDOWN_SECONDS, 'error');
      } else {
        playBeep(true);
        vibrate(200); // solid buzz confirming a successful scan
        const qty = data.product?.quantity ?? '?';
        addToast(
          `${mode === 'INWARD' ? '+1' : '-1'} ${sku.toUpperCase()} — Stock: ${qty}`,
          'success'
        );
        beginLockout(SUCCESS_PAUSE_SECONDS, 'success', sku);
      }
    } catch {
      playBeep(false);
      vibrate([80, 60, 80]);
      addToast('Network error. Try again.', 'error');
      beginLockout(ERROR_COOLDOWN_SECONDS, 'error');
    } finally {
      setLoading(false);
    }
  }, [mode, loading, addToast, beginLockout]);

  const startScanner = useCallback(async () => {
    const { Html5Qrcode } = await import('html5-qrcode');
    const scannerId = 'barcode-scanner-region';

    if (scannerRef.current) await stopScanner();

    const html5QrCode = new Html5Qrcode(scannerId) as unknown as ScannerHandle;
    scannerRef.current = html5QrCode;

    try {
      await (html5QrCode as unknown as {
        start: (
          cameraConfig: unknown,
          config: unknown,
          onSuccess: (decodedText: string) => void,
          onError: undefined
        ) => Promise<void>;
      }).start(
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

  const pausePercent = pauseTotalSeconds > 0 ? Math.round((pauseSecondsLeft / pauseTotalSeconds) * 100) : 0;

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

        <div className="relative mt-3">
          {/* html5-qrcode mounts here */}
          <div
            id="barcode-scanner-region"
            ref={containerRef}
            className="w-full"
            style={{ minHeight: scanning ? '240px' : '0px' }}
          />

          {!scanning && (
            <div className="flex flex-col items-center gap-3 py-10 text-gray-400">
              <CameraOff size={44} />
              <p className="text-sm">Camera is off</p>
            </div>
          )}

          {/* Lockout overlay — shown for both the 15s success pause and the
              short error cooldown, sitting on top of the frozen camera frame */}
          {scanning && paused && (
            <div
              className={`absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center ${
                pauseKind === 'success' ? 'bg-green-700/90' : 'bg-amber-700/90'
              }`}
            >
              {pauseKind === 'success' ? (
                <CheckCircle2 size={36} className="text-white" />
              ) : (
                <Loader2 size={36} className="text-white animate-spin" />
              )}
              <p className="text-white font-semibold text-sm">
                {pauseKind === 'success' ? `Scanned ${lastSku}` : 'Move to a new barcode'}
              </p>
              <p className="text-white/80 text-xs">
                {pauseKind === 'success' ? 'Next scan in' : 'Retrying in'} {pauseSecondsLeft}s
              </p>
              <div className="w-40 h-1.5 rounded-full bg-white/30 overflow-hidden mt-1">
                <div
                  className="h-full bg-white transition-all duration-1000 ease-linear"
                  style={{ width: `${pausePercent}%` }}
                />
              </div>
              <button
                onClick={skipPause}
                className="mt-2 text-xs font-semibold text-white/90 underline underline-offset-2 hover:text-white"
              >
                Skip wait — scan now
              </button>
            </div>
          )}
        </div>

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
          <li>A beep + buzz + toast confirm each scan, then the scanner locks for {SUCCESS_PAUSE_SECONDS}s so the same barcode can&apos;t be counted twice.</li>
        </ol>
      </div>
    </div>
  );
}