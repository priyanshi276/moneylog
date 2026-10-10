import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [pwd, setPwd] = useState({ new_password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async e => {
    e.preventDefault();
    setError('');
    if (pwd.new_password !== pwd.confirm) return setError('Passwords do not match.');
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, new_password: pwd.new_password });
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong.');
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-heading">Set new password</h1>
        {error && <div className="alert alert-error">⚠️ {error}</div>}
        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">New password</label>
            <input type="password" className="form-control" required
              value={pwd.new_password} onChange={e => setPwd(p => ({ ...p, new_password: e.target.value }))} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Confirm password</label>
            <input type="password" className="form-control" required
              value={pwd.confirm} onChange={e => setPwd(p => ({ ...p, confirm: e.target.value }))} />
          </div>
          <button className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: 20 }} disabled={loading}>
            {loading ? 'Saving…' : 'Reset Password'}
          </button>
        </form>
        <p className="auth-footer"><Link to="/login" className="auth-link">Back to sign in</Link></p>
      </div>
    </div>
  );
}