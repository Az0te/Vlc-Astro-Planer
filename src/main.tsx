import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register PWA service worker immediately for offline cache and Android installability.
// Protegido: en contextos donde no hay Service Worker disponible (p. ej. un
// iframe en sandbox usado para previews), navigator.serviceWorker no existe
// y una llamada directa rompería el arranque de toda la app.
if ('serviceWorker' in navigator) {
  try {
    registerSW({ immediate: true });
  } catch {
    // No pasa nada si falla: la app funciona igual sin cache offline.
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
