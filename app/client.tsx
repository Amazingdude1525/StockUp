import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import StockUpApp from '@/components/stockup/stockup-app';
import './globals.css';

const root = document.getElementById('root');

if (!root) {
  throw new Error('StockUp root element was not found.');
}

createRoot(root).render(
  <StrictMode>
    <StockUpApp />
  </StrictMode>,
);
