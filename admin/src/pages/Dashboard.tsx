import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface DashboardData {
  metrics: {
    totalUsers: number;
    totalListings: number;
    pendingListings: number;
    activeListings: number;
    rejectedListings: number;
    totalReports: number;
    totalFavorites: number;
    totalMessages: number;
  };
  recentListings: Array<{
    id: string;
    brand: string;
    model: string;
    price: number;
    status: string;
    createdAt: string;
  }>;
  recentActivity: Array<{
    type: string;
    description: string;
    createdAt: string;
  }>;
}

const COLORS = ['#10b981', '#f59e0b', '#ef4444'];

const METRIC_LABELS: Record<string, string> = {
  totalUsers: 'Total Users',
  totalListings: 'Total Listings',
  pendingListings: 'Pending',
  activeListings: 'Active',
  rejectedListings: 'Rejected',
  totalReports: 'Reports',
  totalFavorites: 'Favorites',
  totalMessages: 'Messages',
};

export function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<DashboardData>('/admin/dashboard')
      .then((res) => setData(res.data))
      .catch(() => setError('Failed to load dashboard data'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  if (error || !data) {
    return <div className="text-red-600">{error || 'Something went wrong'}</div>;
  }

  const { metrics } = data;

  const barData = [
    { name: 'Pending', value: metrics.pendingListings },
    { name: 'Active', value: metrics.activeListings },
    { name: 'Rejected', value: metrics.rejectedListings },
  ];

  const pieData = [
    { name: 'Active', value: metrics.activeListings },
    { name: 'Pending', value: metrics.pendingListings },
    { name: 'Rejected', value: metrics.rejectedListings },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(metrics).map(([key, value]) => (
          <div key={key} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-sm text-gray-500 font-medium">{METRIC_LABELS[key] || key}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{Number(value).toLocaleString()}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Listings by Status</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Status Distribution</h2>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                dataKey="value"
                label
              >
                {pieData.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent activity */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-4 md:px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">Recent Activity</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {data.recentActivity && data.recentActivity.length > 0 ? (
            data.recentActivity.map((activity, idx) => (
              <div key={idx} className="px-4 md:px-6 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900 capitalize">{activity.type}</p>
                  <p className="text-sm text-gray-500">{activity.description}</p>
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(activity.createdAt).toLocaleString()}
                </span>
              </div>
            ))
          ) : (
            <div className="px-4 md:px-6 py-8 text-center text-gray-500 text-sm">No recent activity</div>
          )}
        </div>
      </div>

      {/* Recent listings */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-4 md:px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">Recent Listings</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
              <tr>
                <th className="px-4 md:px-6 py-3">Brand</th>
                <th className="px-4 md:px-6 py-3">Model</th>
                <th className="px-4 md:px-6 py-3">Price</th>
                <th className="px-4 md:px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.recentListings && data.recentListings.length > 0 ? (
                data.recentListings.map((listing) => (
                  <tr key={listing.id} className="hover:bg-gray-50">
                    <td className="px-4 md:px-6 py-3 font-medium text-gray-900">{listing.brand}</td>
                    <td className="px-4 md:px-6 py-3 text-gray-600">{listing.model}</td>
                    <td className="px-4 md:px-6 py-3 text-gray-900">${Number(listing.price).toLocaleString()}</td>
                    <td className="px-4 md:px-6 py-3">
                      <StatusBadge status={listing.status} />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-4 md:px-6 py-8 text-center text-gray-500">
                    No recent listings
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
      {status}
    </span>
  );
}
