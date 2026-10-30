import { useState } from 'react';
import ProfitPulseLogo from './ProfitPulseLogo.jsx';
import { apiRequest } from './api.js';

export default function AuthPage({ mode }) {
  const signup = mode === 'signup';
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const update = event => setForm(current => ({ ...current, [event.target.name]: event.target.value }));
  async function submit(event) {
    event.preventDefault();
    if (signup && form.password !== form.confirmPassword) return setMessage('Your passwords do not match.');
    setBusy(true); setMessage('');
    try {
      const body = signup ? { name: form.name, email: form.email.trim(), password: form.password } : { email: form.email.trim(), password: form.password };
      const data = await apiRequest(`/auth/${signup ? 'signup' : 'login'}`, { method: 'POST', body });
      localStorage.setItem('profit-pulse-token', data.token);
      localStorage.setItem('profit-pulse-user', JSON.stringify(data.user));
      window.location.hash = '#get-started';
    } catch (error) { setMessage(error.message); } finally { setBusy(false); }
  }
  return <main className="auth-page"><a className="auth-brand" href="#home" aria-label="Profit Pulse home"><ProfitPulseLogo /></a><section className="auth-panel"><a className="auth-back" href="#home">← Back to home</a><p className="onboarding-kicker">{signup ? 'Create your account' : 'Welcome back'}</p><h1>{signup ? 'Start with your business.' : 'Log in to Profit Pulse.'}</h1><p className="auth-intro">{signup ? 'Create an account to set up your business and see your numbers.' : 'Enter your account details to continue to your business.'}</p><form onSubmit={submit}>{signup && <label>Your name<input required name="name" value={form.name} onChange={update} autoComplete="name" placeholder="Your name" /></label>}<label>Email address<input required name="email" value={form.email} onChange={update} type="email" autoComplete="email" placeholder="you@example.com" /></label><label>Password<span className="password-field"><input required name="password" value={form.password} onChange={update} type={showPassword ? 'text' : 'password'} minLength={8} autoComplete={signup ? 'new-password' : 'current-password'} placeholder={signup ? 'At least 8 characters' : 'Your password'} /><button type="button" onClick={() => setShowPassword(value => !value)}>{showPassword ? 'Hide' : 'Show'}</button></span>{signup && <small>Use at least 8 characters.</small>}</label>{signup && <label>Confirm password<input required name="confirmPassword" value={form.confirmPassword} onChange={update} type={showPassword ? 'text' : 'password'} minLength={8} autoComplete="new-password" placeholder="Repeat your password" /></label>}<button className="button-primary" type="submit" disabled={busy}>{busy ? 'Please wait…' : signup ? 'Create account' : 'Log in'}</button></form>{message && <p className="auth-message" role="alert">{message}</p>}<p className="auth-switch">{signup ? 'Already have an account?' : 'New to Profit Pulse?'} <a href={signup ? '#login' : '#signup'}>{signup ? 'Log in' : 'Sign up'}</a></p></section></main>;
}
