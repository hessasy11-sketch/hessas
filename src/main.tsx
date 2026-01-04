import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './index.css';
import { InvestorAuthProvider } from './contexts/InvestorAuthContext';

// Filter Stackblitz environment errors
const originalError = console.error;
const originalLog = console.log;

console.error = (...args) => {
  const message = args[0]?.toString() || '';

  // Ignore Stackblitz resource errors
  if (
    message.includes('ERR_INSUFFICIENT_RESOURCES') ||
    message.includes('direct_uploads') ||
    message.includes('stackblitz.com/api') ||
    message.includes('Service Worker') ||
    message.includes('ServiceWorker')
  ) {
    return;
  }

  originalError.apply(console, args);
};

console.log = (...args) => {
  const message = args[0]?.toString() || '';

  // Ignore Service Worker logs
  if (
    message.includes('Service Worker') ||
    message.includes('ServiceWorker') ||
    message.includes('not yet supported on StackBlitz')
  ) {
    return;
  }

  originalLog.apply(console, args);
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <InvestorAuthProvider>
        <App />
      </InvestorAuthProvider>
    </BrowserRouter>
  </StrictMode>
);
