# Web Push Notification Backend - Updated Implementation Plan

## Architecture Overview

```
┌─────────────────────┐
│   Backend App       │
│  (Your Service)     │
└──────────┬──────────┘
           │ REST API
           │
┌──────────▼──────────┐     ┌─────────────────┐
│  Push Notification  │────►│    MongoDB      │
│     Service         │     │                 │
│   (Node.js API)     │     │ - Subscriptions │
│                     │     │                 │
└──────────┬──────────┘     └─────────────────┘
           │
           │ Web Push Protocol
           │
    ┌──────▼──────┐
    │  Push       │
    │  Providers  │
    │             │
    │ • FCM       │
    │ • APNS      │
    │ • Mozilla   │
    └─────────────┘
```

## Key Design Decisions

### Subscription Lifecycle Management
- **Approach**: Hard deletion instead of soft delete (active/inactive status)
- **Rationale**: Simplifies data model while achieving same functional outcome
- **Implementation**: Invalid subscriptions (410/404 responses) are immediately removed from database
- **Benefit**: No need for periodic cleanup jobs or active flags

## Phase 1: Project Setup

### 1.1 Initialize TypeScript Project
```bash
mkdir push-notification-service
cd push-notification-service
yarn init -y
```

### 1.2 Install Dependencies
```json
{
  "dependencies": {
    "express": "^4.18.0",
    "mongoose": "^7.0.0",
    "web-push": "^3.6.0",
    "cors": "^2.8.5",
    "pino": "^8.15.0",
    "pino-pretty": "^10.2.0",
    "dotenv": "^16.0.0",
    "helmet": "^7.0.0",
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/express": "^4.17.17",
    "@types/cors": "^2.8.13",
    "@types/web-push": "^3.3.3",
    "@types/uuid": "^9.0.0",
    "typescript": "^5.0.0",
    "ts-node": "^10.9.0",
    "ts-node-dev": "^2.0.0",
    "@types/jest": "^29.5.0",
    "@types/supertest": "^2.0.12",
    "jest": "^29.0.0",
    "ts-jest": "^29.1.0",
    "supertest": "^6.3.0",
    "eslint": "^8.0.0",
    "@typescript-eslint/parser": "^5.0.0",
    "@typescript-eslint/eslint-plugin": "^5.0.0"
  },
  "scripts": {
    "start": "node dist/server.js",
    "dev": "ts-node-dev --respawn --transpile-only src/server.ts | pino-pretty",
    "build": "tsc",
    "test": "jest",
    "lint": "eslint src/**/*.ts"
  }
}
```

### 1.3 Install with Yarn
```bash
# Install dependencies
yarn install

# Generate VAPID keys
yarn add -g web-push
web-push generate-vapid-keys
```

### 1.4 Project Structure
```
push-notification-service/
├── src/
│   ├── config/
│   │   ├── webpush.ts
│   │   └── logger.ts
│   ├── models/
│   │   └── subscription.model.ts
│   ├── routes/
│   │   └── notification.routes.ts
│   ├── controllers/
│   │   └── notification.controller.ts
│   ├── services/
│   │   └── notification.service.ts
│   ├── types/
│   │   └── index.ts
│   └── server.ts
├── public/
│   └── index.html (test client)
├── tests/
├── Dockerfile
├── docker-compose.yml
├── kubernetes/
│   ├── deployment.yaml
│   ├── service.yaml
│   └── configmap.yaml
├── .env.example
├── .eslintrc.json
├── jest.config.js
├── tsconfig.json
├── package.json
└── yarn.lock
```

## Phase 2: Core Implementation

### 2.0 Configuration Files

#### Logger Configuration (Pino)
```typescript
// src/config/logger.ts
import pino from 'pino';

const isDevelopment = process.env.NODE_ENV === 'development';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: isDevelopment ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname'
    }
  } : undefined,
  formatters: {
    level: (label) => {
      return { level: label };
    }
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  base: {
    service: 'push-notification-service'
  }
});

export default logger;
```

#### Web Push Configuration
```typescript
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
```

