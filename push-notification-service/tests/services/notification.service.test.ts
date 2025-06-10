// tests/services/notification.service.test.ts
import { NotificationService } from '../../src/services/notification.service';
import { Subscription } from '../../src/models/subscription.model';
import webpush from 'web-push';
import { ISubscriptionDocument } from '../../src/models/subscription.model';

// Mock dependencies
jest.mock('../../src/models/subscription.model');
jest.mock('web-push');
jest.mock('../../src/config/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  }
}));

describe('NotificationService', () => {
  let service: NotificationService;
  const mockWebpush = webpush as jest.Mocked<typeof webpush>;

  beforeEach(() => {
    service = new NotificationService(mockWebpush);
    jest.clearAllMocks();
  });

  describe('subscribe', () => {
    it('should create a new subscription', async () => {
      const subscribeRequest = {
        userId: 'user123',
        subscription: {
          endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
          keys: {
            p256dh: 'test-p256dh',
            auth: 'test-auth'
          }
        },
        deviceInfo: {
          userAgent: 'Mozilla/5.0',
          deviceType: 'desktop',
          browserName: 'Chrome'
        }
      };

      const mockSubscription = {
        ...subscribeRequest,
        endpoint: subscribeRequest.subscription.endpoint,
        subscribedAt: new Date(),
        lastActiveAt: new Date(),
        _id: 'sub123',
        updateLastActive: jest.fn()
      } as any;

      (Subscription.findOneAndUpdate as jest.Mock).mockResolvedValue(mockSubscription);
      (Subscription.countDocuments as jest.Mock).mockResolvedValue(1);

      const result = await service.subscribe(subscribeRequest);

      expect(result).toEqual(mockSubscription);
      expect(Subscription.findOneAndUpdate).toHaveBeenCalledWith(
        { endpoint: subscribeRequest.subscription.endpoint },
        expect.objectContaining({
          userId: subscribeRequest.userId,
          endpoint: subscribeRequest.subscription.endpoint,
          subscription: subscribeRequest.subscription,
          deviceInfo: subscribeRequest.deviceInfo
        }),
        { upsert: true, new: true }
      );
    });

    it('should handle subscription errors', async () => {
      const subscribeRequest = {
        userId: 'user123',
        subscription: {
          endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
          keys: { p256dh: 'test', auth: 'test' }
        }
      };

      (Subscription.findOneAndUpdate as jest.Mock).mockRejectedValue(new Error('DB Error'));

      await expect(service.subscribe(subscribeRequest)).rejects.toThrow('Failed to subscribe device');
    });
  });

  describe('unsubscribe', () => {
    it('should unsubscribe by userId and endpoint', async () => {
      const userId = 'user123';
      const endpoint = 'https://fcm.googleapis.com/fcm/send/abc123';
      const mockSubscription = {
        userId,
        endpoint,
        _id: 'sub123'
      };

      (Subscription.findOneAndDelete as jest.Mock).mockResolvedValue(mockSubscription);

      const result = await service.unsubscribe(userId, endpoint);

      expect(result).toEqual(mockSubscription);
      expect(Subscription.findOneAndDelete).toHaveBeenCalledWith({ userId, endpoint });
    });

    it('should return null if no subscription found', async () => {
      (Subscription.findOneAndDelete as jest.Mock).mockResolvedValue(null);

      const result = await service.unsubscribe('user123', 'nonexistent-endpoint');

      expect(result).toBeNull();
    });

    it('should handle unsubscribe errors', async () => {
      (Subscription.findOneAndDelete as jest.Mock).mockRejectedValue(new Error('DB Error'));

      await expect(
        service.unsubscribe('user123', 'endpoint')
      ).rejects.toThrow('Failed to unsubscribe device');
    });
  });

  describe('unsubscribeAllDevices', () => {
    it('should delete all subscriptions for a user', async () => {
      const userId = 'user123';
      (Subscription.deleteMany as jest.Mock).mockResolvedValue({ deletedCount: 3 });

      const result = await service.unsubscribeAllDevices(userId);

      expect(result).toBe(3);
      expect(Subscription.deleteMany).toHaveBeenCalledWith({ userId });
    });

    it('should handle errors when deleting all devices', async () => {
      (Subscription.deleteMany as jest.Mock).mockRejectedValue(new Error('DB Error'));

      await expect(
        service.unsubscribeAllDevices('user123')
      ).rejects.toThrow('Failed to unsubscribe all devices');
    });
  });

  describe('getUserSubscriptions', () => {
    it('should return user subscription summary', async () => {
      const userId = 'user123';
      const mockSubscriptions = [
        {
          userId,
          endpoint: 'endpoint1',
          deviceInfo: { deviceType: 'desktop' },
          subscribedAt: new Date('2024-01-01'),
          lastActiveAt: new Date('2024-01-15')
        },
        {
          userId,
          endpoint: 'endpoint2',
          deviceInfo: { deviceType: 'mobile' },
          subscribedAt: new Date('2024-01-05'),
          lastActiveAt: new Date('2024-01-20')
        }
      ];

      (Subscription.find as jest.Mock).mockResolvedValue(mockSubscriptions);

      const result = await service.getUserSubscriptions(userId);

      expect(result).toEqual({
        userId,
        totalSubscriptions: 2,
        devices: mockSubscriptions.map(sub => ({
          endpoint: sub.endpoint,
          deviceInfo: sub.deviceInfo,
          subscribedAt: sub.subscribedAt,
          lastActiveAt: sub.lastActiveAt
        }))
      });
    });

    it('should return empty array for user with no subscriptions', async () => {
      const userId = 'user123';
      (Subscription.find as jest.Mock).mockResolvedValue([]);

      const result = await service.getUserSubscriptions(userId);

      expect(result).toEqual({
        userId,
        totalSubscriptions: 0,
        devices: []
      });
    });
  });

  describe('sendToUser', () => {
    it('should send notifications to all user devices', async () => {
      const userId = 'user123';
      const payload = {
        title: 'Test Notification',
        body: 'This is a test'
      };

      const mockSubscriptions = [
        {
          userId,
          endpoint: 'endpoint1',
          subscription: {
            endpoint: 'endpoint1',
            keys: { p256dh: 'key1', auth: 'auth1' }
          },
          updateLastActive: jest.fn().mockResolvedValue(true)
        },
        {
          userId,
          endpoint: 'endpoint2',
          subscription: {
            endpoint: 'endpoint2',
            keys: { p256dh: 'key2', auth: 'auth2' }
          },
          updateLastActive: jest.fn().mockResolvedValue(true)
        }
      ] as any[];

      (Subscription.find as jest.Mock).mockResolvedValue(mockSubscriptions);
      mockWebpush.sendNotification.mockResolvedValue({} as any);

      const result = await service.sendToUser(userId, payload);

      expect(result).toEqual({ sent: 2, failed: 0 });
      expect(mockWebpush.sendNotification).toHaveBeenCalledTimes(2);
      expect(mockSubscriptions[0].updateLastActive).toHaveBeenCalled();
      expect(mockSubscriptions[1].updateLastActive).toHaveBeenCalled();
    });

    it('should handle 410 Gone errors by deleting subscription', async () => {
      const userId = 'user123';
      const payload = { title: 'Test', body: 'Test' };

      const mockSubscription = {
        userId,
        endpoint: 'endpoint1',
        subscription: {
          endpoint: 'endpoint1',
          keys: { p256dh: 'key1', auth: 'auth1' }
        },
        updateLastActive: jest.fn()
      } as any;

      (Subscription.find as jest.Mock).mockResolvedValue([mockSubscription]);
      mockWebpush.sendNotification.mockRejectedValue({ statusCode: 410 });
      (Subscription.deleteOne as jest.Mock).mockResolvedValue({});

      const result = await service.sendToUser(userId, payload);

      expect(result).toEqual({ sent: 0, failed: 1 });
      expect(Subscription.deleteOne).toHaveBeenCalledWith({ endpoint: 'endpoint1' });
    });

    it('should handle 404 Not Found errors by deleting subscription', async () => {
      const userId = 'user123';
      const payload = { title: 'Test', body: 'Test' };

      const mockSubscription = {
        userId,
        endpoint: 'endpoint1',
        subscription: {
          endpoint: 'endpoint1',
          keys: { p256dh: 'key1', auth: 'auth1' }
        },
        updateLastActive: jest.fn()
      } as any;

      (Subscription.find as jest.Mock).mockResolvedValue([mockSubscription]);
      mockWebpush.sendNotification.mockRejectedValue({ statusCode: 404 });
      (Subscription.deleteOne as jest.Mock).mockResolvedValue({});

      const result = await service.sendToUser(userId, payload);

      expect(result).toEqual({ sent: 0, failed: 1 });
      expect(Subscription.deleteOne).toHaveBeenCalledWith({ endpoint: 'endpoint1' });
    });

    it('should throw error if user has no subscriptions', async () => {
      (Subscription.find as jest.Mock).mockResolvedValue([]);

      await expect(
        service.sendToUser('user123', { title: 'Test', body: 'Test' })
      ).rejects.toThrow('User has no subscriptions');
    });
  });

  describe('sendToAll', () => {
    it('should broadcast to all subscriptions grouped by user', async () => {
      const payload = { title: 'Broadcast', body: 'To everyone' };

      const mockSubscriptions = [
        {
          userId: 'user1',
          endpoint: 'endpoint1',
          subscription: { endpoint: 'endpoint1', keys: {} },
          updateLastActive: jest.fn().mockResolvedValue(true)
        },
        {
          userId: 'user1',
          endpoint: 'endpoint2',
          subscription: { endpoint: 'endpoint2', keys: {} },
          updateLastActive: jest.fn().mockResolvedValue(true)
        },
        {
          userId: 'user2',
          endpoint: 'endpoint3',
          subscription: { endpoint: 'endpoint3', keys: {} },
          updateLastActive: jest.fn().mockResolvedValue(true)
        }
      ] as any[];

      (Subscription.find as jest.Mock).mockResolvedValue(mockSubscriptions);
      mockWebpush.sendNotification.mockResolvedValue({} as any);

      const result = await service.sendToAll(payload);

      expect(result).toEqual({
        total: 3,
        successful: 3,
        failed: 0,
        details: [
          { userId: 'user1', devicesNotified: 2, devicesFailed: 0 },
          { userId: 'user2', devicesNotified: 1, devicesFailed: 0 }
        ]
      });
      expect(mockWebpush.sendNotification).toHaveBeenCalledTimes(3);
    });

    it('should handle mixed success and failure', async () => {
      const payload = { title: 'Broadcast', body: 'To everyone' };

      const mockSubscriptions = [
        {
          userId: 'user1',
          endpoint: 'endpoint1',
          subscription: { endpoint: 'endpoint1', keys: {} },
          updateLastActive: jest.fn().mockResolvedValue(true)
        },
        {
          userId: 'user1',
          endpoint: 'endpoint2',
          subscription: { endpoint: 'endpoint2', keys: {} },
          updateLastActive: jest.fn()
        }
      ] as any[];

      (Subscription.find as jest.Mock).mockResolvedValue(mockSubscriptions);
      mockWebpush.sendNotification
        .mockResolvedValueOnce({} as any)
        .mockRejectedValueOnce({ statusCode: 500 });

      const result = await service.sendToAll(payload);

      expect(result.successful).toBe(1);
      expect(result.failed).toBe(1);
    });

    it('should return empty result if no subscriptions', async () => {
      (Subscription.find as jest.Mock).mockResolvedValue([]);

      const result = await service.sendToAll({ title: 'Test', body: 'Test' });

      expect(result).toEqual({
        total: 0,
        successful: 0,
        failed: 0,
        details: []
      });
    });

    it('should clean up invalid subscriptions during broadcast', async () => {
      const payload = { title: 'Broadcast', body: 'To everyone' };

      const mockSubscriptions = [
        {
          userId: 'user1',
          endpoint: 'endpoint1',
          subscription: { endpoint: 'endpoint1', keys: {} },
          updateLastActive: jest.fn()
        }
      ] as any[];

      (Subscription.find as jest.Mock).mockResolvedValue(mockSubscriptions);
      mockWebpush.sendNotification.mockRejectedValue({ statusCode: 410 });
      (Subscription.deleteOne as jest.Mock).mockResolvedValue({});

      const result = await service.sendToAll(payload);

      expect(result.failed).toBe(1);
      expect(Subscription.deleteOne).toHaveBeenCalledWith({ endpoint: 'endpoint1' });
    });
  });
});