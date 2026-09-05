'use client';

import { Product, getStockStatus } from '@/types';
import { RefreshCw } from 'lucide-react';

interface ProductTableProps {
  products: Product[];
  onRefresh: () => void;
  loading?: boolean;
}

const badgeStyle: Record<string, string> = {
  'In Stock': 'bg-green-100 text-green-800',
  'Low Stock': 'bg-yellow-100 text-yellow-800',
  'Out of Stock': 'bg-red-100 text-red-700',
};

export default function ProductTable({ products, onRefresh, loading }: ProductTableProps) {
  return (
    <div className="bg-white rounded-2xl shadow overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-800">Inventory</h2>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors disabled:opacity-50"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
            <tr>
              <th className="px-6 py-3 text-left">SKU</th>
              <th className="px-6 py-3 text-left">Product Name</th>
              <th className="px-6 py-3 text-right">Quantity</th>
              <th className="px-6 py-3 text-left">Status</th>
              <th className="px-6 py-3 text-left">Last Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {products.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-gray-400">
                  No products found. Add one on the Products page.
                </td>
              </tr>
            ) : (
              products.map((p) => {
                const status = getStockStatus(p.quantity);
                return (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-mono font-medium text-gray-700">{p.sku}</td>
                    <td className="px-6 py-4 text-gray-800 font-medium">{p.name}</td>
                    <td className="px-6 py-4 text-right font-semibold text-gray-800">{p.quantity}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${badgeStyle[status]}`}>
                        {status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-400 text-xs">
                      {new Date(p.updatedAt).toLocaleString()}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