### 2.1 Type Definitions
```typescript
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
```

### 2.2 Database Models
```typescript
// src/models/subscription.model.ts
import mongoose, { Document, Schema, Model } from 'mongoose';
import { ISubscription } from '../types';

// Define the instance methods interface
export interface ISubscriptionMethods {
  updateLastActive(): Promise<ISubscriptionDocument>;
}

// Combine the document interface with methods
export interface ISubscriptionDocument extends ISubscription, Document, ISubscriptionMethods {}

// Define the model interface
export interface ISubscriptionModel extends Model<ISubscriptionDocument> {}

const subscriptionSchema = new Schema<ISubscriptionDocument>({
  userId: {
    type: String,
    required: true,
    index: true
  },
  endpoint: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  subscription: {
    endpoint: { type: String, required: true },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true }
    },
    expirationTime: { type: Number, default: null }
  },
  deviceInfo: {
    userAgent: { type: String },
    deviceType: { type: String },
    browserName: { type: String }
  },
  subscribedAt: {
    type: Date,
    default: Date.now
  },
  lastActiveAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
subscriptionSchema.index({ userId: 1, endpoint: 1 });

// Update lastActiveAt on each successful notification
subscriptionSchema.methods.updateLastActive = function() {
  this.lastActiveAt = new Date();
  return this.save();
};

export const Subscription = mongoose.model<ISubscriptionDocument, ISubscriptionModel>('Subscription', subscriptionSchema);
```

