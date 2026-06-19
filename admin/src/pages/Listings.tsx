import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

interface Listing {
  id: number;
  brand: string;
  model: string;
  price: number;
  status: 'pending' | 'active' | 'rejected' | 'sold' | 'removed' | 'expired';
  createdAt: string;
  images: Array<{ imageUrl: string; displayOrder: number }>;
}

interface ListingsResponse {
  items: Listing[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

const PAGE_SIZE = 10;

export function Listings() {
  const [items, setItems] = useState<Listing[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [brands, setBrands] = useState<string[]>([]);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [rejectTarget, setRejectTarget] = useState<Listing | null>(null);
  const [priceTarget, setPriceTarget] = useState<Listing | null>(null);
  const [modalValue, setModalValue] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        params.set('page', String(page));
        params.set('limit', String(PAGE_SIZE));
        if (statusFilter) params.set('status', statusFilter);
        if (brandFilter) params.set('brand', brandFilter);
        const res = await api.get<ListingsResponse>(`/admin/listings?${params.toString()}`);
        if (!cancelled) {
          setItems(res.data.items);
          setTotal(res.data.total);
          if (!brandFilter && !statusFilter && page === 1) {
            const unique = Array.from(new Set(res.data.items.map((i) => i.brand)));
            setBrands(unique);
          }
        }
      } catch {
        if (!cancelled) setError('Failed to load listings');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [page, statusFilter, brandFilter, refreshNonce]);

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    try {
      await api.post(`/admin/listings/${id}/approve`);
      setRefreshNonce((n) => n + 1);
    } catch {
      setError('Failed to approve listing');
    } finally {
      setActionLoading(null);
    }
  };

  const submitReject = async () => {
    if (!rejectTarget) return;
    setActionLoading(String(rejectTarget.id));
    try {
      await api.post(`/admin/listings/${rejectTarget.id}/reject`, { reason: modalValue.trim() || undefined });
      setRejectTarget(null);
      setModalValue('');
      setRefreshNonce((n) => n + 1);
    } catch {
      setError('Failed to reject listing');
    } finally {
      setActionLoading(null);
    }
  };

  const handleStatus = async (id: number, action: 'remove' | 'restore') => {
    setActionLoading(String(id));
    try {
      await api.post(`/admin/listings/${id}/${action}`);
      setRefreshNonce((n) => n + 1);
    } catch {
      setError(`Failed to ${action} listing`);
    } finally {
      setActionLoading(null);
    }
  };

  const submitPrice = async () => {
    if (!priceTarget) return;
    const price = Number(modalValue);
    if (!Number.isInteger(price) || price < 1) {
      setError('Enter a valid whole-number price above zero');
      return;
    }
    setActionLoading(String(priceTarget.id));
    try {
      await api.patch(`/admin/listings/${priceTarget.id}`, { price });
      setPriceTarget(null);
      setModalValue('');
      setRefreshNonce((n) => n + 1);
    } catch {
      setError('Failed to update listing price');
    } finally {
      setActionLoading(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="admin-page-header">
        <h1 className="admin-page-title">Listings</h1>
        <div className="admin-toolbar">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="admin-filter w-full sm:w-auto"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="active">Active</option>
            <option value="rejected">Rejected</option>
            <option value="sold">Sold</option>
            <option value="removed">Removed</option>
            <option value="expired">Expired</option>
          </select>
          <select
            value={brandFilter}
            onChange={(e) => {
              setBrandFilter(e.target.value);
              setPage(1);
            }}
            className="admin-filter w-full sm:w-auto"
          >
            <option value="">All Brands</option>
            {brands.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-200">{error}</div>}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className={loading || items.length > 0 ? 'overflow-x-auto' : 'hidden'}>
          <table className="admin-table min-w-[1040px]">
            <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
              <tr>
                <th className="w-20">Thumbnail</th>
                <th className="w-20">ID</th>
                <th>Brand</th>
                <th>Model</th>
                <th>Price</th>
                <th>Status</th>
                <th>Created</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 md:px-6 py-8 text-center">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900" />
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td>
                      {item.images && item.images.length > 0 ? (
                        <img
                          src={item.images[0].imageUrl}
                          alt=""
                          className="h-10 w-10 rounded object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded bg-gray-200" />
                      )}
                    </td>
                    <td className="font-mono text-xs text-gray-500">{item.id}</td>
                    <td className="font-medium text-gray-900">{item.brand}</td>
                    <td className="max-w-[220px] truncate text-gray-600">{item.model}</td>
                    <td className="text-gray-900">₱{Number(item.price).toLocaleString('en-PH')}</td>
                    <td>
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="text-gray-500">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </td>
                    <td className="text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        {item.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApprove(String(item.id))}
                              disabled={actionLoading === String(item.id)}
                              className="px-2 py-1 text-xs font-medium bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 transition-colors"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => {
                                setRejectTarget(item);
                                setModalValue('');
                              }}
                              disabled={actionLoading === String(item.id)}
                              className="px-2 py-1 text-xs font-medium bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 transition-colors"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {item.status !== 'pending' && (
                          <>
                            <button
                              onClick={() => {
                                setPriceTarget(item);
                                setModalValue(String(item.price));
                              }}
                              className="px-2 py-1 text-xs font-medium bg-blue-600 text-white rounded"
                            >
                              Edit
                            </button>
                            {item.status !== 'removed' && <button onClick={() => handleStatus(item.id, 'remove')} className="px-2 py-1 text-xs font-medium bg-gray-700 text-white rounded">Remove</button>}
                            {item.status === 'removed' && <button onClick={() => handleStatus(item.id, 'restore')} className="px-2 py-1 text-xs font-medium bg-green-600 text-white rounded">Restore</button>}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!loading && items.length === 0 && (
          <div className="border-t border-gray-200 px-4 py-10 text-center text-sm text-gray-500">
            No listings found
          </div>
        )}

        {/* Pagination */}
        <div className="flex flex-col gap-3 border-t border-gray-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-gray-500">
            Showing {items.length} of {total} listings
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
      {(rejectTarget || priceTarget) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4">
          <div className="admin-surface w-full max-w-md p-5">
            <h2 className="text-lg font-semibold text-slate-950">
              {rejectTarget ? 'Reject listing' : 'Edit price'}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {rejectTarget
                ? `${rejectTarget.brand} ${rejectTarget.model}`
                : `${priceTarget?.brand ?? ''} ${priceTarget?.model ?? ''}`}
            </p>
            <label className="mt-4 block text-sm font-medium text-slate-700">
              {rejectTarget ? 'Reason' : 'Price'}
            </label>
            <input
              value={modalValue}
              onChange={(e) => setModalValue(e.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
              type={rejectTarget ? 'text' : 'number'}
              min={1}
            />
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => {
                  setRejectTarget(null);
                  setPriceTarget(null);
                  setModalValue('');
                }}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={rejectTarget ? submitReject : submitPrice}
                className="rounded-md bg-slate-950 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                Save
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
    pending: 'bg-yellow-100 text-yellow-800',
    active: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    sold: 'bg-blue-100 text-blue-800',
    removed: 'bg-gray-100 text-gray-800',
    expired: 'bg-gray-100 text-gray-800',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
      {status}
    </span>
  );
}
