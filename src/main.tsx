import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Auto-update PWA in production when supported
if (typeof window !== 'undefined' && 'serviceWorker' in navigator && import.meta.env.PROD) {
  try {
    registerSW({
      immediate: true,
      onNeedRefresh() {
        console.log('🔄 Nueva versión detectada tras git push. Actualizando PWA...');
      },
      onOfflineReady() {
        console.log('📱 GolBolivia PWA lista para operar sin conexión.');
      },
    });
  } catch {}
}

createRoot(document.getElementById('root')!).render(<App />);
