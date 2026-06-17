# Barbershop System — Starter

This repo contains a starter Barbershop booking and queue management app (React PWA + Firebase Cloud Functions).

Features (MVP)
- Customers: enter name + phone, join queue, see position and ETA in real-time.
- Barbers: dashboard with two seats, mark complete, move to next customer.
- Realtime: Firestore listeners.
- Server logic: Firebase Cloud Functions (transactional) for join/assign/complete.
- Optional Twilio SMS (configure via env vars).

Quickstart
1. Create a Firebase project at https://console.firebase.google.com/.
2. Enable Firestore and Cloud Functions (Node 16+), and Hosting (optional).
3. Copy .env.example to .env.local in the client folder and fill with your Firebase config (REACT_APP_*) and Twilio creds (optional).
4. From the repo root:
   - Install client deps: cd client && npm install
   - Install functions deps: cd ../functions && npm install
5. Run locally:
   - Start client: cd client && npm start
   - Emulate functions/firestore (optional): firebase emulators:start
6. Deploy:
   - firebase deploy --only functions,hosting

Structure
- client/ — React PWA (create-react-app style)
- functions/ — Firebase Cloud Functions
- firebase.json, .firebaserc — firebase config
- README.md — this file

Notes
- The repo assumes a single shop. Extend shops/collection for multi-shop.
- Security: Use Firebase security rules and restrict callable functions to authenticated barber users for assign/complete.

License: MIT
