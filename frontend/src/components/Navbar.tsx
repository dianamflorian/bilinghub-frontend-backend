// ============================================================
// NAVBAR — Main navigation bar
// ============================================================

import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV_LINKS = [
  { to: '/', label: 'Plans', icon: '◈' },
  { to: '/dashboard', label: 'Dashboard', icon: '⊞' },
  { to: '/billing', label: 'Billing History', icon: '⊟' },
  { to: '/status', label: 'Payment Status', icon: '◉' },
];

const ADMIN_LINKS = [
  { to: '/admin', label: 'Admin', icon: '⚙' },
];

export function Navbar() {
  const { user, isAdmin, logout } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const allLinks = isAdmin ? [...NAV_LINKS, ...ADMIN_LINKS] : NAV_LINKS;

  return (
    <nav
      className="sticky top-0 z-40 w-full border-b border-white/10 backdrop-blur-md"
      style={{ background: 'rgba(3,7,18,0.85)' }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <span className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-brand-600/30 group-hover:bg-brand-500 transition-colors">
              B
            </span>
            <span className="font-bold text-white text-lg tracking-tight">
              Billing<span className="text-brand-400">Hub</span>
            </span>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-1">
            {allLinks.map(({ to, label, icon }) => {
              const isActive = location.pathname === to;
              return (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200
                    ${isActive
                      ? 'bg-brand-600/20 text-brand-300 border border-brand-500/30'
                      : 'text-gray-400 hover:text-gray-100 hover:bg-white/8'
                    }`}
                >
                  <span className="text-xs">{icon}</span>
                  {label}
                </Link>
              );
            })}
          </div>

          {/* User menu */}
          <div className="hidden md:flex items-center gap-3">
            {user && (
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-200 leading-none">{user.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{user.email}</p>
                </div>
                {isAdmin && (
                  <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-brand-600/30 text-brand-300 border border-brand-500/30">
                    Admin
                  </span>
                )}
                <button
                  onClick={logout}
                  className="ml-2 text-xs text-gray-500 hover:text-gray-300 transition-colors"
                  aria-label="Sign out"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/8 transition-colors"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {menuOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              }
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-white/10 py-3 space-y-1 animate-fade-in">
            {allLinks.map(({ to, label, icon }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                  ${location.pathname === to
                    ? 'bg-brand-600/20 text-brand-300'
                    : 'text-gray-400 hover:text-gray-100 hover:bg-white/8'
                  }`}
              >
                <span>{icon}</span>
                {label}
              </Link>
            ))}
            {user && (
              <div className="pt-2 mt-2 border-t border-white/10 flex items-center justify-between px-3">
                <div>
                  <p className="text-sm font-medium text-gray-200">{user.name}</p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                </div>
                <button onClick={logout} className="text-xs text-gray-500 hover:text-gray-300">
                  Sign out
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
