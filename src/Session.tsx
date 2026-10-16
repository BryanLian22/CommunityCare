import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, type User } from './api';
import App from './App';
import Admin from './Admin';
import './account.css';
type SessionValue = { user: User; updateUser: (user: User) => void; logout: () => Promise<void> };
const SessionContext = createContext<SessionValue | null>(null);
export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error('Sign in first.');
  return value;
}
export default function Session() {
  const [user, setUser] = useState<User | null>(null), [loading, setLoading] = useState(true), [admin, setAdmin] = useState(true), [error, setError] = useState('');
  async function check() {
    setLoading(true);
    setError('');
    try {
      const r = await api<{ user: User }>('/auth/me');
      setUser(r.user)
    } catch (e) {
      if (!String(e).includes('Please sign in')) setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    void check();
    const expire = () => {
      setUser(null);
      setError('Your session ended. Please sign in again.')
    };
    window.addEventListener('session-expired', expire);
    return () => window.removeEventListener('session-expired', expire)
  }, []);
  async function logout() {
    try {
      await api('/auth/logout', 'POST', {});
      setUser(null);
      setAdmin(true)
    } catch (e) {
      setError((e as Error).message)
    }
  }
  if (loading) return <div className="account-stage"><div className="account-card" role="status">Loading CommunityCare…</div></div>;
  if (!user) return <Auth onSuccess={u => {
    setUser(u);
    setAdmin(true);
    setError('')
  }} banner={error} />;
  return <SessionContext.Provider value={{ user, updateUser: setUser, logout }}>
    <div className="session-toolbar">
      <span>{user.name} · {user.role === 'admin' ? 'Administrator' : 'Resident'}</span>
      <div>
        {user.role === 'admin' && <button onClick={() => setAdmin(!admin)}>{admin ? 'Resident view' : 'Admin dashboard'}</button>}
        <button onClick={() => void logout()}>Sign out</button>
      </div>
    </div>
    {error && <div className="account-alert" role="alert">{error}</div>}
    {user.role === 'admin' && admin ? <Admin /> : <App key={user.id} />}
  </SessionContext.Provider>;
}
function Auth({ onSuccess, banner }: { onSuccess: (u: User) => void; banner: string }) {
  const [register, setRegister] = useState(false), [name, setName] = useState(''), [email, setEmail] = useState(''), [password, setPassword] = useState(''), [confirm, setConfirm] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('');
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (register && password !== confirm) {
      setError('Passwords do not match.');
      return
    }
    setBusy(true);
    try {
      const r = await api<{ user: User }>(register ? '/auth/register' : '/auth/login', 'POST', { name, email, password });
      onSuccess(r.user)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return <div className="account-stage">
    <div className="account-intro">
      <div className="account-brand">◉ CommunityCare</div>
      <h1>Your community.<br />Closer together.</h1>
      <p>Book shared spaces, ask for support, and keep up with your neighbourhood.</p>
      <div className="intro-tags">
        <span>Community</span>
        <span>Accessibility</span>
        <span>Care</span>
      </div>
    </div>
    <section className="account-card">
      <p className="eyebrow">WELCOME TO COMMUNITYCARE</p>
      <h2>{register ? 'Create your account' : 'Welcome back'}</h2>
      <p>{register ? 'Register as a resident to get started.' : 'Sign in to your resident or administrator account.'}</p>
      {(error || banner) && <div className="account-alert" role="alert">{error || banner}</div>}
      <form onSubmit={submit}>
        {register && <label>Full name<input autoComplete="name" required maxLength={80} value={name} onChange={e => setName(e.target.value)} /></label>}
        <label>Email<input type="email" autoComplete="email" required maxLength={254} value={email} onChange={e => setEmail(e.target.value)} /></label>
        <label>Password<input type="password" autoComplete={register ? 'new-password' : 'current-password'} required minLength={12} maxLength={128} value={password} onChange={e => setPassword(e.target.value)} /></label>
        {register && <>
          <small>Use at least 12 characters.</small>
          <label>Confirm password<input type="password" autoComplete="new-password" required value={confirm} onChange={e => setConfirm(e.target.value)} /></label>
        </>}
        <button className="account-primary" disabled={busy}>{busy ? 'Please wait…' : register ? 'Create account' : 'Sign in'}</button>
      </form>
      <button className="account-link" disabled={busy} onClick={() => {
        setRegister(!register);
        setError('');
        setPassword('');
        setConfirm('')
      }}>
        {register ? 'Already have an account? Sign in' : 'New here? Create a resident account'}
      </button>
      <p className="account-footnote">
        {register ? 'Administrator accounts are created by the system owner.' : 'Forgot your password? Contact your system administrator. Email reset is not configured.'}
      </p>
    </section>
  </div>;
}
export function AccountPanel({ children }: { children: ReactNode }) {
  return <section className="account-card">{children}</section>
}
