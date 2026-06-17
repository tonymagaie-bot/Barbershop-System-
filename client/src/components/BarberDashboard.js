import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot, collection, query, where, orderBy, onSnapshot as onSnap } from 'firebase/firestore';
import { functions } from '../firebase';
import { httpsCallable } from 'firebase/functions';

export default function BarberDashboard({ shopId }) {
  const [queueMeta, setQueueMeta] = useState({ seats: { seat1: null, seat2: null } });
  const [waiting, setWaiting] = useState([]);
  const assignNext = httpsCallable(functions, 'assignNext');
  const completeCustomer = httpsCallable(functions, 'completeCustomer');

  useEffect(() => {
    const qRef = doc(db, 'shops', shopId, 'meta', 'queue');
    const unsubQ = onSnapshot(qRef, snap => {
      if (!snap.exists()) return setQueueMeta({ seats: { seat1: null, seat2: null } });
      setQueueMeta(snap.data());
    });

    const waitingQ = query(collection(db, 'shops', shopId, 'customers'), where('status', '==', 'waiting'), orderBy('joinedAt'));
    const unsubW = onSnap(waitingQ, snap => {
      setWaiting(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unsubQ(); unsubW(); };
  }, [shopId]);

  const handleAssign = async (seatId) => {
    try {
      await assignNext({ shopId, seatId });
    } catch (err) { console.error(err); alert('Assign failed'); }
  };
  const handleComplete = async (seatId) => {
    try {
      await completeCustomer({ shopId, seatId, autoAssign: true });
    } catch (err) { console.error(err); alert('Complete failed'); }
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 12 }}>
        {['seat1','seat2'].map(seatId => (
          <div key={seatId} style={{ border: '1px solid #ccc', padding: 8, borderRadius: 6, flex: 1 }}>
            <h4>{seatId}</h4>
            <p>Assigned: {queueMeta.seats && queueMeta.seats[seatId] ? queueMeta.seats[seatId] : '—'}</p>
            <button onClick={() => handleAssign(seatId)}>Assign Next</button>
            <button onClick={() => handleComplete(seatId)}>Complete</button>
          </div>
        ))}
      </div>

      <h4>Waiting list</h4>
      <ol>
        {waiting.map(c => <li key={c.id}>{c.name} — {c.phone}</li>)}
      </ol>
    </div>
  );
}
