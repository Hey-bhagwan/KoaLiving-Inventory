'use client';

import { useCallback, useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import AuditLogTable from '@/components/AuditLogTable';
import { Product, InventoryLog, getStockStatus } from '@/types';
import {
  BarChart3, Package, AlertTriangle, WifiOff,
  ScanLine, ArrowDownCircle, ArrowUpCircle, RefreshCw, Loader2,
  Camera, CheckCircle2, XCircle, ArrowRight, Layers, Sparkles
} from 'lucide-react';

export default function DashboardPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [logs, setLogs] = useState<InventoryLog[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [productError, setProductError] = useState('');
  const [logError, setLogError] = useState('');

  // Quick Scan Station state
  const [scanSku, setScanSku] = useState('');
  const [scanMode, setScanMode] = useState<'INWARD' | 'OUTWARD'>('INWARD');
  const [scanning, setScanning] = useState(false);
  const [scanFeedback, setScanFeedback] = useState<{
    type: 'success' | 'error';
    title: string;
    description: string;
  } | null>(null);

  const fetchProducts = useCallback(async () => {
    setLoadingProducts(true);
    setProductError('');
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      if (!res.ok) {
        setProductError(data?.error || `API error ${res.status}`);
        setProducts([]);
      } else {
        setProducts(Array.isArray(data) ? data : []);
      }
    } catch {
      setProductError('Network error — could not reach the server.');
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    setLoadingLogs(true);
    setLogError('');
    try {
      const res = await fetch('/api/inventory/logs');
      const data = await res.json();
      if (!res.ok) {
        setLogError(data?.error || `API error ${res.status}`);
        setLogs([]);
      } else {
        setLogs(Array.isArray(data) ? data : []);
      }
    } catch {
      setLogError('Network error — could not reach the server.');
      setLogs([]);
    } finally {
      setLoadingLogs(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    async function loadData() {
      try {
        const [prodRes, logRes] = await Promise.all([
          fetch('/api/products'),
          fetch('/api/inventory/logs'),
        ]);
        const prodData = await prodRes.json();
        const logData = await logRes.json();

        if (ignore) return;

        if (!prodRes.ok) {
          setProductError(prodData?.error || `API error ${prodRes.status}`);
          setProducts([]);
        } else {
          setProducts(Array.isArray(prodData) ? prodData : []);
        }

        if (!logRes.ok) {
          setLogError(logData?.error || `API error ${logRes.status}`);
          setLogs([]);
        } else {
          setLogs(Array.isArray(logData) ? logData : []);
        }
      } catch {
        if (!ignore) {
          setProductError('Network error — could not reach the server.');
          setLogError('Network error — could not reach the server.');
          setProducts([]);
          setLogs([]);
        }
      } finally {
        if (!ignore) {
          setLoadingProducts(false);
          setLoadingLogs(false);
        }
      }
    }

    loadData();
    return () => {
      ignore = true;
    };
  }, []);

  // Compute Today's Scan Velocity
  const scanMetrics = useMemo(() => {
    const today = new Date();
    const todayLogs = logs.filter((log) => {
      const d = new Date(log.createdAt);
      return (
        d.getDate() === today.getDate() &&
        d.getMonth() === today.getMonth() &&
        d.getFullYear() === today.getFullYear()
      );
    });

    const todayInward = todayLogs.filter((l) => l.type === 'INWARD').length;
    const todayOutward = todayLogs.filter((l) => l.type === 'OUTWARD').length;
    const todayTotal = todayLogs.length;
    const netMovement = todayInward - todayOutward;

    return { todayTotal, todayInward, todayOutward, netMovement };
  }, [logs]);

  // Compute Critical Stock (items needing attention: quantity <= 10)
  const criticalItems = useMemo(() => {
    return products
      .filter((p) => p.quantity <= 10)
      .sort((a, b) => a.quantity - b.quantity);
  }, [products]);

  // Handle Quick Barcode Scan directly on the dashboard
  const handleQuickScan = async (e?: React.FormEvent, overrideSku?: string) => {
    if (e) e.preventDefault();
    const targetSku = (overrideSku || scanSku).trim().toUpperCase();
    if (!targetSku) return;

    setScanning(true);
    setScanFeedback(null);

    try {
      const res = await fetch('/api/inventory/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sku: targetSku, type: scanMode }),
      });

      const data = await res.json();

      if (!res.ok) {
        setScanFeedback({
          type: 'error',
          title: 'Scan Rejected',
          description: data?.error || 'Failed to process barcode scan.',
        });
      } else {
        const { product, log } = data;
        setScanFeedback({
          type: 'success',
          title: scanMode === 'INWARD' ? 'Stock Received (+1)' : 'Stock Dispatched (-1)',
          description: `${product.name} (${product.sku}) is now at ${product.quantity} in stock.`,
        });

        // Update local products and logs state immediately
        setProducts((prev) =>
          prev.map((p) => (p.sku === product.sku ? product : p))
        );
        if (log) {
          setLogs((prev) => [log, ...prev]);
        }

        if (!overrideSku) {
          setScanSku('');
        }
      }
    } catch {
      setScanFeedback({
        type: 'error',
        title: 'Connection Error',
        description: 'Unable to reach the server to process the scan.',
      });
    } finally {
      setScanning(false);
    }
  };

  const isInitialLoading = loadingProducts && products.length === 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Koa Living Dashboard</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live System
            </span>
          </div>
          <p className="text-gray-500 text-sm mt-1">
            Barcode scanning operations, daily movement velocity, and stock alerts
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => {
              fetchProducts();
              fetchLogs();
            }}
            disabled={loadingProducts || loadingLogs}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors disabled:opacity-50 shadow-sm"
          >
            <RefreshCw size={14} className={loadingProducts || loadingLogs ? 'animate-spin text-indigo-600' : ''} />
            Refresh
          </button>
          <Link
            href="/scanner"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors shadow-sm shadow-indigo-200"
          >
            <Camera size={16} />
            Camera Scanner
          </Link>
        </div>
      </div>

      {/* DB Error Banner */}
      {(productError || logError) && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-800 rounded-2xl px-5 py-4 text-sm">
          <WifiOff size={18} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold mb-1">Could not load data from the server:</p>
            {productError && <p>Products: <code className="bg-red-100 px-1 rounded">{productError}</code></p>}
            {logError && <p className="mt-0.5">Logs: <code className="bg-red-100 px-1 rounded">{logError}</code></p>}
            <p className="mt-2 text-red-600 text-xs">
              Make sure your <code className="bg-red-100 px-1 rounded">.env</code> DATABASE_URL is correct and
              you have run <code className="bg-red-100 px-1 rounded">npx prisma migrate dev --name init</code>.
            </p>
          </div>
        </div>
      )}

      {/* 1. Quick Barcode Scan Station (Central Hero Component) */}
      <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-gray-900 text-white rounded-3xl p-6 sm:p-7 shadow-xl relative overflow-hidden">
        {/* Subtle decorative background glow */}
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                <ScanLine size={24} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  Quick Barcode Scan Station
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/20 uppercase font-semibold">
                    Scanner Gun Ready
                  </span>
                </h2>
                <p className="text-xs text-indigo-200/80">
                  Scan with USB/Bluetooth reader gun or type SKU and press Enter
                </p>
              </div>
            </div>

            {/* Inward / Outward Toggle */}
            <div className="flex items-center gap-1.5 p-1 bg-black/40 rounded-2xl border border-white/10 self-start md:self-auto">
              <button
                type="button"
                onClick={() => setScanMode('INWARD')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  scanMode === 'INWARD'
                    ? 'bg-emerald-500 text-white shadow-md'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <ArrowDownCircle size={15} />
                INWARD (+1 Restock)
              </button>
              <button
                type="button"
                onClick={() => setScanMode('OUTWARD')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  scanMode === 'OUTWARD'
                    ? 'bg-rose-500 text-white shadow-md'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <ArrowUpCircle size={15} />
                OUTWARD (-1 Dispatch)
              </button>
            </div>
          </div>

          {/* Barcode Input Form */}
          <form onSubmit={(e) => handleQuickScan(e)} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <ScanLine size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-300 pointer-events-none" />
              <input
                type="text"
                value={scanSku}
                onChange={(e) => setScanSku(e.target.value)}
                placeholder="Scan barcode with reader gun or enter SKU, then press Enter..."
                className="w-full pl-11 pr-4 py-3 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-indigo-200/50 text-sm font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white/15 transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={scanning || !scanSku.trim()}
              className="px-6 py-3 rounded-2xl bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-bold shadow-lg shadow-indigo-500/40 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {scanning ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Recording...
                </>
              ) : (
                <>
                  Execute Scan
                  <ArrowRight size={16} />
                </>
              )}
            </button>
            <Link
              href={`/scanner?mode=${scanMode}`}
              className="px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-indigo-200 hover:text-white text-sm font-medium border border-white/10 transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <Camera size={16} />
              Camera View
            </Link>
          </form>

          {/* Instant Scan Feedback Banner */}
          {scanFeedback && (
            <div
              className={`p-3.5 rounded-2xl text-xs flex items-center justify-between gap-3 border transition-all ${
                scanFeedback.type === 'success'
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-200'
                  : 'bg-rose-500/20 border-rose-500/40 text-rose-200'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {scanFeedback.type === 'success' ? (
                  <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
                ) : (
                  <XCircle size={18} className="text-rose-400 shrink-0" />
                )}
                <div>
                  <span className="font-bold mr-1.5">{scanFeedback.title}:</span>
                  <span>{scanFeedback.description}</span>
                </div>
              </div>
              <button
                onClick={() => setScanFeedback(null)}
                className="text-white/60 hover:text-white text-xs px-2 py-1 rounded"
              >
                Dismiss
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2. Today's Scanning Velocity & Stock Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Scans */}
        <div className="bg-white rounded-2xl shadow p-5 flex items-center gap-4">
          <div className="bg-indigo-500 rounded-xl p-3 text-white">
            <ScanLine size={22} />
          </div>
          <div>
            <p className="text-2xl font-black text-gray-900">{scanMetrics.todayTotal}</p>
            <p className="text-xs text-gray-500 font-medium">Today&apos;s Scans</p>
          </div>
        </div>

        {/* Inward Today */}
        <div className="bg-white rounded-2xl shadow p-5 flex items-center gap-4">
          <div className="bg-emerald-500 rounded-xl p-3 text-white">
            <ArrowDownCircle size={22} />
          </div>
          <div>
            <p className="text-2xl font-black text-gray-900">+{scanMetrics.todayInward}</p>
            <p className="text-xs text-gray-500 font-medium">Inward Received Today</p>
          </div>
        </div>

        {/* Outward Today */}
        <div className="bg-white rounded-2xl shadow p-5 flex items-center gap-4">
          <div className="bg-rose-500 rounded-xl p-3 text-white">
            <ArrowUpCircle size={22} />
          </div>
          <div>
            <p className="text-2xl font-black text-gray-900">-{scanMetrics.todayOutward}</p>
            <p className="text-xs text-gray-500 font-medium">Outward Dispatched Today</p>
          </div>
        </div>

        {/* Net Movement */}
        <div className="bg-white rounded-2xl shadow p-5 flex items-center gap-4">
          <div className={`${scanMetrics.netMovement >= 0 ? 'bg-blue-500' : 'bg-amber-500'} rounded-xl p-3 text-white`}>
            <BarChart3 size={22} />
          </div>
          <div>
            <p className="text-2xl font-black text-gray-900">
              {scanMetrics.netMovement > 0 ? `+${scanMetrics.netMovement}` : scanMetrics.netMovement}
            </p>
            <p className="text-xs text-gray-500 font-medium">Net Movement Today</p>
          </div>
        </div>
      </div>

      {/* 3. Operational Grid: Left = Critical Stock Attention Panel, Right = Quick Navigation & Scanner Hub */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Critical Stock & Restock Attention Panel (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow overflow-hidden flex flex-col justify-between">
          <div>
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
                  <AlertTriangle size={18} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-800">Critical Stock Attention</h2>
                  <p className="text-xs text-gray-400">Items out of stock (0) or low stock (≤10)</p>
                </div>
              </div>
              <Link
                href="/products"
                className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
              >
                View all products
                <ArrowRight size={13} />
              </Link>
            </div>

            <div className="p-6">
              {isInitialLoading ? (
                <div className="py-8 text-center text-gray-400 text-xs flex flex-col items-center gap-2">
                  <Loader2 size={20} className="animate-spin text-indigo-600" />
                  Checking stock health...
                </div>
              ) : criticalItems.length === 0 ? (
                <div className="py-8 text-center flex flex-col items-center">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2">
                    <Sparkles size={22} />
                  </div>
                  <p className="text-sm font-bold text-gray-800">All Stock Levels Healthy</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    No products currently have low stock or are depleted.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {criticalItems.slice(0, 5).map((item) => {
                    const status = getStockStatus(item.quantity);
                    return (
                      <div
                        key={item.id}
                        className="py-3 flex items-center justify-between gap-3 hover:bg-gray-50/70 px-2 rounded-xl transition-colors"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-gray-700">{item.sku}</span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                status === 'Out of Stock'
                                  ? 'bg-rose-100 text-rose-700'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {status}
                            </span>
                          </div>
                          <p className="text-sm text-gray-800 font-medium truncate mt-0.5">{item.name}</p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-sm font-black text-gray-900">
                            {item.quantity} units
                          </span>
                          <button
                            onClick={() => handleQuickScan(undefined, item.sku)}
                            disabled={scanning}
                            title="Quick Restock +1"
                            className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold transition-colors disabled:opacity-50"
                          >
                            +1 Restock
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {criticalItems.length > 5 && (
            <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-500 flex items-center justify-between">
              <span>+ {criticalItems.length - 5} more items require replenishment</span>
              <Link href="/products" className="text-indigo-600 font-semibold hover:underline">
                View all on Products page
              </Link>
            </div>
          )}
        </div>

        {/* Quick Operations Hub & Hardware Guide (1 Col) */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl shadow p-6 space-y-4">
            <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
              <Layers size={18} className="text-indigo-600" />
              Operations Hub
            </h3>

            <div className="space-y-2.5">
              <Link
                href="/scanner"
                className="flex items-center justify-between p-3 rounded-xl bg-indigo-50/60 hover:bg-indigo-50 text-indigo-900 border border-indigo-100 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-indigo-600 text-white">
                    <Camera size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-bold">Camera Barcode Scanner</p>
                    <p className="text-[11px] text-indigo-600/80">Scan with laptop webcam or mobile</p>
                  </div>
                </div>
                <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>

              <Link
                href="/products"
                className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100/80 text-gray-800 border border-gray-200/70 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gray-700 text-white">
                    <Package size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-bold">Full Inventory & Barcodes</p>
                    <p className="text-[11px] text-gray-500">Search, filter, print barcodes</p>
                  </div>
                </div>
                <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow p-5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-800 uppercase tracking-wider">
              <ScanLine size={15} className="text-emerald-600" />
              Scanner Gun Compatibility
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              Standard 1D / 2D barcode scanner guns (USB & Bluetooth) work seamlessly. Focus the Quick Scan input and pull the trigger to register movement immediately.
            </p>
          </div>
        </div>
      </div>

      {/* 4. Live Scan Audit Log Table */}
      <AuditLogTable logs={logs} onRefresh={fetchLogs} loading={loadingLogs} />
    </div>
  );
}
