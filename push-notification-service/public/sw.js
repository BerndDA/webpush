// sw.js - Service Worker for Push Notifications

self.addEventListener('push', function(event) {
    console.log('Push received:', event);
    
    if (!event.data) {
        console.log('Push event but no data');
        return;
    }

    try {
        const payload = event.data.json();
        
        // Default options
        const options = {
            body: payload.body || 'New notification',
            icon: payload.icon || '/icon-192x192.png',
            badge: payload.badge || '/badge-72x72.png',
            vibrate: [200, 100, 200],
            data: payload.data || {},
            actions: payload.actions || [],
            requireInteraction: false,
            silent: false
        };

        // Add image if provided
        if (payload.image) {
            options.image = payload.image;
        }

        event.waitUntil(
            self.registration.showNotification(
                payload.title || 'Notification',
                options
            )
        );
    } catch (error) {
        console.error('Error showing notification:', error);
    }
});

self.addEventListener('notificationclick', function(event) {
    console.log('Notification clicked:', event);
    event.notification.close();

    // Handle action clicks
    if (event.action) {
        console.log('Action clicked:', event.action);
        // Handle specific actions here
        return;
    }

    // Handle notification body click
    const urlToOpen = event.notification.data?.url || '/';
    
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
            // Check if a window is already open
            for (let client of clientList) {
                if (client.url === urlToOpen && 'focus' in client) {
                    return client.focus();
                }
            }
            // Open a new window if none found
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});

self.addEventListener('pushsubscriptionchange', function(event) {
    console.log('Push subscription changed:', event);
    // Handle subscription refresh here if needed
});