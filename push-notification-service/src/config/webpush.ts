// src/config/webpush.ts
import webpush from 'web-push';

export const initializeWebPush = () => {
  const vapidEmail = process.env.VAPID_EMAIL;
  const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

  if (!vapidEmail || !vapidPublicKey || !vapidPrivateKey) {
    throw new Error('Missing required VAPID environment variables');
  }

  webpush.setVapidDetails(
    vapidEmail.startsWith('mailto:') ? vapidEmail : `mailto:${vapidEmail}`,
    vapidPublicKey,
    vapidPrivateKey
  );

  return webpush;
};