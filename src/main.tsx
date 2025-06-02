import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
// Import global styles (includes Tailwind CSS)
import './index.css';
// Toast notifications component
import { Toaster } from 'react-hot-toast';

// Modern React 18 way to render the app
// StrictMode helps catch potential problems
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    {/* Toast notifications will appear in the top-right corner */}
    <Toaster position="top-right" />
  </StrictMode>
);