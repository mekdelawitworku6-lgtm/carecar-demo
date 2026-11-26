// Auto-generated from .env — do not edit manually
importScripts('https://www.gstatic.com/firebasejs/12.15.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.15.0/firebase-messaging-compat.js');

const firebaseConfig = {
  "apiKey": "",
  "authDomain": "care-car-1abb9.firebaseapp.com",
  "projectId": "care-car-1abb9",
  "storageBucket": "care-car-1abb9.firebasestorage.app",
  "messagingSenderId": "1038780545226",
  "appId": "1:1038780545226:web:2749f3971913ce15341c33",
  "measurementId": "G-ZQHRT5MHPG"
};

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
