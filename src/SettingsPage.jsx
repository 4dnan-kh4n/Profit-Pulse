import { useEffect, useState } from 'react';
import ProfitPulseLogo from './ProfitPulseLogo.jsx';
import { apiRequest } from './api.js';

export default function SettingsPage() {
  const token = localStorage.getItem('profit-pulse-token');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [busy, setBusy] = useState(true);
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  useEffect(() => {
    if (!token) { window.location.hash = '#login'; return; }
    apiRequest('/auth/me', { token }).then(data => { setName(data.user.name || ''); setEmail(data.user.email || ''); setBusy(false); }).catch(error => { setMessage(error.message); setBusy(false); });
  }, [token]);
  async function save(event) {
    event.preventDefault(); setBusy(true); setMessage('');
    try {
      const data = await apiRequest('/auth/me', { method: 'PATCH', token: localStorage.getItem('profit-pulse-token'), body: { name } });
      localStorage.setItem('profit-pulse-user', JSON.stringify(data.user));
      setMessage('Your account name was saved.');
    } catch (error) { setMessage(error.message); } finally { setBusy(false); }
  }
  async function changePassword(event) {
    event.preventDefault(); setPasswordMessage('');
    if (newPassword !== confirmPassword) { setPasswordMessage('The new passwords do not match.'); return; }
    setPasswordBusy(true);
    try {
      const data = await apiRequest('/auth/password', { method: 'PATCH', token, body: { currentPassword, newPassword } });
      localStorage.setItem('profit-pulse-token', data.token);
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); setPasswordMessage(data.message);
    } catch (error) { setPasswordMessage(error.message); } finally { setPasswordBusy(false); }
  }
  function logout() { localStorage.removeItem('profit-pulse-token'); localStorage.removeItem('profit-pulse-user'); window.location.hash = '#home'; }
  return <main className="auth-page"><a className="auth-brand" href="#home" aria-label="Profit Pulse home"><ProfitPulseLogo /></a><section className="auth-panel"><a className="auth-back" href="#dashboard">← Back to dashboard</a><p className="onboarding-kicker">Account settings</p><h1>Your account.</h1><p className="auth-intro">Update the name shown in Profit Pulse. Your email address is linked to your account.</p><form onSubmit={save}><label>Your name<input required value={name} onChange={event => setName(event.target.value)} autoComplete="name" maxLength="80" /></label><label>Email address<input value={email} readOnly aria-readonly="true" autoComplete="email" /></label><button className="button-primary" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save name'}</button></form>{message && <p className="auth-message" role="status">{message}</p>}<form className="password-settings" onSubmit={changePassword}><h2>Change password</h2><p>Use at least 8 characters.</p><label>Current password<input required type="password" value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} autoComplete="current-password" minLength="8" maxLength="128" /></label><label>New password<input required type="password" value={newPassword} onChange={event => setNewPassword(event.target.value)} autoComplete="new-password" minLength="8" maxLength="128" /></label><label>Confirm new password<input required type="password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} autoComplete="new-password" minLength="8" maxLength="128" /></label><button className="button-primary" type="submit" disabled={passwordBusy}>{passwordBusy ? 'Updating…' : 'Update password'}</button>{passwordMessage && <p className="auth-message" role="status">{passwordMessage}</p>}</form><button className="logout-button" type="button" onClick={logout}>Log out</button></section></main>;
}
