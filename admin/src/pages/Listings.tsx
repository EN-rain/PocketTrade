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
      alert('Failed to approve listing');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string) => {
    const reason = window.prompt('Reason for rejection (optional):');
    if (reason === null) return;
    setActionLoading(id);
    try {
      await api.post(`/admin/listings/${id}/reject`, { reason: reason || undefined });
      setRefreshNonce((n) => n + 1);
    } catch {
      alert('Failed to reject listing');
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
      alert(`Failed to ${action} listing`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleEditPrice = async (id: number) => {
    const price = window.prompt('New price');
    if (!price) return;
    await api.patch(`/admin/listings/${id}`, { price: Number(price) });
    setRefreshNonce((n) => n + 1);
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Listings</h1>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-900"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="active">Active</option>
            <option value="rejected">Rejected</option>
          </select>
          <select
            value={brandFilter}
            onChange={(e) => {
              setBrandFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-900"
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
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
              <tr>
                <th className="px-4 md:px-6 py-3">Thumbnail</th>
                <th className="px-4 md:px-6 py-3">ID</th>
                <th className="px-4 md:px-6 py-3">Brand</th>
                <th className="px-4 md:px-6 py-3">Model</th>
                <th className="px-4 md:px-6 py-3">Price</th>
                <th className="px-4 md:px-6 py-3">Status</th>
                <th className="px-4 md:px-6 py-3">Created</th>
                <th className="px-4 md:px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 md:px-6 py-8 text-center">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900" />
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 md:px-6 py-8 text-center text-gray-500">
                    No listings found
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 md:px-6 py-3">
                      {item.images && item.images.length > 0 ? (
                        <img
                          src={item.images[0].imageUrl}
                          alt=""
                          className="w-10 h-10 rounded object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded bg-gray-200" />
                      )}
                    </td>
                    <td className="px-4 md:px-6 py-3 font-mono text-xs text-gray-500">{item.id}</td>
                    <td className="px-4 md:px-6 py-3 font-medium text-gray-900">{item.brand}</td>
                    <td className="px-4 md:px-6 py-3 text-gray-600">{item.model}</td>
                    <td className="px-4 md:px-6 py-3 text-gray-900">${Number(item.price).toLocaleString()}</td>
                    <td className="px-4 md:px-6 py-3">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="px-4 md:px-6 py-3 text-gray-500">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 md:px-6 py-3 text-right">
                      <div className="flex justify-end gap-2">
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
                              onClick={() => handleReject(String(item.id))}
                              disabled={actionLoading === String(item.id)}
                              className="px-2 py-1 text-xs font-medium bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 transition-colors"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {item.status !== 'pending' && (
                          <>
                            <button onClick={() => handleEditPrice(item.id)} className="px-2 py-1 text-xs font-medium bg-blue-600 text-white rounded">Edit</button>
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

        {/* Pagination */}
        <div className="px-4 md:px-6 py-3 border-t border-gray-200 flex items-center justify-between">
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