### 2.3 Service Layer
```typescript
// src/services/notification.service.ts
import { SendResult } from "web-push";
import {
  Subscription,
  ISubscriptionDocument,
} from "../models/subscription.model";
import { logger } from "../config/logger";
import {
  INotificationPayload,
  IBroadcastResult,
  ISubscribeRequest,
  IUserSubscriptionSummary,
} from "../types";
import { PushSubscription } from "web-push";

export class NotificationService {
  constructor(private webpush: typeof import("web-push")) {}

  async subscribe(request: ISubscribeRequest): Promise<ISubscriptionDocument> {
    try {
      const { userId, subscription, deviceInfo } = request;
      const endpoint = subscription.endpoint;

      // Upsert subscription - update if exists, create if new
      const sub = await Subscription.findOneAndUpdate(
        { endpoint },
        {
          userId,
          endpoint,
          subscription,
          deviceInfo,
          subscribedAt: new Date(),
          lastActiveAt: new Date(),
        },
        { upsert: true, new: true }
      );

      const totalActive = await Subscription.countDocuments({ userId });
      logger.info(
        `User ${userId} subscribed device. Total devices: ${totalActive}`
      );

      return sub;
    } catch (error) {
      logger.error("Subscribe error:", error);
      throw new Error("Failed to subscribe device");
    }
  }

  async unsubscribe(
    userId?: string,
    endpoint?: string
  ): Promise<ISubscriptionDocument | null> {
    try {
      let query: any = {};

      if (endpoint) {
        query = { endpoint };
      } else if (userId) {
        // For backward compatibility - removes one device
        const sub = await Subscription.findOne({ userId });
        if (!sub) return null;
        query = { endpoint: sub.endpoint };
      } else {
        throw new Error("Either userId or endpoint must be provided");
      }

      // Delete the subscription
      const result = await Subscription.findOneAndDelete(query);

      if (result) {
        logger.info(
          `Deleted subscription for user ${result.userId}, endpoint: ${result.endpoint}`
        );
      }

      return result;
    } catch (error) {
      logger.error("Unsubscribe error:", error);
      throw new Error("Failed to unsubscribe device");
    }
  }

  async unsubscribeAllDevices(userId: string): Promise<number> {
    try {
      const result = await Subscription.deleteMany({ userId });

      logger.info(
        `Deleted ${result.deletedCount} subscriptions for user ${userId}`
      );
      return result.deletedCount;
    } catch (error) {
      logger.error("Unsubscribe all devices error:", error);
      throw new Error("Failed to unsubscribe all devices");
    }
  }

  async getUserSubscriptions(
    userId: string
  ): Promise<IUserSubscriptionSummary> {
    const subscriptions = await Subscription.find({ userId });

    return {
      userId,
      totalSubscriptions: subscriptions.length,
      devices: subscriptions.map((sub) => ({
        endpoint: sub.endpoint,
        deviceInfo: sub.deviceInfo,
        subscribedAt: sub.subscribedAt,
        lastActiveAt: sub.lastActiveAt,
      })),
    };
  }

  async sendToUser(
    userId: string,
    payload: INotificationPayload
  ): Promise<{ sent: number; failed: number }> {
    const subscriptions = await Subscription.find({ userId });

    if (subscriptions.length === 0) {
      throw new Error("User has no subscriptions");
    }

    logger.info(
      `Sending notification to ${subscriptions.length} devices for user ${userId}`
    );

    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await this.webpush.sendNotification(
            sub.subscription,
            JSON.stringify(payload)
          );
          await sub.updateLastActive();
          return { success: true, endpoint: sub.endpoint };
        } catch (error: any) {
          logger.error(`Failed to send to device ${sub.endpoint}:`, error);

          // Handle invalid subscriptions
          if (error.statusCode === 410 || error.statusCode === 404) {
            await Subscription.deleteOne({ endpoint: sub.endpoint });
            logger.info(`Deleted invalid subscription: ${sub.endpoint}`);
          }

          return {
            success: false,
            endpoint: sub.endpoint,
            error: error.message,
          };
        }
      })
    );

    const successful = results.filter(
      (r) => r.status === "fulfilled" && r.value.success
    ).length;

    return {
      sent: successful,
      failed: subscriptions.length - successful,
    };
  }

  async sendToAll(payload: INotificationPayload): Promise<IBroadcastResult> {
    const subscriptions = await Subscription.find({});
    logger.info(`Broadcasting to ${subscriptions.length} total devices`);

    if (subscriptions.length === 0) {
      return { total: 0, successful: 0, failed: 0, details: [] };
    }

    // Group subscriptions by userId
    const userGroups = subscriptions.reduce((acc, sub) => {
      if (!acc[sub.userId]) {
        acc[sub.userId] = [];
      }
      acc[sub.userId].push(sub);
      return acc;
    }, {} as Record<string, ISubscriptionDocument[]>);

    const details: IBroadcastResult["details"] = [];
    let totalSuccessful = 0;
    let totalFailed = 0;

    // Send to each user's devices
    for (const [userId, userSubs] of Object.entries(userGroups)) {
      const results = await Promise.allSettled(
        userSubs.map(async (sub) => {
          try {
            await this.webpush.sendNotification(
              sub.subscription,
              JSON.stringify(payload)
            );
            await sub.updateLastActive();
            return { success: true };
          } catch (error: any) {
            logger.error(`Failed to send to device ${sub.endpoint}:`, error);

            if (error.statusCode === 410 || error.statusCode === 404) {
              await Subscription.deleteOne({ endpoint: sub.endpoint });
              logger.info(`Deleted invalid subscription: ${sub.endpoint}`);
            }

            return { success: false };
          }
        })
      );

      const successCount = results.filter(
        (r) => r.status === "fulfilled" && r.value.success
      ).length;

      const failCount = userSubs.length - successCount;

      totalSuccessful += successCount;
      totalFailed += failCount;

      details.push({
        userId,
        devicesNotified: successCount,
        devicesFailed: failCount,
      });
    }

    return {
      total: subscriptions.length,
      successful: totalSuccessful,
      failed: totalFailed,
      details,
    };
  }
}
```

