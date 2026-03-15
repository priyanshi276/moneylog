import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import TransactionModal from '../components/TransactionModal';

// ─── Format helpers ────────────────────────────────────────────────────────────
const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);
const fmtShort = (n) => {
  if (n >= 1_00_000) return '₹' + (n / 1_00_000).toFixed(1) + 'L';
  if (n >= 1_000)    return '₹' + (n / 1_000).toFixed(1) + 'K';
  return '₹' + (n || 0).toFixed(0);
};

// ─── Donut chart colors ────────────────────────────────────────────────────────
const COLORS = ['#6366f1','#f43f5e','#f59e0b','#22c55e','#06b6d4','#ec4899'];

// ─── SVG Bar Chart ─────────────────────────────────────────────────────────────
function BarChart({ data }) {
  if (!data || data.length === 0) return <div className="empty-state"><span className="empty-icon">📊</span><p className="empty-sub">No data yet</p></div>;

  const W = 560, H = 200, pad = { top: 10, right: 8, bottom: 40, left: 10 };
  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top - pad.bottom;

  const maxVal = Math.max(...data.map(d => Math.max(d.income, d.expense)), 1);
  const barGroupW = chartW / data.length;
  const barW      = Math.min(barGroupW * 0.3, 24);
  const gap       = barW * 0.25;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="bar-chart-svg" style={{ height: 200 }}>
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map(f => {
        const y = pad.top + chartH * (1 - f);
        return <line key={f} x1={pad.left} x2={W - pad.right} y1={y} y2={y}
          stroke="rgba(255,255,255,0.05)" strokeWidth="1" />;
      })}

      {data.map((d, i) => {
        const cx      = pad.left + barGroupW * i + barGroupW / 2;
        const incH    = (d.income  / maxVal) * chartH;
        const expH    = (d.expense / maxVal) * chartH;
        const incX    = cx - barW - gap / 2;
        const expX    = cx + gap / 2;
        const incY    = pad.top + chartH - incH;
        const expY    = pad.top + chartH - expH;

        return (
          <g key={i}>
            {/* Income bar */}
            {incH > 0 && (
              <g>
                <rect x={incX} y={incY} width={barW} height={incH} rx="4" fill="#22c55e" opacity="0.85" />
                {incH > 20 && <text x={incX + barW / 2} y={incY - 4} textAnchor="middle" className="bar-chart-value">{fmtShort(d.income)}</text>}
              </g>
            )}
            {/* Expense bar */}
            {expH > 0 && (
              <g>
                <rect x={expX} y={expY} width={barW} height={expH} rx="4" fill="#f43f5e" opacity="0.85" />
                {expH > 20 && <text x={expX + barW / 2} y={expY - 4} textAnchor="middle" className="bar-chart-value">{fmtShort(d.expense)}</text>}
              </g>
            )}
            {/* Label */}
            <text x={cx} y={H - 8} textAnchor="middle" className="bar-chart-label">{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── SVG Donut Chart ───────────────────────────────────────────────────────────
function DonutChart({ data }) {
  if (!data || data.length === 0) return (
    <div className="empty-state" style={{ padding: '32px 0' }}>
      <span className="empty-icon">🍩</span>
      <p className="empty-sub">No expense data</p>
    </div>
  );

  const total = data.reduce((s, d) => s + d.amount, 0);
  const R = 70, r = 44, cx = 80, cy = 80;
  let startAngle = -Math.PI / 2;

  const slices = data.map((d, i) => {
    const angle = (d.amount / total) * 2 * Math.PI;
    const x1 = cx + R * Math.cos(startAngle);
    const y1 = cy + R * Math.sin(startAngle);
    const endA = startAngle + angle;
    const x2 = cx + R * Math.cos(endA);
    const y2 = cy + R * Math.sin(endA);
    const xi1 = cx + r * Math.cos(endA);
    const yi1 = cy + r * Math.sin(endA);
    const xi2 = cx + r * Math.cos(startAngle);
    const yi2 = cy + r * Math.sin(startAngle);
    const large = angle > Math.PI ? 1 : 0;

    const d_path = `M ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} L ${xi1} ${yi1} A ${r} ${r} 0 ${large} 0 ${xi2} ${yi2} Z`;
    startAngle = endA;
    return { path: d_path, color: COLORS[i % COLORS.length], name: d.name, amount: d.amount, pct: Math.round((d.amount / total) * 100) };
  });

  return (
    <div className="donut-wrap">
      <div className="donut-chart-container">
        <svg viewBox="0 0 160 160" className="donut-svg" style={{ width: 120, height: 120, flexShrink: 0 }}>
          {slices.map((s, i) => (
            <path key={i} d={s.path} fill={s.color} opacity="0.9" stroke="var(--surface2)" strokeWidth="2" />
          ))}
          <circle cx={cx} cy={cy} r={r - 6} fill="var(--surface2)" />
          <text x={cx} y={cy - 4} textAnchor="middle" fill="var(--text)" style={{ fontFamily: 'Outfit, sans-serif', fontSize: 13, fontWeight: 700 }}>
            {fmtShort(total)}
          </text>
          <text x={cx} y={cy + 12} textAnchor="middle" fill="var(--text-muted)" style={{ fontFamily: 'Outfit, sans-serif', fontSize: 9 }}>
            total spent
          </text>
        </svg>

        <div className="donut-labels" style={{ flex: 1 }}>
          {slices.map((s, i) => (
            <div key={i} className="donut-label-item">
              <div className="donut-color-dot" style={{ background: s.color }} />
              <span className="donut-label-name">{s.name}</span>
              <span className="donut-label-amount">{fmtShort(s.amount)}</span>
              <span className="donut-label-pct">{s.pct}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Category icon map ─────────────────────────────────────────────────────────
const CAT_ICON = {
  'Salary':'💼','Freelance':'💻','Business':'🏢','Investment':'📈','Gift':'🎁','Bonus':'⭐','Refund':'↩️',
  'Food & Dining':'🍽️','Transportation':'🚗','Shopping':'🛍️','Entertainment':'🎬','Bills & Utilities':'⚡',
  'Healthcare':'🏥','Education':'📚','Travel':'✈️','Groceries':'🛒','Rent':'🏠','Insurance':'🛡️',
  'Subscriptions':'📱','Other Income':'💵','Other Expense':'💸',
};

function RecentTx({ item, onEdit, onDelete }) {
  return (
    <div className="tx-item">
      <div className={`tx-icon ${item.type}`}>
        {CAT_ICON[item.category] || (item.type === 'income' ? '💵' : '💸')}
      </div>
      <div className="tx-info">
        <div className="tx-desc">{item.description}</div>
        <div className="tx-meta">
          <span>{new Date(item.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
          <span>·</span>
          <span className="tx-cat-badge">{item.category}</span>
        </div>
      </div>
      <div className={`tx-amount ${item.type}`}>
        {item.type === 'income' ? '+' : '-'}{fmt(item.amount)}
      </div>
      <div className="tx-actions">
        <button className="icon-btn edit"   onClick={() => onEdit(item)}>✎</button>
        <button className="icon-btn delete" onClick={() => onDelete(item.id)}>✕</button>
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [summary, setSummary]     = useState(null);
  const [loading, setLoading]     = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editData,  setEditData]  = useState(null);

  const loadSummary = useCallback(async () => {
    try {
      const res = await api.get('/summary');
      setSummary(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSummary(); }, [loadSummary]);

  const openAdd  = ()     => { setEditData(null); setModalOpen(true); };
  const openEdit = (item) => { setEditData(item); setModalOpen(true); };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this transaction?')) return;
    try { await api.delete(`/transactions/${id}`); loadSummary(); } catch (e) { console.error(e); }
  };

  if (loading) return <div className="loading-center"><span className="spinner" /></div>;

  const s = summary || {};
  const savingsRate = s.totalIncome > 0 ? Math.round(((s.totalIncome - s.totalExpense) / s.totalIncome) * 100) : 0;

  return (
    <>
      <TransactionModal isOpen={modalOpen} onClose={() => setModalOpen(false)} onSaved={loadSummary} editData={editData} />

      {/* ── Summary Cards ── */}
      <div className="summary-grid">
        <div className="summary-card balance">
          <div className="summary-icon">💎</div>
          <div className="summary-info">
            <div className="summary-label">Net Balance</div>
            <div className="summary-value">{fmtShort(s.balance)}</div>
            <div className="summary-sub">All time</div>
          </div>
        </div>
        <div className="summary-card income">
          <div className="summary-icon">↑</div>
          <div className="summary-info">
            <div className="summary-label">Total Income</div>
            <div className="summary-value">{fmtShort(s.totalIncome)}</div>
            <div className="summary-sub">This month: {fmtShort(s.monthIncome)}</div>
          </div>
        </div>
        <div className="summary-card expense">
          <div className="summary-icon">↓</div>
          <div className="summary-info">
            <div className="summary-label">Total Expenses</div>
            <div className="summary-value">{fmtShort(s.totalExpense)}</div>
            <div className="summary-sub">This month: {fmtShort(s.monthExpense)}</div>
          </div>
        </div>
        <div className="summary-card month">
          <div className="summary-icon">📈</div>
          <div className="summary-info">
            <div className="summary-label">Savings Rate</div>
            <div className="summary-value">{savingsRate}%</div>
            <div className="summary-sub">{savingsRate >= 20 ? 'Great job! 🎉' : savingsRate >= 10 ? 'Keep going!' : 'Try to save more'}</div>
          </div>
        </div>
      </div>

      {/* ── Charts + Recent ── */}
      <div className="dashboard-grid">

        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Bar Chart */}
          <div className="card">
            <div className="chart-header">
              <div>
                <h3>Income vs Expenses</h3>
                <p>Last 6 months comparison</p>
              </div>
              <div className="chart-legend">
                <div className="legend-item">
                  <div className="legend-dot" style={{ background: '#22c55e' }} /> Income
                </div>
                <div className="legend-item">
                  <div className="legend-dot" style={{ background: '#f43f5e' }} /> Expense
                </div>
              </div>
            </div>
            <BarChart data={s.monthlyData} />
          </div>

          {/* Recent Transactions */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 className="section-title" style={{ margin: 0 }}>Recent Transactions</h3>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Your latest activity</p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary btn-sm" onClick={openAdd}>+ Add</button>
                <Link to="/transactions" className="btn btn-ghost btn-sm">View all →</Link>
              </div>
            </div>

            {s.recent?.length > 0 ? (
              <div className="tx-list">
                {s.recent.map(item => (
                  <RecentTx key={item.id} item={item} onEdit={openEdit} onDelete={handleDelete} />
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <span className="empty-icon">💳</span>
                <p className="empty-title">No transactions yet</p>
                <p className="empty-sub">Add your first income or expense to get started</p>
                <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={openAdd}>
                  + Add Transaction
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Quick Add button */}
          <button className="btn btn-primary btn-lg" style={{ width: '100%' }} onClick={openAdd}>
            + Add Transaction
          </button>

          {/* Donut Chart */}
          <div className="card">
            <div className="chart-header" style={{ marginBottom: 16 }}>
              <div>
                <h3>Spending by Category</h3>
                <p>All time breakdown</p>
              </div>
            </div>
            <DonutChart data={s.byCategory} />
          </div>

          {/* This month summary */}
          <div className="card">
            <div className="chart-header" style={{ marginBottom: 12 }}>
              <div>
                <h3>This Month</h3>
                <p>{new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}</p>
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 13, color: 'var(--text-soft)' }}>Income</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--green)' }}>+{fmt(s.monthIncome)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 13, color: 'var(--text-soft)' }}>Expenses</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--red)' }}>-{fmt(s.monthExpense)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0' }}>
                <span style={{ fontSize: 13, color: 'var(--text-soft)' }}>Net</span>
                <span style={{ fontSize: 16, fontWeight: 800, fontFamily: 'Syne, sans-serif',
                  color: (s.monthIncome - s.monthExpense) >= 0 ? 'var(--green)' : 'var(--red)' }}>
                  {(s.monthIncome - s.monthExpense) >= 0 ? '+' : ''}{fmt(s.monthIncome - s.monthExpense)}
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
