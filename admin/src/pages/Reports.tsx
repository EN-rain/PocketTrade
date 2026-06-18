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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="px-3 py-2 border rounded-md bg-white">
          <option value="">All</option>
          <option value="pending">Pending</option>
          <option value="reviewed">Reviewed</option>
          <option value="dismissed">Dismissed</option>
        </select>
      </div>
      {error && <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-200">{error}</div>}
      {loading ? <div>Loading...</div> : (
        <div className="bg-white border rounded-lg divide-y">
          {items.map((r) => (
            <div key={r.id} className="p-4 space-y-2">
              <div className="flex justify-between gap-4">
                <div>
                  <p className="font-semibold">{r.reason} <span className="text-sm text-gray-500">#{r.id}</span></p>
                  <p className="text-sm text-gray-600">{r.details || 'No details'}</p>
                  <p className="text-xs text-gray-500">Reporter: {r.reporter?.email}</p>
                </div>
                <span className="text-sm capitalize">{r.status}</span>
              </div>
              {r.conversation?.messages?.length ? (
                <div className="bg-gray-50 rounded p-3 text-sm max-h-40 overflow-auto">
                  {r.conversation.messages.map((m: any) => <p key={m.id}><b>{m.senderId}:</b> {m.content}</p>)}
                </div>
              ) : null}
              <div className="flex gap-2">
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
