// src/types/index.ts
import { PushSubscription } from 'web-push';

export interface ISubscription {
  userId: string;
  endpoint: string; // Unique identifier for the subscription
  subscription: PushSubscription;
  deviceInfo?: {
    userAgent?: string;
    deviceType?: string;
    browserName?: string;
  };
  subscribedAt: Date;
  lastActiveAt: Date;
  active: boolean;
}

export interface INotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  data?: Record<string, any>;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}

export interface ISendRequest {
  userId?: string;
  notification: INotificationPayload;
}

export interface ISubscribeRequest {
  userId: string;
  subscription: PushSubscription;
  deviceInfo?: {
    userAgent?: string;
    deviceType?: string;
    browserName?: string;
  };
}

export interface IUnsubscribeRequest {
  userId?: string;
  endpoint?: string;
}

export interface IBroadcastResult {
  total: number;
  successful: number;
  failed: number;
  details?: Array<{
    userId: string;
    devicesNotified: number;
    devicesFailed: number;
  }>;
}

export interface IUserSubscriptionSummary {
  userId: string;
  totalSubscriptions: number;
  devices: Array<{
    endpoint: string;
    deviceInfo?: {
      userAgent?: string;
      deviceType?: string;
      browserName?: string;
    };
    subscribedAt: Date;
    lastActiveAt: Date;
  }>;
}

export interface IApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}