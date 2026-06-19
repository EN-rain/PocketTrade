import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

export function Activity() {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => { api.get('/admin/activity').then((res) => setItems(res.data.items)); }, []);
  return (
    <div className="space-y-6">
      <div className="admin-page-header">
        <h1 className="admin-page-title">Activity Log</h1>
      </div>
      <div className="bg-white border rounded-lg divide-y overflow-hidden">
        {items.map((item) => (
          <div key={item.id} className="grid gap-1 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <p className="font-medium">{item.action}</p>
            <p className="text-sm text-gray-500">{item.targetType} #{item.targetId} by admin #{item.adminId}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
