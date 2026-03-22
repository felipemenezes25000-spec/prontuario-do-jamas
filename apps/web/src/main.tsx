import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './app';
import './styles/globals.css';

// ── FOUC prevention: apply theme before React render ──
(function preventFOUC() {
  try {
    const raw = localStorage.getItem('voxpep-theme');
    if (raw) {
      const parsed: { state?: { mode?: string } } = JSON.parse(raw);
      const mode = parsed?.state?.mode ?? 'light';
      let resolved: string;

      if (mode === 'system') {
        resolved = window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light';
      } else {
        resolved = mode;
      }

      if (resolved === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } else {
      // Default to light — remove dark class that may be in HTML
      document.documentElement.classList.remove('dark');
    }
  } catch {
    // Default to light on parse error
    document.documentElement.classList.remove('dark');
  }
})();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
