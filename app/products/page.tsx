'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import ProductForm from '@/components/ProductForm';
import EditProductModal from '@/components/EditProductModal';
import Pagination from '@/components/Pagination';
import { Product, getStockStatus, StockStatus } from '@/types';
import {
  Barcode, Pencil, Trash2, RefreshCw, ChevronDown, ChevronUp, Loader2,
  Search, X, ArrowUpDown, ArrowUp, ArrowDown, PackageSearch,
} from 'lucide-react';

// BarcodeModal uses bwip-js (canvas) — must be client-only
const BarcodeModal = dynamic(() => import('@/components/BarcodeModal'), { ssr: false });

const badgeStyle: Record<string, string> = {
  'In Stock': 'bg-green-100 text-green-800',
  'Low Stock': 'bg-yellow-100 text-yellow-800',
  'Out of Stock': 'bg-red-100 text-red-700',
};

type SortField = 'sku' | 'name' | 'quantity' | 'status' | 'updatedAt';
type SortDirection = 'asc' | 'desc';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [showForm, setShowForm] = useState(false);

  // Search, filter, and sort state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | StockStatus>('ALL');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal state
  const [barcodeProduct, setBarcodeProduct] = useState<Product | null>(null);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchProducts = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setLoading(true);
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
    } catch {
      setFetchError('Network error — could not reach the server.');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await fetch('/api/products');
        const data = await res.json();
        if (ignore) return;
        if (!res.ok) {
          setFetchError(data?.error || `API error ${res.status}`);
          setProducts([]);
        } else {
          setProducts(Array.isArray(data) ? data : []);
        }
      } catch {
        if (!ignore) {
          setFetchError('Network error — could not reach the server.');
          setProducts([]);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, []);

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

  // Status counts
  const counts = useMemo(() => {
    const total = products.length;
    let inStock = 0;
    let lowStock = 0;
    let outOfStock = 0;

    for (const p of products) {
      const s = getStockStatus(p.quantity);
      if (s === 'In Stock') inStock++;
      else if (s === 'Low Stock') lowStock++;
      else if (s === 'Out of Stock') outOfStock++;
    }

    return { total, inStock, lowStock, outOfStock };
  }, [products]);

  // Handle column sort toggle
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection(field === 'quantity' || field === 'updatedAt' ? 'desc' : 'asc');
    }
  };

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return products
      .filter((p) => {
        const matchesSearch =
          !query ||
          p.name.toLowerCase().includes(query) ||
          p.sku.toLowerCase().includes(query);

        const status = getStockStatus(p.quantity);
        const matchesStatus = statusFilter === 'ALL' || status === statusFilter;

        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        let cmp = 0;
        if (sortField === 'sku') {
          cmp = a.sku.localeCompare(b.sku);
        } else if (sortField === 'name') {
          cmp = a.name.localeCompare(b.name);
        } else if (sortField === 'quantity') {
          cmp = a.quantity - b.quantity;
        } else if (sortField === 'status') {
          cmp = getStockStatus(a.quantity).localeCompare(getStockStatus(b.quantity));
        } else if (sortField === 'updatedAt') {
          cmp = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
        }
        return sortDirection === 'asc' ? cmp : -cmp;
      });
  }, [products, searchQuery, statusFilter, sortField, sortDirection]);

  // Paginated products slice
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedProducts = useMemo(() => {
    return filteredProducts.slice(startIndex, startIndex + pageSize);
  }, [filteredProducts, startIndex, pageSize]);

  const hasActiveFilters = searchQuery.trim() !== '' || statusFilter !== 'ALL';

  const resetFilters = () => {
    setSearchQuery('');
    setStatusFilter('ALL');
    setCurrentPage(1);
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown size={14} className="text-gray-300 group-hover:text-gray-500 transition-colors" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp size={14} className="text-indigo-600" />
    ) : (
      <ArrowDown size={14} className="text-indigo-600" />
    );
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
            onClick={() => fetchProducts(true)}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors shadow-sm"
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

      {/* Search and Filters Section */}
      <div className="bg-white rounded-2xl shadow p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by product name or SKU..."
              className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setCurrentPage(1);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                title="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2 self-start md:self-auto">
            <span className="text-xs font-medium text-gray-500 whitespace-nowrap">Sort by:</span>
            <select
              value={`${sortField}-${sortDirection}`}
              onChange={(e) => {
                const [field, dir] = e.target.value.split('-') as [SortField, SortDirection];
                setSortField(field);
                setSortDirection(dir);
              }}
              className="text-sm bg-gray-50 border border-gray-200 text-gray-700 rounded-xl px-3 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors cursor-pointer"
            >
              <option value="name-asc">Name (A → Z)</option>
              <option value="name-desc">Name (Z → A)</option>
              <option value="sku-asc">SKU (A → Z)</option>
              <option value="sku-desc">SKU (Z → A)</option>
              <option value="quantity-desc">Quantity (High → Low)</option>
              <option value="quantity-asc">Quantity (Low → High)</option>
              <option value="updatedAt-desc">Recently Updated</option>
              <option value="updatedAt-asc">Oldest Updated</option>
            </select>
          </div>
        </div>

        {/* Status Filter Chips & Result Counter */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-gray-100">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setStatusFilter('ALL');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                statusFilter === 'ALL'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All Status
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                  statusFilter === 'ALL' ? 'bg-indigo-700 text-indigo-100' : 'bg-gray-200 text-gray-700'
                }`}
              >
                {counts.total}
              </span>
            </button>

            <button
              onClick={() => {
                setStatusFilter('In Stock');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                statusFilter === 'In Stock'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/50'
              }`}
            >
              In Stock
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                  statusFilter === 'In Stock' ? 'bg-emerald-700 text-emerald-100' : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {counts.inStock}
              </span>
            </button>

            <button
              onClick={() => {
                setStatusFilter('Low Stock');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                statusFilter === 'Low Stock'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200/50'
              }`}
            >
              Low Stock (≤10)
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                  statusFilter === 'Low Stock' ? 'bg-amber-600 text-amber-100' : 'bg-amber-100 text-amber-800'
                }`}
              >
                {counts.lowStock}
              </span>
            </button>

            <button
              onClick={() => {
                setStatusFilter('Out of Stock');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                statusFilter === 'Out of Stock'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200/50'
              }`}
            >
              Out of Stock (0)
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                  statusFilter === 'Out of Stock' ? 'bg-rose-700 text-rose-100' : 'bg-rose-100 text-rose-800'
                }`}
              >
                {counts.outOfStock}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span>
              Total results: <strong className="text-gray-800 font-semibold">{filteredProducts.length}</strong>
            </span>
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium underline flex items-center gap-1"
              >
                Reset filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-2xl shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs select-none">
              <tr>
                <th
                  onClick={() => handleSort('sku')}
                  className="px-6 py-3.5 text-left cursor-pointer hover:bg-gray-100 transition-colors group"
                >
                  <div className="flex items-center gap-1.5">
                    <span>SKU</span>
                    {renderSortIcon('sku')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('name')}
                  className="px-6 py-3.5 text-left cursor-pointer hover:bg-gray-100 transition-colors group"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Product Name</span>
                    {renderSortIcon('name')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('quantity')}
                  className="px-6 py-3.5 text-right cursor-pointer hover:bg-gray-100 transition-colors group"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Quantity</span>
                    {renderSortIcon('quantity')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('status')}
                  className="px-6 py-3.5 text-left cursor-pointer hover:bg-gray-100 transition-colors group"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Status</span>
                    {renderSortIcon('status')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('updatedAt')}
                  className="px-6 py-3.5 text-left cursor-pointer hover:bg-gray-100 transition-colors group"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Last Updated</span>
                    {renderSortIcon('updatedAt')}
                  </div>
                </th>
                <th className="px-6 py-3.5 text-center">Actions</th>
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
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="max-w-xs mx-auto flex flex-col items-center">
                      <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400 mb-3">
                        <PackageSearch size={24} />
                      </div>
                      <p className="text-base font-semibold text-gray-800">No matching products</p>
                      <p className="text-xs text-gray-400 mt-1 mb-4">
                        We couldn&apos;t find any products matching your search or filter criteria.
                      </p>
                      <button
                        onClick={resetFilters}
                        className="px-4 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-semibold transition-colors"
                      >
                        Reset search & filters
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedProducts.map((p) => {
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

        {/* Pagination Controls */}
        {filteredProducts.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalItems={filteredProducts.length}
            pageSize={pageSize}
            onPageChange={(page) => setCurrentPage(page)}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setCurrentPage(1);
            }}
            pageSizeOptions={[10, 25, 50, 100]}
          />
        )}
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
