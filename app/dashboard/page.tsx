'use client';

import { useCallback, useEffect, useState } from 'react';
import ProductTable from '@/components/ProductTable';
import AuditLogTable from '@/components/AuditLogTable';
import { Product, InventoryLog } from '@/types';
import { BarChart3, Package, AlertTriangle, TrendingDown, WifiOff } from 'lucide-react';

export default function DashboardPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [logs, setLogs] = useState<InventoryLog[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [productError, setProductError] = useState('');
  const [logError, setLogError] = useState('');

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
    } catch (err) {
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
    } catch (err) {
      setLogError('Network error — could not reach the server.');
      setLogs([]);
    } finally {
      setLoadingLogs(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
    fetchLogs();
  }, [fetchProducts, fetchLogs]);

  const totalProducts = products.length;
  const inStock = products.filter((p) => p.quantity > 10).length;
  const lowStock = products.filter((p) => p.quantity > 0 && p.quantity <= 10).length;
  const outOfStock = products.filter((p) => p.quantity === 0).length;

  const statCards = [
    { label: 'Total SKUs', value: totalProducts, icon: BarChart3, color: 'bg-indigo-500' },
    { label: 'In Stock', value: inStock, icon: Package, color: 'bg-green-500' },
    { label: 'Low Stock', value: lowStock, icon: AlertTriangle, color: 'bg-yellow-500' },
    { label: 'Out of Stock', value: outOfStock, icon: TrendingDown, color: 'bg-red-500' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Live inventory overview and scan audit trail</p>
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

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl shadow p-5 flex items-center gap-4">
            <div className={`${color} rounded-xl p-3 text-white`}>
              <Icon size={22} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              <p className="text-xs text-gray-500 font-medium">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <ProductTable
        products={products}
        onRefresh={() => { fetchProducts(); fetchLogs(); }}
        loading={loadingProducts}
      />
      <AuditLogTable logs={logs} onRefresh={fetchLogs} loading={loadingLogs} />
    </div>
  );
}
