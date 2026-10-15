import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import App from './App';
import { queryClient } from './lib/queryClient';
import { ToastProvider } from './context/ToastContext';
import './styles/index.css';
import { initPwa, UpdateBanner } from './components/pwa/PwaPrompts';

initPwa();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ToastProvider>
            <Suspense fallback={null}>
              <App />
            </Suspense>
            <UpdateBanner />
          </ToastProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </HelmetProvider>
  </React.StrictMode>,
);


