// src/App.jsx
import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar      from './components/Navbar';
import Dashboard   from './pages/Dashboard';
import Predict     from './pages/Predict';
import Compare     from './pages/Compare';
import Indicators  from './pages/Indicators';
import './index.css';

export default function App() {
  const [ticker, setTicker] = useState('GOOG');

  return (
    <BrowserRouter>
      <Navbar ticker={ticker} onTickerChange={setTicker} />
      <main>
        <Routes>
          <Route path="/"           element={<Dashboard  ticker={ticker} />} />
          <Route path="/predict"    element={<Predict    ticker={ticker} />} />
          <Route path="/compare"    element={<Compare    ticker={ticker} />} />
          <Route path="/indicators" element={<Indicators ticker={ticker} />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}
