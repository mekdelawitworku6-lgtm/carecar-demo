import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadEnv } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const outFile = path.join(root, 'public', 'firebase-messaging-sw.js');

export function generateFirebaseServiceWorker(mode = 'development') {
  const env = loadEnv(mode, root, '');

  const firebaseConfig = {
    apiKey: env.VITE_FIREBASE_API_KEY || '',
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || '',
    projectId: env.VITE_FIREBASE_PROJECT_ID || '',
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: env.VITE_FIREBASE_APP_ID || '',
    measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || '',
  };

  const content = `// Auto-generated from .env — do not edit manually
importScripts('https://www.gstatic.com/firebasejs/12.15.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.15.0/firebase-messaging-compat.js');

const firebaseConfig = ${JSON.stringify(firebaseConfig, null, 2)};

try {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    console.log('[SW] Background FCM message received:', payload);

    const notification = payload.notification || {};
    const data = payload.data || {};
    const title = notification.title || data.title || 'Care Car Wash';
    const body = notification.body || data.body || 'You have a new notification';

    const type = data.type || '';
    let targetUrl = '/';
    if (type.includes('BOOKING') || data.bookingId) {
      targetUrl = '/bookings';
    } else if (type.includes('BUSINESS') || type.includes('APPROVED')) {
      targetUrl = '/my-business';
    }

    return self.registration.showNotification(title, {
      body,
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      tag: data.bookingId || data.type || 'carecar-notification',
      data: { ...data, url: targetUrl },
    });
  });

  console.log('[SW] Firebase Messaging initialized');
} catch (err) {
  console.error('[SW] Firebase init failed:', err.message);
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
`;

  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, content, 'utf8');
  console.log('[firebase-sw] Generated public/firebase-messaging-sw.js');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  generateFirebaseServiceWorker(process.env.NODE_ENV === 'production' ? 'production' : 'development');
}
