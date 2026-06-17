import React, { useEffect, useState } from 'react';
import { doc, onSnapshot, collection, query, where, orderBy, onSnapshot as onSnap, getFirestore } from 'firebase/firestore';
import { db } from '../firebase';

export default function Waiting({ shopId, customerId, onCancel }) {
  const customersRefPath = ['shops', shopId, 'customers'].join('/');
  const [customer, setCustomer] = useState(null);
  const [position, setPosition] = useState(null);
  const [eta, setEta] = useState(null);

  useEffect(() => {
    const custRef = doc(db, 'shops', shopId, 'customers', customerId);
    const unsubCust = onSnapshot(custRef, snap => {
      if (!snap.exists()) return;
      setCustomer({ id: snap.id, ...snap.data() });
    });

    // listen to waiting queue to compute position
    const waitingQ = query(collection(db, 'shops', shopId, 'customers'), where('status', '==', 'waiting'), orderBy('joinedAt'));
    const unsubWaiting = onSnap(waitingQ, snap => {
      const ids = snap.docs.map(d => d.id);
      const idx = ids.indexOf(customerId);
      setPosition(idx === -1 ? null : idx + 1);
      // simple ETA: avg 20 min per customer, 2 barbers
      const avg = 20;
      const B = 2;
      if (idx === -1) setEta(null);
      else setEta(Math.ceil((idx) / B) * avg);
    });

    return () => { unsubCust(); unsubWaiting(); };
  }, [shopId, customerId]);

  return (
    <div style={{ border: '1px solid #ddd', padding: 12, borderRadius: 6 }}>
      <h4>Waiting</h4>
      {!customer ? <p>Loading...</p> : (
        <>
          <p>Name: {customer.name}</p>
          <p>Phone: {customer.phone}</p>
          <p>Position: {position ? `#${position}` : '—'}</p>
          <p>ETA: {eta ? `${eta} minutes` : 'Calculating...'}</p>
          <button onClick={onCancel}>Cancel</button>
        </>
      )}
    </div>
  );
}
