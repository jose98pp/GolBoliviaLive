import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Auto-update PWA in production and development when supported
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  try {
    let refreshing = false;

    // Listen for controllerchange to reload page when new service worker takes over
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        console.log('⚡ Nuevo Service Worker activado. Recargando para mostrar los últimos cambios...');
        window.location.reload();
      }
    });

    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        console.log('🔄 Nueva versión detectada tras git push. Forzando activación de Service Worker...');
        // Force the waiting service worker to skip waiting and become active immediately
        updateSW(true);
      },
      onOfflineReady() {
        console.log('📱 GolBolivia PWA lista para operar sin conexión.');
      },
    });

    // Helper exposed globally for manual cache purging
    (window as any).__purgeGolBoliviaCache = async () => {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const r of registrations) {
          await r.unregister();
        }
      }
      if ('caches' in window) {
        const keys = await caches.keys();
        for (const k of keys) {
          await caches.delete(k);
        }
      }
      window.location.reload();
    };
  } catch (err) {
    console.error('Error registrando PWA Service Worker:', err);
  }
}

createRoot(document.getElementById('root')!).render(<App />);
