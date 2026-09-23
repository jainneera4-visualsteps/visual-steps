import './utils/productionConsole';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <App />,
);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.addEventListener('message', event => {
    if (event.data?.type === 'visual-steps-display-mode') {
      event.ports[0]?.postMessage({ standalone: window.matchMedia('(display-mode: standalone)').matches });
    }
  });
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).catch(error => {
      console.warn('Visual Steps service worker registration failed:', error);
    });
  });
}
