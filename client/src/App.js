import React, { useState } from 'react';
import Join from './components/Join';
import Waiting from './components/Waiting';
import BarberDashboard from './components/BarberDashboard';
import './App.css';

function App() {
  const [customerId, setCustomerId] = useState(null);
  const [shopId] = useState('default-shop'); // single-shop demo

  return (
    <div style={{ padding: 16, fontFamily: 'Arial, sans-serif', maxWidth: 600, margin: '0 auto' }}>
      <h2>Barbershop Queue (Demo)</h2>
      {!customerId ? (
        <Join shopId={shopId} onJoined={(id) => setCustomerId(id)} />
      ) : (
        <Waiting shopId={shopId} customerId={customerId} onCancel={() => setCustomerId(null)} />
      )}

      <hr />
      <h3>Barber Dashboard (demo)</h3>
      <BarberDashboard shopId={shopId} />
    </div>
  );
}

export default App;
