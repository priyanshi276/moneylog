import React, { useState } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

export default function Settings() {
  const { user, refreshUser } = useAuth();

  const [profile, setProfile] = useState({ name: user?.name || '', email: user?.email || '' });
  const [profileErrs, setProfileErrs] = useState({});
  const [profileMsg,  setProfileMsg]  = useState('');
  const [profileLoading, setProfileLoading] = useState(false);

  const [pwd, setPwd] = useState({ current_password: '', new_password: '', confirm: '' });
  const [pwdErrs, setPwdErrs] = useState({});
  const [pwdMsg,  setPwdMsg]  = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);

  const saveProfile = async e => {
    e.preventDefault();
    setProfileErrs({}); setProfileMsg('');
    setProfileLoading(true);
    try {
      await api.put('/auth/profile', profile);
      await refreshUser();
      setProfileMsg('Profile updated.');
    } catch (err) {
      setProfileErrs(err.response?.data?.errors || {});
    } finally { setProfileLoading(false); }
  };

  const savePassword = async e => {
    e.preventDefault();
    setPwdErrs({}); setPwdMsg('');
    if (pwd.new_password !== pwd.confirm) return setPwdErrs({ confirm: 'Passwords do not match.' });
    setPwdLoading(true);
    try {
      await api.put('/auth/password', pwd);
      setPwdMsg('Password changed.');
      setPwd({ current_password: '', new_password: '', confirm: '' });
    } catch (err) {
      if (err.response?.status === 401) setPwdErrs({ current_password: 'Current password is incorrect.' });
      else setPwdErrs(err.response?.data?.errors || {});
    } finally { setPwdLoading(false); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 480 }}>
      <div className="card">
        <h3 className="section-title">Profile</h3>
        {profileMsg && <div className="alert alert-success">✓ {profileMsg}</div>}
        <form onSubmit={saveProfile}>
          <div className="form-group">
            <label className="form-label">Full name</label>
            <input className={`form-control ${profileErrs.name ? 'error' : ''}`}
              value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} />
            {profileErrs.name && <p className="form-error">{profileErrs.name}</p>}
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Email address</label>
            <input type="email" className={`form-control ${profileErrs.email ? 'error' : ''}`}
              value={profile.email} onChange={e => setProfile(p => ({ ...p, email: e.target.value }))} />
            {profileErrs.email && <p className="form-error">{profileErrs.email}</p>}
          </div>
          <button className="btn btn-primary" style={{ marginTop: 16 }} disabled={profileLoading}>
            {profileLoading ? 'Saving…' : 'Save Profile'}
          </button>
        </form>
      </div>

      <div className="card">
        <h3 className="section-title">Change Password</h3>
        {pwdMsg && <div className="alert alert-success">✓ {pwdMsg}</div>}
        <form onSubmit={savePassword}>
          <div className="form-group">
            <label className="form-label">Current password</label>
            <input type="password" className={`form-control ${pwdErrs.current_password ? 'error' : ''}`}
              value={pwd.current_password} onChange={e => setPwd(p => ({ ...p, current_password: e.target.value }))} />
            {pwdErrs.current_password && <p className="form-error">{pwdErrs.current_password}</p>}
          </div>
          <div className="form-group">
            <label className="form-label">New password</label>
            <input type="password" className={`form-control ${pwdErrs.new_password ? 'error' : ''}`}
              value={pwd.new_password} onChange={e => setPwd(p => ({ ...p, new_password: e.target.value }))} />
            {pwdErrs.new_password && <p className="form-error">{pwdErrs.new_password}</p>}
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Confirm new password</label>
            <input type="password" className={`form-control ${pwdErrs.confirm ? 'error' : ''}`}
              value={pwd.confirm} onChange={e => setPwd(p => ({ ...p, confirm: e.target.value }))} />
            {pwdErrs.confirm && <p className="form-error">{pwdErrs.confirm}</p>}
          </div>
          <button className="btn btn-primary" style={{ marginTop: 16 }} disabled={pwdLoading}>
            {pwdLoading ? 'Saving…' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  );
}