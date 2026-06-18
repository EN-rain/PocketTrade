import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

interface User {
  id: number;
  email: string;
  displayName?: string;
  role: string;
  accountStatus: 'active' | 'suspended' | string;
  suspensionReason?: string;
  createdAt: string;
}

interface UsersResponse {
  items: User[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

const PAGE_SIZE = 10;

export function Users() {
  const [items, setItems] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [suspendTarget, setSuspendTarget] = useState<User | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<User | null>(null);
  const [reason, setReason] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        params.set('page', String(page));
        params.set('limit', String(PAGE_SIZE));
        if (statusFilter) params.set('accountStatus', statusFilter);
        const res = await api.get<UsersResponse>(`/admin/users?${params.toString()}`);
        if (!cancelled) {
          setItems(res.data.items);
          setTotal(res.data.total);
        }
      } catch {
        if (!cancelled) setError('Failed to load users');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [page, statusFilter, refreshNonce]);

  const submitSuspend = async () => {
    if (!suspendTarget) return;
    setActionLoading(String(suspendTarget.id));
    try {
      await api.post(`/admin/users/${suspendTarget.id}/suspend`, { reason: reason.trim() || undefined });
      setSuspendTarget(null);
      setReason('');
      setRefreshNonce((n) => n + 1);
    } catch {
      setError('Failed to suspend user');
    } finally {
      setActionLoading(null);
    }
  };

  const submitRestore = async () => {
    if (!restoreTarget) return;
    setActionLoading(String(restoreTarget.id));
    try {
      await api.post(`/admin/users/${restoreTarget.id}/restore`);
      setRestoreTarget(null);
      setRefreshNonce((n) => n + 1);
    } catch {
      setError('Failed to restore user');
    } finally {
      setActionLoading(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-900"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {error && <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-200">{error}</div>}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
              <tr>
                <th className="px-4 md:px-6 py-3">ID</th>
                <th className="px-4 md:px-6 py-3">Email</th>
                <th className="px-4 md:px-6 py-3">Name</th>
                <th className="px-4 md:px-6 py-3">Role</th>
                <th className="px-4 md:px-6 py-3">Status</th>
                <th className="px-4 md:px-6 py-3">Created</th>
                <th className="px-4 md:px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 md:px-6 py-8 text-center">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900" />
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 md:px-6 py-8 text-center text-gray-500">
                    No users found
                  </td>
                </tr>
              ) : (
                items.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-4 md:px-6 py-3 font-mono text-xs text-gray-500">{user.id}</td>
                    <td className="px-4 md:px-6 py-3 text-gray-600">{user.email}</td>
                    <td className="px-4 md:px-6 py-3 text-gray-600">{user.displayName || '-'}</td>
                    <td className="px-4 md:px-6 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 capitalize">
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 md:px-6 py-3">
                      <StatusBadge status={user.accountStatus} />
                    </td>
                    <td className="px-4 md:px-6 py-3 text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 md:px-6 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        {user.accountStatus === 'active' ? (
                          <button
                            onClick={() => {
                              setSuspendTarget(user);
                              setReason('');
                            }}
                            disabled={actionLoading === String(user.id)}
                            className="px-2 py-1 text-xs font-medium bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 transition-colors"
                          >
                            Suspend
                          </button>
                        ) : (
                          <button
                            onClick={() => setRestoreTarget(user)}
                            disabled={actionLoading === String(user.id)}
                            className="px-2 py-1 text-xs font-medium bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 transition-colors"
                          >
                            Restore
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-4 md:px-6 py-3 border-t border-gray-200 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing {items.length} of {total} users
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
            >
              Prev
            </button>
            <span className="px-3 py-1 text-sm text-gray-600">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
      {(suspendTarget || restoreTarget) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4">
          <div className="admin-surface w-full max-w-md p-5">
            <h2 className="text-lg font-semibold text-slate-950">
              {suspendTarget ? 'Suspend user' : 'Restore user'}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {(suspendTarget ?? restoreTarget)?.email}
            </p>
            {suspendTarget && (
              <>
                <label className="mt-4 block text-sm font-medium text-slate-700">Reason</label>
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                />
              </>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => {
                  setSuspendTarget(null);
                  setRestoreTarget(null);
                  setReason('');
                }}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={suspendTarget ? submitSuspend : submitRestore}
                className="rounded-md bg-slate-950 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    suspended: 'bg-red-100 text-red-800',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
      {status}
    </span>
  );
}
