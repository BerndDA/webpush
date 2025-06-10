// tests/controllers/notification.controller.test.ts
import { Request, Response, NextFunction } from 'express';
import { NotificationController } from '../../src/controllers/notification.controller';
import { NotificationService } from '../../src/services/notification.service';

// Mock the service
jest.mock('../../src/services/notification.service');

describe('NotificationController', () => {
  let controller: NotificationController;
  let mockService: jest.Mocked<NotificationService>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockService = new NotificationService(null as any) as jest.Mocked<NotificationService>;
    controller = new NotificationController(mockService);

    mockRequest = {
      body: {},
      params: {},
      query: {}
    };

    mockResponse = {
      json: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis()
    };

    mockNext = jest.fn();
    
    jest.clearAllMocks();
  });

  describe('subscribe', () => {
    it('should successfully subscribe a device', async () => {
      const subscribeRequest = {
        subscription: {
          endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
          keys: { p256dh: 'key', auth: 'auth' }
        },
        deviceInfo: {
          userAgent: 'Mozilla/5.0',
          deviceType: 'desktop',
          browserName: 'Chrome'
        }
      };

      mockRequest.params = { userId: 'user123' };
      mockRequest.body = subscribeRequest;
      
      const mockResult = {
        userId: 'user123',
        endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
        subscribedAt: new Date(),
        _id: 'sub123'
      };

      mockService.subscribe.mockResolvedValue(mockResult as any);

      await controller.subscribe(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockService.subscribe).toHaveBeenCalledWith({
        userId: 'user123',
        ...subscribeRequest
      });
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          userId: mockResult.userId,
          endpoint: mockResult.endpoint,
          subscribedAt: mockResult.subscribedAt
        }
      });
    });

    it('should return 400 if subscription is missing', async () => {
      mockRequest.params = { userId: 'user123' };
      mockRequest.body = {};

      await controller.subscribe(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'subscription is required'
      });
    });

    it('should handle service errors', async () => {
      mockRequest.params = { userId: 'user123' };
      mockRequest.body = {
        subscription: { endpoint: 'test', keys: {} }
      };

      const error = new Error('Service error');
      mockService.subscribe.mockRejectedValue(error);

      await controller.subscribe(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('unsubscribeDevice', () => {
    it('should unsubscribe specific device by endpoint', async () => {
      mockRequest.params = { 
        userId: 'user123',
        endpoint: 'https://fcm.googleapis.com/fcm/send/abc123'
      };

      const mockResult = {
        userId: 'user123',
        endpoint: 'https://fcm.googleapis.com/fcm/send/abc123'
      };

      mockService.unsubscribe.mockResolvedValue(mockResult as any);

      await controller.unsubscribeDevice(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockService.unsubscribe).toHaveBeenCalledWith(
        'user123',
        'https://fcm.googleapis.com/fcm/send/abc123'
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          userId: mockResult.userId,
          endpoint: mockResult.endpoint
        }
      });
    });

    it('should return 404 if subscription not found', async () => {
      mockRequest.params = { 
        userId: 'user123',
        endpoint: 'nonexistent'
      };

      mockService.unsubscribe.mockResolvedValue(null);

      await controller.unsubscribeDevice(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Subscription not found'
      });
    });

    it('should handle service errors', async () => {
      mockRequest.params = { 
        userId: 'user123',
        endpoint: 'endpoint'
      };

      const error = new Error('Service error');
      mockService.unsubscribe.mockRejectedValue(error);

      await controller.unsubscribeDevice(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('unsubscribeAllDevices', () => {
    it('should unsubscribe all devices for user', async () => {
      mockRequest.params = { userId: 'user123' };

      mockService.unsubscribeAllDevices.mockResolvedValue(3);

      await controller.unsubscribeAllDevices(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockService.unsubscribeAllDevices).toHaveBeenCalledWith('user123');
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          userId: 'user123',
          devicesUnsubscribed: 3
        }
      });
    });

    it('should handle when no devices to unsubscribe', async () => {
      mockRequest.params = { userId: 'user123' };

      mockService.unsubscribeAllDevices.mockResolvedValue(0);

      await controller.unsubscribeAllDevices(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          userId: 'user123',
          devicesUnsubscribed: 0
        }
      });
    });

    it('should handle service errors', async () => {
      mockRequest.params = { userId: 'user123' };

      const error = new Error('Service error');
      mockService.unsubscribeAllDevices.mockRejectedValue(error);

      await controller.unsubscribeAllDevices(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getUserSubscriptions', () => {
    it('should return user subscriptions', async () => {
      mockRequest.params = { userId: 'user123' };

      const mockSummary = {
        userId: 'user123',
        totalSubscriptions: 2,
        devices: [
          {
            endpoint: 'endpoint1',
            deviceInfo: { deviceType: 'desktop' },
            subscribedAt: new Date(),
            lastActiveAt: new Date()
          },
          {
            endpoint: 'endpoint2',
            deviceInfo: { deviceType: 'mobile' },
            subscribedAt: new Date(),
            lastActiveAt: new Date()
          }
        ]
      };

      mockService.getUserSubscriptions.mockResolvedValue(mockSummary);

      await controller.getUserSubscriptions(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockService.getUserSubscriptions).toHaveBeenCalledWith('user123');
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockSummary
      });
    });

    it('should handle empty subscriptions', async () => {
      mockRequest.params = { userId: 'user123' };

      const mockSummary = {
        userId: 'user123',
        totalSubscriptions: 0,
        devices: []
      };

      mockService.getUserSubscriptions.mockResolvedValue(mockSummary);

      await controller.getUserSubscriptions(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockSummary
      });
    });

    it('should handle service errors', async () => {
      mockRequest.params = { userId: 'user123' };

      const error = new Error('Service error');
      mockService.getUserSubscriptions.mockRejectedValue(error);

      await controller.getUserSubscriptions(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('sendToUser', () => {
    it('should send notification to specific user', async () => {
      mockRequest.params = { userId: 'user123' };
      mockRequest.body = {
        notification: {
          title: 'Test',
          body: 'Test message'
        }
      };

      mockService.sendToUser.mockResolvedValue({ sent: 2, failed: 0 });

      await controller.sendToUser(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockService.sendToUser).toHaveBeenCalledWith(
        'user123',
        { title: 'Test', body: 'Test message' }
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          userId: 'user123',
          devicesNotified: 2,
          devicesFailed: 0
        }
      });
    });

    it('should handle partial failures', async () => {
      mockRequest.params = { userId: 'user123' };
      mockRequest.body = {
        notification: {
          title: 'Test',
          body: 'Test message'
        }
      };

      mockService.sendToUser.mockResolvedValue({ sent: 1, failed: 1 });

      await controller.sendToUser(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          userId: 'user123',
          devicesNotified: 1,
          devicesFailed: 1
        }
      });
    });

    it('should return 400 if notification payload is missing', async () => {
      mockRequest.params = { userId: 'user123' };
      mockRequest.body = {};

      await controller.sendToUser(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'notification payload is required'
      });
    });

    it('should handle service errors', async () => {
      mockRequest.params = { userId: 'user123' };
      mockRequest.body = {
        notification: { title: 'Test', body: 'Test' }
      };

      const error = new Error('User has no subscriptions');
      mockService.sendToUser.mockRejectedValue(error);

      await controller.sendToUser(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('broadcastToAll', () => {
    it('should broadcast to all users', async () => {
      mockRequest.body = {
        notification: {
          title: 'Broadcast',
          body: 'To everyone'
        }
      };

      const mockResult = {
        total: 10,
        successful: 9,
        failed: 1,
        details: [
          { userId: 'user1', devicesNotified: 5, devicesFailed: 0 },
          { userId: 'user2', devicesNotified: 4, devicesFailed: 1 }
        ]
      };

      mockService.sendToAll.mockResolvedValue(mockResult);

      await controller.broadcastToAll(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockService.sendToAll).toHaveBeenCalledWith({
        title: 'Broadcast',
        body: 'To everyone'
      });
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult
      });
    });

    it('should handle empty broadcast', async () => {
      mockRequest.body = {
        notification: {
          title: 'Broadcast',
          body: 'To everyone'
        }
      };

      const mockResult = {
        total: 0,
        successful: 0,
        failed: 0,
        details: []
      };

      mockService.sendToAll.mockResolvedValue(mockResult);

      await controller.broadcastToAll(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult
      });
    });

    it('should return 400 if notification payload is missing', async () => {
      mockRequest.body = {};

      await controller.broadcastToAll(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'notification payload is required'
      });
    });

    it('should handle service errors', async () => {
      mockRequest.body = {
        notification: { title: 'Test', body: 'Test' }
      };

      const error = new Error('Service error');
      mockService.sendToAll.mockRejectedValue(error);

      await controller.broadcastToAll(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});