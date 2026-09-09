'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users, UserCheck, Shield, UserX, Clock, RefreshCw, Loader2,
  Search, X, Plus, Trash2, CheckCircle2, ShieldAlert
} from 'lucide-react';
import Pagination from '@/components/Pagination';

interface Member {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'STAFF';
  status: 'PENDING' | 'ACTIVE' | 'DISABLED';
  createdAt: string;
  updatedAt: string;
}

export default function AdminUsersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // Filters & Pagination
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'ACTIVE' | 'DISABLED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal State for directly adding a user
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'STAFF' | 'ADMIN'>('STAFF');
  const [adding, setAdding] = useState(false);
  const [modalError, setModalError] = useState('');

  // Action in progress (by member id)
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || 'Failed to load members.');
        setMembers([]);
      } else {
        setMembers(Array.isArray(data?.users) ? data.users : []);
      }
    } catch {
      setError('Connection timeout. The database may be waking up from suspend mode — please click Refresh to retry.');
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await fetch('/api/admin/users');
        const data = await res.json();
        if (ignore) return;
        if (!res.ok) {
          setError(data?.error || 'Failed to load members.');
          setMembers([]);
        } else {
          setMembers(Array.isArray(data?.users) ? data.users : []);
        }
      } catch {
        if (!ignore) {
          setError('Connection timeout. The database may be waking up from suspend mode — please click Refresh to retry.');
          setMembers([]);
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

  // Status counts
  const counts = useMemo(() => {
    let pending = 0;
    let active = 0;
    let disabled = 0;
    let admins = 0;

    for (const m of members) {
      if (m.status === 'PENDING') pending++;
      else if (m.status === 'ACTIVE') {
        active++;
        if (m.role === 'ADMIN') admins++;
      } else if (m.status === 'DISABLED') disabled++;
    }

    return { total: members.length, pending, active, disabled, admins };
  }, [members]);

  // Update member role / status
  const handleUpdate = async (id: string, updates: { role?: string; status?: string }) => {
    setBusyId(id);
    setActionSuccess('');
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = await res.json();

      if (!res.ok) {
        alert(data?.error || 'Failed to update member.');
      } else {
        setMembers((prev) =>
          prev.map((m) => (m.id === id ? { ...m, ...data.user } : m))
        );
        setActionSuccess('Member updated successfully.');
        setTimeout(() => setActionSuccess(''), 4000);
      }
    } catch {
      alert('Network error while updating member.');
    } finally {
      setBusyId(null);
    }
  };

  // Delete member
  const handleDelete = async (member: Member) => {
    if (!confirm(`Are you sure you want to permanently remove "${member.name}" (${member.email})?`)) {
      return;
    }

    setBusyId(member.id);
    try {
      const res = await fetch(`/api/admin/users/${member.id}`, { method: 'DELETE' });
      const data = await res.json();

      if (!res.ok) {
        alert(data?.error || 'Failed to delete member.');
      } else {
        setMembers((prev) => prev.filter((m) => m.id !== member.id));
        setActionSuccess(`Member "${member.name}" was removed.`);
        setTimeout(() => setActionSuccess(''), 4000);
      }
    } catch {
      alert('Network error while deleting member.');
    } finally {
      setBusyId(null);
    }
  };

  // Handle directly creating a member
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newEmail || !newPassword) {
      setModalError('Please fill in all fields.');
      return;
    }

    setAdding(true);
    setModalError('');

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName,
          email: newEmail,
          password: newPassword,
          role: newRole,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setModalError(data?.error || 'Failed to add member.');
        setAdding(false);
        return;
      }

      setMembers((prev) => [data.user, ...prev]);
      setShowAddModal(false);
      setNewName('');
      setNewEmail('');
      setNewPassword('');
      setNewRole('STAFF');
      setActionSuccess(`Member ${data.user.name} added successfully.`);
      setTimeout(() => setActionSuccess(''), 4000);
    } catch {
      setModalError('Network error while adding member.');
    } finally {
      setAdding(false);
    }
  };

  // Filtered members
  const filteredMembers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return members.filter((m) => {
      const matchesSearch =
        !q ||
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q);

      const matchesStatus = statusFilter === 'ALL' || m.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [members, searchQuery, statusFilter]);

  // Paginated members
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedMembers = useMemo(() => {
    return filteredMembers.slice(startIndex, startIndex + pageSize);
  }, [filteredMembers, startIndex, pageSize]);

  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-sm shadow-indigo-200">
              <Users size={22} />
            </div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Member Management</h1>
          </div>
          <p className="text-gray-500 text-sm mt-1">
            Approve newly registered members, assign roles (Staff or Admin), and manage member access
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={fetchMembers}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors disabled:opacity-50 shadow-sm"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin text-indigo-600' : ''} />
            Refresh
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors shadow-sm shadow-indigo-200"
          >
            <Plus size={16} />
            Add Member Directly
          </button>
        </div>
      </div>

      {/* Action Success Toast */}
      {actionSuccess && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 shadow-sm animate-in fade-in">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2">
          <div className="flex items-center gap-2 font-bold text-amber-800">
            <ShieldAlert size={16} />
            <span>Database Connection Notice</span>
          </div>
          <p className="text-amber-700 leading-relaxed">{error}</p>
          <button
            onClick={fetchMembers}
            className="px-3 py-1.5 rounded-lg bg-amber-600 text-white font-semibold text-xs hover:bg-amber-700 transition-colors"
          >
            Retry Loading Members
          </button>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl shadow p-5 flex items-center gap-4">
          <div className="bg-indigo-500 rounded-xl p-3 text-white">
            <Users size={22} />
          </div>
          <div>
            <p className="text-2xl font-black text-gray-900">{counts.total}</p>
            <p className="text-xs text-gray-500 font-medium">Total Registered</p>
          </div>
        </div>

        <div className={`rounded-2xl shadow p-5 flex items-center gap-4 border transition-all ${
          counts.pending > 0 ? 'bg-amber-50 border-amber-300' : 'bg-white border-transparent'
        }`}>
          <div className="bg-amber-500 rounded-xl p-3 text-white">
            <Clock size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-black text-gray-900">{counts.pending}</p>
              {counts.pending > 0 && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-200 text-amber-900">
                  Action Needed
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 font-medium">Pending Approval</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow p-5 flex items-center gap-4">
          <div className="bg-purple-600 rounded-xl p-3 text-white">
            <Shield size={22} />
          </div>
          <div>
            <p className="text-2xl font-black text-gray-900">{counts.admins}</p>
            <p className="text-xs text-gray-500 font-medium">Active Administrators</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow p-5 flex items-center gap-4">
          <div className="bg-emerald-500 rounded-xl p-3 text-white">
            <UserCheck size={22} />
          </div>
          <div>
            <p className="text-2xl font-black text-gray-900">{counts.active}</p>
            <p className="text-xs text-gray-500 font-medium">Active Total</p>
          </div>
        </div>
      </div>

      {/* Controls & Table Card */}
      <div className="bg-white rounded-2xl shadow overflow-hidden space-y-0">
        {/* Search & Status Filters */}
        <div className="p-5 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by member name or email..."
              className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setCurrentPage(1);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => {
                setStatusFilter('ALL');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                statusFilter === 'ALL'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All ({counts.total})
            </button>
            <button
              onClick={() => {
                setStatusFilter('PENDING');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                statusFilter === 'PENDING'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
              }`}
            >
              Pending Approval ({counts.pending})
            </button>
            <button
              onClick={() => {
                setStatusFilter('ACTIVE');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                statusFilter === 'ACTIVE'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              Active ({counts.active})
            </button>
            <button
              onClick={() => {
                setStatusFilter('DISABLED');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                statusFilter === 'DISABLED'
                  ? 'bg-gray-700 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Disabled ({counts.disabled})
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
              <tr>
                <th className="px-6 py-3.5 text-left">Member</th>
                <th className="px-6 py-3.5 text-left">Role</th>
                <th className="px-6 py-3.5 text-left">Status</th>
                <th className="px-6 py-3.5 text-left">Registered</th>
                <th className="px-6 py-3.5 text-right">Approval & Access Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && members.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                    <Loader2 size={24} className="animate-spin text-indigo-600 mx-auto mb-2" />
                    Loading members...
                  </td>
                </tr>
              ) : filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                    No members found matching your filter criteria.
                  </td>
                </tr>
              ) : (
                paginatedMembers.map((m) => {
                  const isBusy = busyId === m.id;
                  return (
                    <tr key={m.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0 uppercase text-xs">
                            {m.name.slice(0, 2)}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">{m.name}</p>
                            <p className="text-xs text-gray-500">{m.email}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                            m.role === 'ADMIN'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {m.role === 'ADMIN' && <Shield size={12} />}
                          {m.role}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        {m.status === 'PENDING' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                            <Clock size={12} />
                            Pending Approval
                          </span>
                        ) : m.status === 'ACTIVE' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                            <CheckCircle2 size={12} />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600">
                            <UserX size={12} />
                            Disabled
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-xs text-gray-400">
                        {new Date(m.createdAt).toLocaleDateString()}
                      </td>

                      <td className="px-6 py-4 text-right">
                        {isBusy ? (
                          <span className="text-xs text-indigo-600 flex items-center justify-end gap-1.5">
                            <Loader2 size={14} className="animate-spin" />
                            Updating...
                          </span>
                        ) : m.status === 'PENDING' ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleUpdate(m.id, { status: 'ACTIVE', role: 'STAFF' })}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-sm"
                            >
                              Approve as Staff
                            </button>
                            <button
                              onClick={() => handleUpdate(m.id, { status: 'ACTIVE', role: 'ADMIN' })}
                              className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-colors shadow-sm"
                            >
                              Approve as Admin
                            </button>
                            <button
                              onClick={() => handleDelete(m)}
                              title="Reject & Delete"
                              className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            {/* Role Switcher */}
                            <select
                              value={m.role}
                              onChange={(e) => handleUpdate(m.id, { role: e.target.value })}
                              className="text-xs bg-gray-50 border border-gray-200 text-gray-700 rounded-lg px-2.5 py-1 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                            >
                              <option value="STAFF">Role: STAFF</option>
                              <option value="ADMIN">Role: ADMIN</option>
                            </select>

                            {/* Enable / Disable Button */}
                            {m.status === 'ACTIVE' ? (
                              <button
                                onClick={() => handleUpdate(m.id, { status: 'DISABLED' })}
                                className="px-2.5 py-1 rounded-lg border border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100 text-xs font-semibold transition-colors"
                              >
                                Disable
                              </button>
                            ) : (
                              <button
                                onClick={() => handleUpdate(m.id, { status: 'ACTIVE' })}
                                className="px-2.5 py-1 rounded-lg border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 text-xs font-semibold transition-colors"
                              >
                                Enable
                              </button>
                            )}

                            {/* Delete Button */}
                            <button
                              onClick={() => handleDelete(m)}
                              title="Delete Member"
                              className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredMembers.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalItems={filteredMembers.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(s) => {
              setPageSize(s);
              setCurrentPage(1);
            }}
            pageSizeOptions={[10, 25, 50]}
          />
        )}
      </div>

      {/* Add Member Directly Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-7 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Add Member Directly</h3>
                <p className="text-xs text-gray-500">Create an active member account without waiting for approval</p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            {modalError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
                {modalError}
              </div>
            )}

            <form onSubmit={handleAddMember} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. David Miller"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Work Email</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="david@koaliving.com"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Temporary password"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Assigned Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as 'STAFF' | 'ADMIN')}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="STAFF">STAFF (Inventory scanning & management)</option>
                  <option value="ADMIN">ADMIN (Full access + Member approvals)</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adding}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {adding ? <Loader2 size={16} className="animate-spin" /> : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
