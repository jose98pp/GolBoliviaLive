import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Auto-update PWA whenever a new build is deployed via git push
registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('🔄 Nueva versión detectada tras git push. Actualizando PWA...');
  },
  onOfflineReady() {
    console.log('📱 GolBolivia PWA lista para operar sin conexión.');
  },
});

createRoot(document.getElementById('root')!).render(<App />);