### 2.4 Controllers
```typescript
// src/controllers/notification.controller.ts
import { Request, Response, NextFunction } from 'express';
import { NotificationService } from '../services/notification.service';
import { ISendRequest, IApiResponse, ISubscribeRequest } from '../types';

export class NotificationController {
  constructor(private notificationService: NotificationService) {}

  subscribe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const subscribeRequest = req.body as ISubscribeRequest;
      
      if (!subscribeRequest.userId || !subscribeRequest.subscription) {
        res.status(400).json({
          success: false,
          error: 'userId and subscription are required'
        } as IApiResponse);
        return;
      }
      
      const result = await this.notificationService.subscribe(subscribeRequest);
      
      res.json({
        success: true,
        data: { 
          userId: result.userId, 
          endpoint: result.endpoint
        }
      } as IApiResponse);
    } catch (error) {
      next(error);
    }
  };

  unsubscribe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;
      const { endpoint } = req.query as { endpoint?: string };
      
      if (endpoint) {
        // Unsubscribe specific device
        const result = await this.notificationService.unsubscribe(undefined, endpoint);
        
        if (!result) {
          res.status(404).json({
            success: false,
            error: 'Subscription not found'
          } as IApiResponse);
          return;
        }
        
        res.json({
          success: true,
          data: { 
            userId: result.userId, 
            endpoint: result.endpoint
          }
        } as IApiResponse);
      } else {
        // Unsubscribe all devices for user
        const count = await this.notificationService.unsubscribeAllDevices(userId);
        
        res.json({
          success: true,
          data: { 
            userId, 
            devicesUnsubscribed: count 
          }
        } as IApiResponse);
      }
    } catch (error) {
      next(error);
    }
  };

  sendNotification = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId, notification } = req.body as ISendRequest;
      
      if (!notification) {
        res.status(400).json({
          success: false,
          error: 'notification payload is required'
        } as IApiResponse);
        return;
      }
      
      if (userId) {
        // Send to specific user (all their devices)
        const result = await this.notificationService.sendToUser(userId, notification);
        res.json({
          success: true,
          data: { 
            userId, 
            devicesNotified: result.sent,
            devicesFailed: result.failed 
          }
        } as IApiResponse);
      } else {
        // Broadcast to all users and devices
        const result = await this.notificationService.sendToAll(notification);
        res.json({
          success: true,
          data: result
        } as IApiResponse);
      }
    } catch (error) {
      next(error);
    }
  };

  getUserSubscriptions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;
      
      const summary = await this.notificationService.getUserSubscriptions(userId);
      
      res.json({
        success: true,
        data: summary
      } as IApiResponse);
    } catch (error) {
      next(error);
    }
  };
}
```

### 2.5 Routes
```typescript
// src/routes/notification.routes.ts
import { Router } from 'express';
import { NotificationController } from '../controllers/notification.controller';
import { NotificationService } from '../services/notification.service';
import { initializeWebPush } from '../config/webpush';

export const createNotificationRouter = (): Router => {
  const router = Router();
  const webpush = initializeWebPush();
  const notificationService = new NotificationService(webpush);
  const controller = new NotificationController(notificationService);

  // Subscribe a device
  router.post('/subscribe', controller.subscribe);
  
  // Unsubscribe - supports both:
  // DELETE /unsubscribe/:userId - unsubscribe all devices
  // DELETE /unsubscribe/:userId?endpoint=xxx - unsubscribe specific device
  router.delete('/unsubscribe/:userId', controller.unsubscribe);
  
  // Send notification
  router.post('/send', controller.sendNotification);
  
  // Get user's subscription details
  router.get('/users/:userId/subscriptions', controller.getUserSubscriptions);

  return router;
};
```

## Phase 3: Docker & Deployment

### 3.1 Multi-stage Dockerfile
```dockerfile
# Build stage
FROM node:18-alpine AS builder

# Install yarn if not available
RUN corepack enable

WORKDIR /app

# Copy package files
COPY package.json yarn.lock tsconfig.json ./

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy source code
COPY src ./src

# Build the application
RUN yarn build

# Production stage
FROM node:18-alpine

# Install yarn if not available
RUN corepack enable

WORKDIR /app

# Copy package files
COPY package.json yarn.lock ./

# Install production dependencies only
RUN yarn install --frozen-lockfile --production

# Copy built application
COPY --from=builder /app/dist ./dist

# Copy static files if any
COPY public ./public

EXPOSE 3000

CMD ["node", "dist/server.js"]
```

