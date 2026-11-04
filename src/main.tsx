import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './styles/global.css';

// The service worker (public/sw.js) shows the notifications and lets the browser install Marc HQ as
// an app; it caches nothing, so every opening is the latest version
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => undefined));
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Follows Vite's base path: the root on Vercel and locally */}
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
