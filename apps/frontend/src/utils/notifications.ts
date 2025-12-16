// Push Notifications utility

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Check if notifications are supported
export const isNotificationSupported = (): boolean => {
  return 'Notification' in window && 'serviceWorker' in navigator;
};

// Request notification permission
export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!isNotificationSupported()) {
    console.warn('Notifications not supported');
    return 'denied';
  }

  const permission = await Notification.requestPermission();
  console.log('Notification permission:', permission);
  return permission;
};

// Get notification permission status
export const getNotificationPermission = (): NotificationPermission => {
  if (!isNotificationSupported()) return 'denied';
  return Notification.permission;
};

// Subscribe to push notifications
export const subscribeToPush = async (): Promise<PushSubscription | null> => {
  try {
    const registration = await navigator.serviceWorker.ready;
    
    // Get existing subscription or create new one
    let subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      // Create new subscription
      // Note: You need to generate VAPID keys and add the public key here
      const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      
      if (!vapidPublicKey) {
        console.warn('VAPID public key not configured');
        return null;
      }
      
      const key = urlBase64ToUint8Array(vapidPublicKey);
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: key.buffer as ArrayBuffer,
      });
    }
    
    // Send subscription to server
    await sendSubscriptionToServer(subscription);
    
    return subscription;
  } catch (error) {
    console.error('Push subscription error:', error);
    return null;
  }
};

// Unsubscribe from push notifications
export const unsubscribeFromPush = async (): Promise<boolean> => {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      await subscription.unsubscribe();
      // Notify server
      await removeSubscriptionFromServer(subscription);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Push unsubscription error:', error);
    return false;
  }
};

// Send subscription to server
const sendSubscriptionToServer = async (subscription: PushSubscription): Promise<void> => {
  try {
    await fetch(`${API_URL}/notifications/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
      },
      body: JSON.stringify(subscription),
    });
  } catch (error) {
    console.error('Failed to send subscription to server:', error);
  }
};

// Remove subscription from server
const removeSubscriptionFromServer = async (subscription: PushSubscription): Promise<void> => {
  try {
    await fetch(`${API_URL}/notifications/unsubscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
      },
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    });
  } catch (error) {
    console.error('Failed to remove subscription from server:', error);
  }
};

// Convert VAPID key from base64 to Uint8Array
const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  
  return outputArray;
};

// Show local notification (for testing or when push is not available)
export const showLocalNotification = (title: string, options?: NotificationOptions): void => {
  if (!isNotificationSupported()) return;
  if (Notification.permission !== 'granted') return;
  
  const notification = new Notification(title, {
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-72.png',
    ...options,
  });
  
  notification.onclick = () => {
    window.focus();
    notification.close();
  };
};

// Show notification for new message
export const showMessageNotification = (senderName: string, message: string, roomId?: number): void => {
  showLocalNotification(senderName, {
    body: message,
    tag: `message-${roomId || 'default'}`,
    data: { type: 'message', roomId },
  });
};

// Show notification for incoming call
export const showCallNotification = (callerName: string, callerId: number): void => {
  showLocalNotification(`Входящий звонок от ${callerName}`, {
    body: 'Нажмите, чтобы ответить',
    tag: `call-${callerId}`,
    data: { type: 'call', callerId },
    requireInteraction: true,
  });
};

// Listen for notification messages from service worker
export const listenForNotificationClicks = (callback: (data: any) => void): void => {
  if (!isNotificationSupported()) return;
  
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'NOTIFICATION_CLICK') {
      callback(event.data.data);
    }
  });
};








