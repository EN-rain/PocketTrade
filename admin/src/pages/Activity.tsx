import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

export function Activity() {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => { api.get('/admin/activity').then((res) => setItems(res.data.items)); }, []);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Activity Log</h1>
      <div className="bg-white border rounded-lg divide-y">
        {items.map((item) => (
          <div key={item.id} className="p-4">
            <p className="font-medium">{item.action}</p>
            <p className="text-sm text-gray-500">{item.targetType} #{item.targetId} by admin #{item.adminId}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
