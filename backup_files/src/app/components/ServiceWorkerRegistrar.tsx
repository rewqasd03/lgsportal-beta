'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    // CACHE PROBLEM ÇÖZÜMÜ: Service Worker geçici olarak devre dışı
    // Bu satırı aktif etmek için yorumu kaldır
    /*
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then((registration) => {
            console.log('SW registered: ', registration);
          })
          .catch((registrationError) => {
            console.log('SW registration failed: ', registrationError);
          });
      });
    }
    */
    console.log('🚫 Service Worker devre dışı - Cache temizlendi');
  }, []);

  return null;
}