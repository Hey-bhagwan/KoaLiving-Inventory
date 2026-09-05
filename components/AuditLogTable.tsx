'use client';

import { InventoryLog } from '@/types';
import { RefreshCw, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';

interface AuditLogTableProps {
  logs: InventoryLog[];
  onRefresh: () => void;
  loading?: boolean;
}

export default function AuditLogTable({ logs: rawLogs, onRefresh, loading }: AuditLogTableProps) {
  const logs = Array.isArray(rawLogs) ? rawLogs : [];
  return (
    <div className="bg-white rounded-2xl shadow overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-800">Scan Audit Log</h2>
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
              <th className="px-6 py-3 text-left">Action</th>
              <th className="px-6 py-3 text-left">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-10 text-center text-gray-400">
                  No scan events yet. Use the Scanner to begin.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3 font-mono font-medium text-gray-700">{log.sku}</td>
                  <td className="px-6 py-3">
                    {log.type === 'INWARD' ? (
                      <span className="flex items-center gap-1.5 text-green-700 font-semibold">
                        <ArrowDownCircle size={15} />
                        INWARD +1
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-red-600 font-semibold">
                        <ArrowUpCircle size={15} />
                        OUTWARD -1
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-gray-400 text-xs">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
