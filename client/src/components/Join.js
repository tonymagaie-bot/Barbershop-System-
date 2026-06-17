import React, { useState } from 'react';
import { functions } from '../firebase';
import { httpsCallable } from 'firebase/functions';

export default function Join({ shopId, onJoined }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const joinQueue = httpsCallable(functions, 'joinQueue');

  const submit = async (e) => {
    e.preventDefault();
    if (!name || !phone) return alert('Enter name and phone');
    setLoading(true);
    try {
      const res = await joinQueue({ shopId, name, phone });
      const customerId = res.data && res.data.customerId;
      onJoined(customerId);
    } catch (err) {
      console.error(err);
      alert('Failed to join queue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} style={{ display: 'grid', gap: 8 }}>
      <input value={name} onChange={e=>setName(e.target.value)} placeholder="Your name" />
      <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="Phone number" />
      <button type="submit" disabled={loading}>{loading ? 'Joining...' : 'Join Queue'}</button>
    </form>
  );
}
