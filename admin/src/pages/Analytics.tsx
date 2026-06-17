import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../lib/api.js';

export function Analytics() {
  const [data, setData] = useState<any>({ topTerms: [], zeroResults: [] });
  useEffect(() => { api.get('/admin/analytics/search').then((res) => setData(res.data)); }, []);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Search Analytics</h1>
      <div className="bg-white border rounded-lg p-4">
        <h2 className="font-semibold mb-4">Top Terms</h2>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data.topTerms}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="term" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="count" fill="#111827" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="bg-white border rounded-lg p-4">
        <h2 className="font-semibold mb-3">Zero-result Searches</h2>
        <div className="divide-y">{data.zeroResults.map((r: any) => <div key={r.id} className="py-2 text-sm">{r.searchTerm}</div>)}</div>
      </div>
    </div>
  );
}
