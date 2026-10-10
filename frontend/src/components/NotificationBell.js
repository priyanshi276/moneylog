import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../utils/api';

export default function NotificationBell() {
  const [items, setItems]   = useState([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen]     = useState(false);
  const ref = useRef(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/notifications');
      setItems(res.data.data);
      setUnread(res.data.unread);
    } catch {}
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000); // poll every 30s
    return () => clearInterval(interval);
  }, [load]);

  useEffect(() => {
    const onClick = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const markRead = async (id) => {
    await api.put(`/notifications/${id}/read`);
    load();
  };

  const markAllRead = async () => {
    await api.put('/notifications/read-all');
    load();
  };

  return (
    <div style={{ position: 'relative' }} ref={ref}>
      <button className="icon-btn" onClick={() => setOpen(o => !o)} style={{ position: 'relative' }}>
        🔔
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -4, background: 'var(--red)', color: '#fff',
            fontSize: 10, fontWeight: 700, borderRadius: 10, minWidth: 16, height: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px',
          }}>{unread}</span>
        )}
      </button>

      {open && (
        <div className="card" style={{
          position: 'absolute', right: 0, top: 44, width: 320, maxHeight: 400, overflowY: 'auto',
          zIndex: 300, padding: 12, boxShadow: 'var(--shadow-lg)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <strong style={{ fontSize: 13 }}>Notifications</strong>
            {unread > 0 && <button className="btn btn-ghost btn-sm" onClick={markAllRead}>Mark all read</button>}
          </div>
          {items.length === 0 ? (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', padding: '16px 0', textAlign: 'center' }}>No notifications yet</p>
          ) : items.map(n => (
            <div key={n.id} onClick={() => !n.read && markRead(n.id)}
              style={{
                padding: '10px 8px', borderRadius: 8, cursor: n.read ? 'default' : 'pointer',
                background: n.read ? 'transparent' : 'var(--green-dim)', marginBottom: 4, fontSize: 12.5,
              }}>
              <div style={{ color: 'var(--text)' }}>{n.message}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 10, marginTop: 2 }}>
                {new Date(n.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}