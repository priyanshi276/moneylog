import React, { useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { to: '/dashboard',    icon: '📊', label: 'Dashboard' },
  { to: '/transactions', icon: '💳', label: 'Transactions' },
];

const PAGE_TITLES = {
  '/dashboard':    { title: 'Dashboard',    sub: 'Your financial overview' },
  '/transactions': { title: 'Transactions', sub: 'All income & expense records' },
};

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const info = PAGE_TITLES[location.pathname] || { title: 'ExpenseTrack', sub: '' };

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  return (
    <div className="app-shell">
      {/* Overlay for mobile */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'show' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* ── Sidebar ── */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <div className="logo-mark">
            <div className="logo-icon">💰</div>
            <span className="logo-text">Expense<span>Track</span></span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <span className="nav-section-label">Menu</span>
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-card">
            <div className="user-avatar">{initials}</div>
            <div className="user-info">
              <div className="user-name">{user?.name}</div>
              <div className="user-email">{user?.email}</div>
            </div>
            <button className="logout-btn" onClick={logout} title="Log out">⎋</button>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="main-content">
        <div className="topbar">
          <div className="flex items-center gap-12">
            <button className="hamburger" onClick={() => setSidebarOpen(o => !o)}>☰</button>
            <div className="topbar-title">
              <h2>{info.title}</h2>
              {info.sub && <p>{info.sub}</p>}
            </div>
          </div>
          <div className="topbar-actions">
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </div>
          </div>
        </div>

        <div className="page-body">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