### 3.2 Docker Compose
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - MONGODB_URI=mongodb://mongo:27017/pushnotifications
      - NODE_ENV=development
      - VAPID_PUBLIC_KEY=${VAPID_PUBLIC_KEY}
      - VAPID_PRIVATE_KEY=${VAPID_PRIVATE_KEY}
      - VAPID_EMAIL=${VAPID_EMAIL}
    depends_on:
      - mongo
    volumes:
      - ./src:/app/src
      - ./tsconfig.json:/app/tsconfig.json
      - yarn-cache:/usr/local/share/.cache/yarn

  mongo:
    image: mongo:6
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db

volumes:
  mongo_data:
  yarn-cache:
```

## Phase 4: Testing

### 4.1 Unit Tests
```typescript
// tests/services/notification.service.test.ts
import { NotificationService } from '../../src/services/notification.service';
import { Subscription } from '../../src/models/subscription.model';
import webpush from 'web-push';

jest.mock('../../src/models/subscription.model');
jest.mock('web-push');

describe('NotificationService', () => {
  let service: NotificationService;
  const mockWebpush = webpush as jest.Mocked<typeof webpush>;

  beforeEach(() => {
    service = new NotificationService(mockWebpush);
    jest.clearAllMocks();
  });

  describe('subscribe', () => {
    it('should allow multiple subscriptions for same user', async () => {
      const userId = 'user123';
      const subscription1 = {
        endpoint: 'https://fcm.googleapis.com/device1',
        keys: { p256dh: 'key1', auth: 'auth1' }
      };
      const subscription2 = {
        endpoint: 'https://fcm.googleapis.com/device2',
        keys: { p256dh: 'key2', auth: 'auth2' }
      };

      (Subscription.findOneAndUpdate as jest.Mock)
        .mockResolvedValueOnce({ userId, endpoint: subscription1.endpoint })
        .mockResolvedValueOnce({ userId, endpoint: subscription2.endpoint });
      
      (Subscription.countDocuments as jest.Mock).mockResolvedValue(2);

      await service.subscribe({ userId, subscription: subscription1 });
      await service.subscribe({ userId, subscription: subscription2 });

      expect(Subscription.findOneAndUpdate).toHaveBeenCalledTimes(2);
    });
  });

  describe('sendToUser', () => {
    it('should send notification to all user devices', async () => {
      const userId = 'user123';
      const payload = { title: 'Test', body: 'Message' };
      
      const mockSubs = [
        {
          userId,
          endpoint: 'endpoint1',
          subscription: { endpoint: 'endpoint1', keys: {} },
          updateLastActive: jest.fn()
        },
        {
          userId,
          endpoint: 'endpoint2',
          subscription: { endpoint: 'endpoint2', keys: {} },
          updateLastActive: jest.fn()
        }
      ];

      (Subscription.find as jest.Mock).mockResolvedValue(mockSubs);
      mockWebpush.sendNotification.mockResolvedValue({} as any);

      const result = await service.sendToUser(userId, payload);

      expect(result.sent).toBe(2);
      expect(result.failed).toBe(0);
      expect(mockWebpush.sendNotification).toHaveBeenCalledTimes(2);
    });

    it('should delete invalid subscriptions on 410/404', async () => {
      const userId = 'user123';
      const payload = { title: 'Test', body: 'Message' };
      
      const mockSub = {
        userId,
        endpoint: 'endpoint1',
        subscription: { endpoint: 'endpoint1', keys: {} },
        updateLastActive: jest.fn()
      };

      (Subscription.find as jest.Mock).mockResolvedValue([mockSub]);
      mockWebpush.sendNotification.mockRejectedValue({ statusCode: 410 });
      (Subscription.deleteOne as jest.Mock).mockResolvedValue({});

      const result = await service.sendToUser(userId, payload);

      expect(result.sent).toBe(0);
      expect(result.failed).toBe(1);
      expect(Subscription.deleteOne).toHaveBeenCalledWith({ endpoint: 'endpoint1' });
    });
  });
});
```

## Phase 5: API Documentation

### 5.1 API Documentation
```markdown
## API Endpoints

