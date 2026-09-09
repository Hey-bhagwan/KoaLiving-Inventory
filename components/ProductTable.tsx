'use client';

import { useState, useMemo } from 'react';
import { Product, getStockStatus, StockStatus } from '@/types';
import { RefreshCw, Search, X, ArrowUpDown, ArrowUp, ArrowDown, PackageSearch } from 'lucide-react';
import Pagination from '@/components/Pagination';

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

type SortField = 'sku' | 'name' | 'quantity' | 'status' | 'updatedAt';
type SortDirection = 'asc' | 'desc';

export default function ProductTable({ products, onRefresh, loading }: ProductTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | StockStatus>('ALL');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection(field === 'quantity' || field === 'updatedAt' ? 'desc' : 'asc');
    }
  };

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

  // Paginated slice
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
      return <ArrowUpDown size={13} className="text-gray-300 group-hover:text-gray-500 transition-colors" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp size={13} className="text-indigo-600" />
    ) : (
      <ArrowDown size={13} className="text-indigo-600" />
    );
  };

  return (
    <div className="bg-white rounded-2xl shadow overflow-hidden">
      {/* Table Header & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-gray-800">Inventory</h2>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full font-medium">
            {filteredProducts.length}{hasActiveFilters ? ` of ${products.length}` : ''}
          </span>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors disabled:opacity-50 self-start sm:self-auto"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Search & Filter Controls */}
      <div className="px-6 py-3.5 bg-gray-50/70 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search by name or SKU..."
            className="w-full pl-9 pr-8 py-1.5 text-sm bg-white rounded-xl border border-gray-200 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setCurrentPage(1);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600 rounded-full transition-colors"
              title="Clear search"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => {
              setStatusFilter('ALL');
              setCurrentPage(1);
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 ${
              statusFilter === 'ALL'
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200/80'
            }`}
          >
            All
            <span className="text-[10px] opacity-80">({counts.total})</span>
          </button>
          <button
            onClick={() => {
              setStatusFilter('In Stock');
              setCurrentPage(1);
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 ${
              statusFilter === 'In Stock'
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/60'
            }`}
          >
            In Stock
            <span className="text-[10px] opacity-80">({counts.inStock})</span>
          </button>
          <button
            onClick={() => {
              setStatusFilter('Low Stock');
              setCurrentPage(1);
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 ${
              statusFilter === 'Low Stock'
                ? 'bg-amber-500 text-white'
                : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200/60'
            }`}
          >
            Low
            <span className="text-[10px] opacity-80">({counts.lowStock})</span>
          </button>
          <button
            onClick={() => {
              setStatusFilter('Out of Stock');
              setCurrentPage(1);
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 ${
              statusFilter === 'Out of Stock'
                ? 'bg-rose-600 text-white'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200/60'
            }`}
          >
            Out
            <span className="text-[10px] opacity-80">({counts.outOfStock})</span>
          </button>
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium ml-1 underline"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs select-none">
            <tr>
              <th
                onClick={() => handleSort('sku')}
                className="px-6 py-3 text-left cursor-pointer hover:bg-gray-100 transition-colors group"
              >
                <div className="flex items-center gap-1.5">
                  <span>SKU</span>
                  {renderSortIcon('sku')}
                </div>
              </th>
              <th
                onClick={() => handleSort('name')}
                className="px-6 py-3 text-left cursor-pointer hover:bg-gray-100 transition-colors group"
              >
                <div className="flex items-center gap-1.5">
                  <span>Product Name</span>
                  {renderSortIcon('name')}
                </div>
              </th>
              <th
                onClick={() => handleSort('quantity')}
                className="px-6 py-3 text-right cursor-pointer hover:bg-gray-100 transition-colors group"
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>Quantity</span>
                  {renderSortIcon('quantity')}
                </div>
              </th>
              <th
                onClick={() => handleSort('status')}
                className="px-6 py-3 text-left cursor-pointer hover:bg-gray-100 transition-colors group"
              >
                <div className="flex items-center gap-1.5">
                  <span>Status</span>
                  {renderSortIcon('status')}
                </div>
              </th>
              <th
                onClick={() => handleSort('updatedAt')}
                className="px-6 py-3 text-left cursor-pointer hover:bg-gray-100 transition-colors group"
              >
                <div className="flex items-center gap-1.5">
                  <span>Last Updated</span>
                  {renderSortIcon('updatedAt')}
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {products.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-gray-400">
                  No products found. Add one on the Products page.
                </td>
              </tr>
            ) : filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center">
                  <div className="max-w-xs mx-auto flex flex-col items-center">
                    <PackageSearch size={22} className="text-gray-400 mb-2" />
                    <p className="text-sm font-semibold text-gray-700">No matching inventory</p>
                    <p className="text-xs text-gray-400 mt-0.5 mb-3">No products match your search or filter.</p>
                    <button
                      onClick={resetFilters}
                      className="px-3 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-semibold transition-colors"
                    >
                      Clear search & filter
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedProducts.map((p) => {
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
          pageSizeOptions={[10, 25, 50]}
        />
      )}
    </div>
  );
}
