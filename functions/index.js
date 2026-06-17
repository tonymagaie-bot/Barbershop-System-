const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();

let twilioClient = null;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  const Twilio = require('twilio');
  twilioClient = new Twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

exports.joinQueue = functions.https.onCall(async (data, context) => {
  const { shopId, name, phone } = data || {};
  if (!shopId || !name || !phone) throw new functions.https.HttpsError('invalid-argument', 'Missing fields');

  const shopRef = db.collection('shops').doc(shopId);
  const customersRef = shopRef.collection('customers');
  const now = admin.firestore.FieldValue.serverTimestamp();
  const custRef = customersRef.doc();
  await custRef.set({ name, phone, status: 'waiting', joinedAt: now });
  return { customerId: custRef.id };
});

exports.assignNext = functions.https.onCall(async (data, context) => {
  const { shopId, seatId } = data || {};
  if (!shopId || !seatId) throw new functions.https.HttpsError('invalid-argument', 'Missing fields');

  const shopRef = db.collection('shops').doc(shopId);
  const queueRef = shopRef.collection('meta').doc('queue');
  const customersRef = shopRef.collection('customers');

  return db.runTransaction(async (t) => {
    const qSnap = await t.get(queueRef);
    const q = qSnap.exists ? qSnap.data() : { seats: {} };
    if (q.seats && q.seats[seatId]) {
      throw new functions.https.HttpsError('failed-precondition', 'Seat not free');
    }

    const waitingQ = customersRef.where('status', '==', 'waiting').orderBy('joinedAt').limit(1);
    const waitingSnap = await t.get(waitingQ);
    if (waitingSnap.empty) {
      return { assigned: false };
    }
    const custDoc = waitingSnap.docs[0];
    const custId = custDoc.id;
    const custRef = customersRef.doc(custId);

    const seats = Object.assign({}, q.seats || {});
    seats[seatId] = custId;
    t.set(queueRef, { seats, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    t.update(custRef, { status: 'in_service', startedAt: admin.firestore.FieldValue.serverTimestamp() });

    // Optionally send SMS to customer that they're assigned
    try {
      if (twilioClient) {
        const cSnap = await t.get(custRef);
        const c = cSnap.data();
        if (c && c.phone) {
          // Don't await — best effort (can't call external in transaction). Use a background post-transaction approach if needed.
        }
      }
    } catch (e) {
      console.warn('Twilio send failed (silent)', e);
    }

    return { assigned: true, customerId: custId };
  });
});

exports.completeCustomer = functions.https.onCall(async (data, context) => {
  const { shopId, seatId, autoAssign = true } = data || {};
  if (!shopId || !seatId) throw new functions.https.HttpsError('invalid-argument', 'Missing fields');

  const shopRef = db.collection('shops').doc(shopId);
  const queueRef = shopRef.collection('meta').doc('queue');
  const customersRef = shopRef.collection('customers');

  return db.runTransaction(async (t) => {
    const qSnap = await t.get(queueRef);
    const q = qSnap.exists ? qSnap.data() : { seats: {} };
    const custId = q.seats ? q.seats[seatId] : null;
    if (!custId) return { completed: false, reason: 'seat-empty' };

    const custRef = customersRef.doc(custId);
    t.update(custRef, { status: 'completed', completedAt: admin.firestore.FieldValue.serverTimestamp() });

    const seats = Object.assign({}, q.seats || {});
    seats[seatId] = null;
    t.set(queueRef, { seats, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });

    if (!autoAssign) return { completed: true };

    const waitingQ = customersRef.where('status', '==', 'waiting').orderBy('joinedAt').limit(1);
    const waitingSnap = await t.get(waitingQ);
    if (!waitingSnap.empty) {
      const nextId = waitingSnap.docs[0].id;
      seats[seatId] = nextId;
      t.set(queueRef, { seats, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
      const nextRef = customersRef.doc(nextId);
      t.update(nextRef, { status: 'in_service', startedAt: admin.firestore.FieldValue.serverTimestamp() });
      return { completed: true, assignedNext: true, nextCustomerId: nextId };
    }
    return { completed: true, assignedNext: false };
  });
});
