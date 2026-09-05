'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import ProductForm from '@/components/ProductForm';
import EditProductModal from '@/components/EditProductModal';
import { Product, getStockStatus } from '@/types';
import {
  Barcode, Pencil, Trash2, RefreshCw, ChevronDown, ChevronUp, Loader2,
} from 'lucide-react';

// BarcodeModal uses bwip-js (canvas) — must be client-only
const BarcodeModal = dynamic(() => import('@/components/BarcodeModal'), { ssr: false });

const badgeStyle: Record<string, string> = {
  'In Stock': 'bg-green-100 text-green-800',
  'Low Stock': 'bg-yellow-100 text-yellow-800',
  'Out of Stock': 'bg-red-100 text-red-700',
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [showForm, setShowForm] = useState(false);

  // Modal state
  const [barcodeProduct, setBarcodeProduct] = useState<Product | null>(null);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setFetchError('');
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      if (!res.ok) {
        setFetchError(data?.error || `API error ${res.status}`);
        setProducts([]);
      } else {
        setProducts(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      setFetchError('Network error — could not reach the server.');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const handleProductAdded = (product: Product) => {
    setProducts((prev) => [product, ...prev]);
    setShowForm(false);
  };

  const handleSaved = (updated: Product) => {
    setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await fetch(`/api/products/${deleteTarget.id}`, { method: 'DELETE' });
      setProducts((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-gray-500 text-sm mt-1">Manage products, barcodes, and stock levels</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchProducts}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors"
          >
            {showForm ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            {showForm ? 'Hide Form' : '+ Add Product'}
          </button>
        </div>
      </div>

      {/* DB Error Banner */}
      {fetchError && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-800 rounded-2xl px-5 py-4 text-sm">
          <span className="text-lg">⚠️</span>
          <div>
            <p className="font-semibold">Could not load products:</p>
            <code className="bg-red-100 px-1 rounded text-xs">{fetchError}</code>
            <p className="mt-2 text-red-600 text-xs">
              Check your <code className="bg-red-100 px-1 rounded">.env</code> DATABASE_URL and run{' '}
              <code className="bg-red-100 px-1 rounded">npx prisma migrate dev --name init</code>.
            </p>
          </div>
        </div>
      )}

      {/* Collapsible Add Form */}
      {showForm && (
        <ProductForm
          onProductAdded={(p) => handleProductAdded(p as unknown as Product)}
        />
      )}

      {/* Products Table */}
      <div className="bg-white rounded-2xl shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-800">
            All Products
            <span className="ml-2 text-xs font-normal text-gray-400">({products.length})</span>
          </h2>
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
                <th className="px-6 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                    <Loader2 className="animate-spin mx-auto mb-2" size={22} />
                    Loading products...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                    No products yet. Click <strong>+ Add Product</strong> to get started.
                  </td>
                </tr>
              ) : (
                products.map((p) => {
                  const status = getStockStatus(p.quantity);
                  return (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-mono font-semibold text-gray-700">{p.sku}</td>
                      <td className="px-6 py-4 text-gray-800 font-medium">{p.name}</td>
                      <td className="px-6 py-4 text-right font-bold text-gray-900">{p.quantity}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${badgeStyle[status]}`}>
                          {status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-400">
                        {new Date(p.updatedAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          {/* Barcode */}
                          <button
                            onClick={() => setBarcodeProduct(p)}
                            title="View Barcode"
                            className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 transition-colors"
                          >
                            <Barcode size={17} />
                          </button>
                          {/* Edit */}
                          <button
                            onClick={() => setEditProduct(p)}
                            title="Edit Product"
                            className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 transition-colors"
                          >
                            <Pencil size={17} />
                          </button>
                          {/* Delete */}
                          <button
                            onClick={() => setDeleteTarget(p)}
                            title="Delete Product"
                            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Barcode Modal */}
      {barcodeProduct && (
        <BarcodeModal
          sku={barcodeProduct.sku}
          productName={barcodeProduct.name}
          onClose={() => setBarcodeProduct(null)}
        />
      )}

      {/* Edit Modal */}
      {editProduct && (
        <EditProductModal
          product={editProduct}
          onClose={() => setEditProduct(null)}
          onSaved={handleSaved}
        />
      )}

      {/* Delete Confirm Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-5">
            <div>
              <h3 className="text-base font-semibold text-gray-900">Delete Product?</h3>
              <p className="text-sm text-gray-500 mt-1">
                Are you sure you want to delete{' '}
                <strong>{deleteTarget.name}</strong> ({deleteTarget.sku})?
                This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-medium py-2.5 rounded-xl text-sm transition-colors disabled:opacity-60"
              >
                {deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                {deleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
