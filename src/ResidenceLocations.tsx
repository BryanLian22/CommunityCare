import { useState, type FormEvent } from 'react';
import { api, type User } from './api';
import { useSession } from './Session';

export default function ResidenceLocations() {
  const { user, updateUser } = useSession();
  const locations = user.locations || [];
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ residence: '', block: '', floor: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError('');
    try {
      const result = await api<{ user: User }>('/profile/locations', 'POST', draft);
      updateUser(result.user); setOpen(false); setDraft({ residence: '', block: '', floor: '' });
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  async function remove(id: string) {
    setBusy(true); setError('');
    try {
      const result = await api<{ user: User }>(`/profile/locations/${encodeURIComponent(id)}`, 'DELETE');
      updateUser(result.user);
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  return <section className="home-residences" aria-label="Your residences">
    {locations.map(location => <div className="home-residence" key={location.id}>
      <span aria-hidden="true">⌂</span><div><strong>{location.residence}</strong><small>Block {location.block} · Floor {location.floor}</small></div>
      {open && <button type="button" disabled={busy} aria-label={`Remove ${location.residence}, block ${location.block}, floor ${location.floor}`} onClick={() => void remove(location.id)}>Remove</button>}
    </div>)}
    {!open && <button type="button" className="residence-add" onClick={() => { setDraft({ residence: locations[0]?.residence || '', block: '', floor: '' }); setOpen(true); }}>+ {locations.length ? 'Add another location / manage' : 'Add your residence'}</button>}
    {error && <p role="alert">{error}</p>}
    {open && <form className="residence-form" onSubmit={save}>
      <h3>Add a residence location</h3>
      <label>Residence name<input required maxLength={100} value={draft.residence} onChange={e => setDraft({ ...draft, residence: e.target.value })} /></label>
      <div className="residence-fields"><label>Block<input required maxLength={40} placeholder="e.g. A" value={draft.block} onChange={e => setDraft({ ...draft, block: e.target.value })} /></label><label>Floor<input required maxLength={40} placeholder="e.g. 12 or G" value={draft.floor} onChange={e => setDraft({ ...draft, floor: e.target.value })} /></label></div>
      <div className="residence-actions"><button disabled={busy} type="button" onClick={() => { setOpen(false); setError(''); }}>Cancel</button><button disabled={busy}>{busy ? 'Saving…' : 'Save location'}</button></div>
    </form>}
  </section>;
}
