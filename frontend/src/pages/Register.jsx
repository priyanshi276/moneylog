import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const navigate     = useNavigate();

  const [form,    setForm]    = useState({ name: '', email: '', password: '', confirm: '' });
  const [errors,  setErrors]  = useState({});
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = e => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    setErrors(er => ({ ...er, [e.target.name]: '' }));
  };

  const validate = () => {
    const errs = {};
    if (!form.name  || form.name.trim().length < 2) errs.name = 'Name must be at least 2 characters.';
    if (!form.email || !/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Enter a valid email.';
    if (!form.password || form.password.length < 6)  errs.password = 'Password must be at least 6 characters.';
    if (form.password !== form.confirm)              errs.confirm  = 'Passwords do not match.';
    return errs;
  };

  const handleSubmit = async e => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    try {
      await register(form.name, form.email, form.password);
      setSuccess('Account created! Redirecting…');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      const serverErrs = err.response?.data?.errors || {};
      setErrors(serverErrs);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="logo-icon">💰</div>
          <div className="auth-logo-text">Expense<span>Track</span></div>
        </div>

        <h1 className="auth-heading">Create account</h1>
        <p className="auth-sub">Start tracking your finances today</p>

        {success && <div className="alert alert-success">✓ {success}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Full name</label>
            <input type="text" name="name" className={`form-control ${errors.name ? 'error' : ''}`}
              placeholder="John Doe" value={form.name} onChange={handleChange} required />
            {errors.name && <p className="form-error">{errors.name}</p>}
          </div>

          <div className="form-group">
            <label className="form-label">Email address</label>
            <input type="email" name="email" className={`form-control ${errors.email ? 'error' : ''}`}
              placeholder="you@example.com" value={form.email} onChange={handleChange} required />
            {errors.email && <p className="form-error">{errors.email}</p>}
          </div>

          <div className="form-row">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Password</label>
              <input type="password" name="password" className={`form-control ${errors.password ? 'error' : ''}`}
                placeholder="Min. 6 characters" value={form.password} onChange={handleChange} required />
              {errors.password && <p className="form-error">{errors.password}</p>}
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Confirm password</label>
              <input type="password" name="confirm" className={`form-control ${errors.confirm ? 'error' : ''}`}
                placeholder="Repeat password" value={form.confirm} onChange={handleChange} required />
              {errors.confirm && <p className="form-error">{errors.confirm}</p>}
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: 20 }} disabled={loading}>
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account?{' '}
          <Link to="/login" className="auth-link">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
