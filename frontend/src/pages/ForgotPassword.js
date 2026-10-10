import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-heading">Reset password</h1>
        <p className="auth-sub">Enter your email and we'll send a reset link</p>

        {sent ? (
          <div className="alert alert-success">✓ If that email is registered, a reset link has been sent. Check the server console for the link (dev mode).</div>
        ) : (
          <form onSubmit={submit}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Email address</label>
              <input type="email" className="form-control" required
                value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <button className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: 20 }} disabled={loading}>
              {loading ? 'Sending…' : 'Send Reset Link'}
            </button>
          </form>
        )}

        <p className="auth-footer"><Link to="/login" className="auth-link">Back to sign in</Link></p>
      </div>
    </div>
  );
}