### POST /api/v1/subscribe
Register a push subscription for a device

Request:
```json
{
  "userId": "user123",
  "subscription": {
    "endpoint": "https://fcm.googleapis.com/...",
    "keys": {
      "p256dh": "...",
      "auth": "..."
    },
    "expirationTime": null
  },
  "deviceInfo": {
    "userAgent": "Mozilla/5.0...",
    "deviceType": "desktop",
    "browserName": "Chrome"
  }
}
```

Response:
```json
{
  "success": true,
  "data": {
    "userId": "user123",
    "endpoint": "https://fcm.googleapis.com/..."
  }
}
```

### DELETE /api/v1/unsubscribe/:userId
Unsubscribe devices

**Unsubscribe all devices:**
```
DELETE /api/v1/unsubscribe/user123
```

Response:
```json
{
  "success": true,
  "data": {
    "userId": "user123",
    "devicesUnsubscribed": 3
  }
}
```

**Unsubscribe specific device:**
```
DELETE /api/v1/unsubscribe/user123?endpoint=https://fcm.googleapis.com/...
```

Response:
```json
{
  "success": true,
  "data": {
    "userId": "user123",
    "endpoint": "https://fcm.googleapis.com/..."
  }
}
```

### POST /api/v1/send
Send notification

**Send to specific user (all devices):**
```json
{
  "userId": "user123",
  "notification": {
    "title": "New Message",
    "body": "You have a new message",
    "icon": "/icon.png",
    "data": {
      "url": "/messages/123"
    }
  }
}
```

Response:
```json
{
  "success": true,
  "data": {
    "userId": "user123",
    "devicesNotified": 2,
    "devicesFailed": 0
  }
}
```

**Broadcast to all users and devices:**
```json
{
  "notification": {
    "title": "System Update",
    "body": "New features available"
  }
}
```

Response:
```json
{
  "success": true,
  "data": {
    "total": 150,
    "successful": 148,
    "failed": 2,
    "details": [
      {
        "userId": "user123",
        "devicesNotified": 2,
        "devicesFailed": 0
      }
    ]
  }
}
```

### GET /api/v1/users/:userId/subscriptions
Get all subscriptions for a user

Response:
```json
{
  "success": true,
  "data": {
    "userId": "user123",
    "totalSubscriptions": 3,
    "devices": [
      {
        "endpoint": "https://fcm.googleapis.com/...",
        "deviceInfo": {
          "userAgent": "Mozilla/5.0...",
          "deviceType": "desktop",
          "browserName": "Chrome"
        },
        "subscribedAt": "2025-01-15T10:00:00Z",
        "lastActiveAt": "2025-01-20T15:30:00Z"
      }
    ]
  }
}
```
```

### 5.2 Environment Variables
```bash
# .env.example
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://localhost:27017/pushnotifications
VAPID_PUBLIC_KEY=your_public_key_here
VAPID_PRIVATE_KEY=your_private_key_here
VAPID_EMAIL=mailto:admin@example.com
LOG_LEVEL=info
```

## Key Implementation Decisions

1. **Hard Delete vs Soft Delete**: The implementation uses hard deletion of subscriptions instead of marking them as inactive. This simplifies the data model and achieves the same functional outcome.

2. **Automatic Cleanup**: Invalid subscriptions (410/404 responses) are immediately deleted during send operations, maintaining database cleanliness without separate cleanup jobs.

3. **No Active Field**: Since subscriptions are deleted when invalid, there's no need for an active/inactive status field.

4. **Simplified Queries**: All database queries are simplified since we don't need to filter by active status - all stored subscriptions are valid.

## Build & Deployment Commands

```bash
# Install dependencies
yarn install

# Development
yarn dev

# Build for production
yarn build

# Run tests
yarn test

# Lint code
yarn lint

# Build Docker image
docker build -t push-notification-service:latest .

# Run with Docker Compose
docker-compose up

# Deploy to Kubernetes
kubectl apply -f kubernetes/
```