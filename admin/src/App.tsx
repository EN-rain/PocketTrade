import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Activity } from './pages/Activity';
import { Analytics } from './pages/Analytics';
import { Dashboard } from './pages/Dashboard';
import { Listings } from './pages/Listings';
import { Login } from './pages/Login';
import { Reports } from './pages/Reports';
import { Users } from './pages/Users';

function protectedPage(child: React.ReactNode) {
  return (
    <ProtectedRoute>
      <Layout>{child}</Layout>
    </ProtectedRoute>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={protectedPage(<Dashboard />)} />
        <Route path="/listings" element={protectedPage(<Listings />)} />
        <Route path="/users" element={protectedPage(<Users />)} />
        <Route path="/reports" element={protectedPage(<Reports />)} />
        <Route path="/analytics" element={protectedPage(<Analytics />)} />
        <Route path="/activity" element={protectedPage(<Activity />)} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
