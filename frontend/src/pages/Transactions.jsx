import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '../utils/api';
import TransactionModal from '../components/TransactionModal';

const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

const CAT_ICON = {
  'Salary':'💼','Freelance':'💻','Business':'🏢','Investment':'📈','Gift':'🎁','Bonus':'⭐','Refund':'↩️',
  'Food & Dining':'🍽️','Transportation':'🚗','Shopping':'🛍️','Entertainment':'🎬','Bills & Utilities':'⚡',
  'Healthcare':'🏥','Education':'📚','Travel':'✈️','Groceries':'🛒','Rent':'🏠','Insurance':'🛡️',
  'Subscriptions':'📱','Other Income':'💵','Other Expense':'💸',
};

const PAGE_LIMIT = 15;

export default function Transactions() {
  const [data,       setData]       = useState({ data: [], total: 0, pages: 1 });
  const [loading,    setLoading]    = useState(true);
  const [page,       setPage]       = useState(1);
  const [filters,    setFilters]    = useState({ type: 'all', search: '', from: '', to: '', sort: 'date', order: 'desc' });
  const [modalOpen,  setModalOpen]  = useState(false);
  const [editData,   setEditData]   = useState(null);
  const [deleting,   setDeleting]   = useState(null);
  const searchTimer = useRef(null);

  const loadData = useCallback(async (pg = page, f = filters) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pg, limit: PAGE_LIMIT,
        sort: f.sort, order: f.order,
        ...(f.type !== 'all' && { type: f.type }),
        ...(f.search && { search: f.search }),
        ...(f.from   && { from: f.from }),
        ...(f.to     && { to:   f.to   }),
      });
      const res = await api.get(`/transactions?${params}`);
      setData(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [page, filters]);

  useEffect(() => { loadData(page, filters); }, [page]); // eslint-disable-line

  // Debounced search
  const handleSearch = (val) => {
    const f = { ...filters, search: val };
    setFilters(f);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setPage(1); loadData(1, f); }, 400);
  };

  const handleFilter = (key, val) => {
    const f = { ...filters, [key]: val };
    setFilters(f);
    setPage(1);
    loadData(1, f);
  };

  const openAdd  = ()     => { setEditData(null); setModalOpen(true); };
  const openEdit = (item) => { setEditData(item); setModalOpen(true); };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this transaction?')) return;
    setDeleting(id);
    try {
      await api.delete(`/transactions/${id}`);
      loadData(page, filters);
    } catch (e) { console.error(e); }
    finally { setDeleting(null); }
  };

  const handleSort = (col) => {
    const f = { ...filters, sort: col, order: filters.sort === col && filters.order === 'desc' ? 'asc' : 'desc' };
    setFilters(f);
    setPage(1);
    loadData(1, f);
  };

  const SortIcon = ({ col }) => filters.sort === col ? (filters.order === 'desc' ? ' ▼' : ' ▲') : ' ⇅';

  // Summary from current filtered set (all pages)
  const [totals, setTotals] = useState({ income: 0, expense: 0 });
  useEffect(() => {
    (async () => {
      const params = new URLSearchParams({
        limit: 9999, sort: filters.sort, order: filters.order,
        ...(filters.type !== 'all' && { type: filters.type }),
        ...(filters.search && { search: filters.search }),
        ...(filters.from   && { from: filters.from }),
        ...(filters.to     && { to:   filters.to   }),
      });
      try {
        const res = await api.get(`/transactions?${params}`);
        const all = res.data.data;
        setTotals({
          income:  all.filter(t => t.type === 'income') .reduce((s, t) => s + t.amount, 0),
          expense: all.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
        });
      } catch {}
    })();
  }, [filters]); // eslint-disable-line

  const pages = data.pages;

  return (
    <>
      <TransactionModal isOpen={modalOpen} onClose={() => setModalOpen(false)}
        onSaved={() => loadData(page, filters)} editData={editData} />

      <div className="page-header">
        <div>
          <h1>Transactions</h1>
          <p>{data.total} record{data.total !== 1 ? 's' : ''} found</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Transaction</button>
      </div>

      {/* ── Filter / summary strip ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        <div className="card" style={{ padding: '14px 18px' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>FILTERED INCOME</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--green)', fontFamily: 'Syne, sans-serif' }}>
            +{fmt(totals.income)}
          </div>
        </div>
        <div className="card" style={{ padding: '14px 18px' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>FILTERED EXPENSE</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--red)', fontFamily: 'Syne, sans-serif' }}>
            -{fmt(totals.expense)}
          </div>
        </div>
        <div className="card" style={{ padding: '14px 18px' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>NET BALANCE</div>
          <div style={{ fontSize: 20, fontWeight: 700,
            color: (totals.income - totals.expense) >= 0 ? 'var(--green)' : 'var(--red)',
            fontFamily: 'Syne, sans-serif' }}>
            {(totals.income - totals.expense) >= 0 ? '+' : ''}{fmt(totals.income - totals.expense)}
          </div>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="filter-bar">
        <div className="search-input-wrap">
          <span className="search-icon">🔍</span>
          <input type="text" className="form-control search-input"
            placeholder="Search description or category…"
            defaultValue={filters.search}
            onChange={e => handleSearch(e.target.value)} />
        </div>

        <select className="filter-select" value={filters.type} onChange={e => handleFilter('type', e.target.value)}>
          <option value="all">All Types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>

        <input type="date" className="filter-select" value={filters.from}
          onChange={e => handleFilter('from', e.target.value)} title="From date" style={{ width: 140 }} />

        <input type="date" className="filter-select" value={filters.to}
          onChange={e => handleFilter('to', e.target.value)} title="To date" style={{ width: 140 }} />

        {(filters.type !== 'all' || filters.search || filters.from || filters.to) && (
          <button className="btn btn-ghost btn-sm" onClick={() => {
            const f = { type: 'all', search: '', from: '', to: '', sort: 'date', order: 'desc' };
            setFilters(f); setPage(1); loadData(1, f);
          }}>✕ Clear</button>
        )}
      </div>

      {/* ── Table ── */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div className="loading-center"><span className="spinner" /></div>
        ) : data.data.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">🔍</span>
            <p className="empty-title">No transactions found</p>
            <p className="empty-sub">Try adjusting your filters or add a new transaction</p>
            <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={openAdd}>+ Add Transaction</button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="tx-table">
              <thead>
                <tr>
                  <th style={{ paddingLeft: 20 }}>Description</th>
                  <th>Category</th>
                  <th style={{ cursor: 'pointer' }} onClick={() => handleSort('type')}>
                    Type<SortIcon col="type" />
                  </th>
                  <th style={{ cursor: 'pointer' }} onClick={() => handleSort('amount')}>
                    Amount<SortIcon col="amount" />
                  </th>
                  <th style={{ cursor: 'pointer' }} onClick={() => handleSort('date')}>
                    Date<SortIcon col="date" />
                  </th>
                  <th style={{ width: 90, textAlign: 'right', paddingRight: 20 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map(tx => (
                  <tr key={tx.id}>
                    <td style={{ paddingLeft: 20 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className={`tx-icon ${tx.type}`} style={{ width: 32, height: 32, fontSize: 14, borderRadius: 8 }}>
                          {CAT_ICON[tx.category] || (tx.type === 'income' ? '💵' : '💸')}
                        </div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{tx.description}</div>
                          {tx.notes && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{tx.notes}</div>}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="tx-cat-badge">{tx.category}</span>
                    </td>
                    <td>
                      <span className={`type-badge ${tx.type}`}>
                        {tx.type === 'income' ? '↑' : '↓'} {tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}
                      </span>
                    </td>
                    <td className={`amount-cell ${tx.type}`}>
                      {tx.type === 'income' ? '+' : '-'}{fmt(tx.amount)}
                    </td>
                    <td style={{ color: 'var(--text-soft)', fontSize: 13 }}>
                      {new Date(tx.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td style={{ textAlign: 'right', paddingRight: 20 }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button className="icon-btn edit"   onClick={() => openEdit(tx)}>✎</button>
                        <button className="icon-btn delete" onClick={() => handleDelete(tx.id)}
                          disabled={deleting === tx.id}>
                          {deleting === tx.id ? '…' : '✕'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Pagination ── */}
      {pages > 1 && (
        <div className="pagination">
          <button className="page-btn" onClick={() => setPage(1)} disabled={page === 1}>«</button>
          <button className="page-btn" onClick={() => setPage(p => p - 1)} disabled={page === 1}>‹</button>

          {Array.from({ length: Math.min(pages, 7) }, (_, i) => {
            let p;
            if (pages <= 7) p = i + 1;
            else if (page <= 4) p = i + 1;
            else if (page >= pages - 3) p = pages - 6 + i;
            else p = page - 3 + i;
            return (
              <button key={p} className={`page-btn ${p === page ? 'current' : ''}`} onClick={() => setPage(p)}>{p}</button>
            );
          })}

          <button className="page-btn" onClick={() => setPage(p => p + 1)} disabled={page === pages}>›</button>
          <button className="page-btn" onClick={() => setPage(pages)} disabled={page === pages}>»</button>
        </div>
      )}

      {data.total > 0 && (
        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', marginTop: 12 }}>
          Showing {((page - 1) * PAGE_LIMIT) + 1}–{Math.min(page * PAGE_LIMIT, data.total)} of {data.total} transactions
        </p>
      )}
    </>
  );
}
