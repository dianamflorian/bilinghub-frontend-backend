// ============================================================
// APP — React Router setup with all 6 pages
// ============================================================

import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './components/Toast';

// Lazy load pages for performance
import PlansPage from './pages/PlansPage';
import DashboardPage from './pages/DashboardPage';
import BillingHistoryPage from './pages/BillingHistoryPage';
import PaymentStatusPage from './pages/PaymentStatusPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';

function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center glass-card p-12 max-w-md">
        <p className="text-6xl font-bold text-brand-400 mb-4">404</p>
        <h1 className="text-2xl font-bold text-white mb-2">Page not found</h1>
        <p className="text-gray-400 mb-8">The page you're looking for doesn't exist.</p>
        <a href="/" className="btn-primary">Go to Plans</a>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-1">
              <Routes>
                <Route path="/"          element={<PlansPage />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/billing"   element={<BillingHistoryPage />} />
                <Route path="/status"    element={<PaymentStatusPage />} />
                <Route path="/admin"     element={<AdminDashboardPage />} />
                <Route path="*"          element={<NotFound />} />
              </Routes>
            </main>

            {/* Footer */}
            <footer className="border-t border-white/8 py-6 text-center">
              <p className="text-xs text-gray-600">
                © 2026 BillingHub · Powered by{' '}
                <span className="text-brand-400">Stripe</span>
                {' '}·{' '}
                <a href="/status" className="hover:text-gray-400 transition-colors">System Status</a>
              </p>
            </footer>
          </div>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
