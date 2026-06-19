import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

export function Reports() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/admin/reports${status ? `?status=${status}` : ''}`);
      setItems(res.data.items ?? []);
    } catch {
      setError('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [status]);

  const resolve = async (id: number, next: string) => {
    await api.post(`/admin/reports/${id}/${next === 'dismissed' ? 'dismiss' : 'resolve'}`);
    await load();
  };

  return (
    <div className="space-y-6">
      <div className="admin-page-header">
        <h1 className="admin-page-title">Reports</h1>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="admin-filter w-full sm:w-auto">
          <option value="">All</option>
          <option value="pending">Pending</option>
          <option value="reviewed">Reviewed</option>
          <option value="dismissed">Dismissed</option>
        </select>
      </div>
      {error && <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-200">{error}</div>}
      {loading ? <div>Loading...</div> : (
        <div className="bg-white border rounded-lg divide-y overflow-hidden">
          {items.map((r) => (
            <div key={r.id} className="grid gap-3 p-4 lg:grid-cols-[minmax(0,1fr)_auto]">
              <div className="min-w-0 space-y-2">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold">{r.reason} <span className="text-sm text-gray-500">#{r.id}</span></p>
                    <p className="text-sm text-gray-600">{r.details || 'No details'}</p>
                    <p className="text-xs text-gray-500">Reporter: {r.reporter?.email}</p>
                  </div>
                  <span className="text-sm capitalize">{r.status}</span>
                </div>
                {r.conversation?.messages?.length ? (
                  <div className="max-h-40 overflow-auto rounded bg-gray-50 p-3 text-sm">
                    {r.conversation.messages.map((m: any) => <p key={m.id}><b>{m.senderId}:</b> {m.content}</p>)}
                  </div>
                ) : null}
              </div>
              <div className="flex gap-2 lg:items-start">
                <button onClick={() => resolve(r.id, 'reviewed')} className="px-3 py-1 bg-green-600 text-white rounded text-sm">Resolve</button>
                <button onClick={() => resolve(r.id, 'dismissed')} className="px-3 py-1 bg-gray-700 text-white rounded text-sm">Dismiss</button>
              </div>
            </div>
          ))}
          {items.length === 0 && <div className="p-8 text-center text-gray-500">No reports</div>}
        </div>
      )}
    </div>
  );
}
