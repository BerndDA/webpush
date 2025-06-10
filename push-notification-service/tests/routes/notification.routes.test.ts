import { Router } from 'express';
import { createNotificationRouter, createInternalNotificationRouter } from '../../src/routes/notification.routes';
import { NotificationController } from '../../src/controllers/notification.controller';
import { NotificationService } from '../../src/services/notification.service';
import { initializeWebPush } from '../../src/config/webpush';

// Mock dependencies
jest.mock('../../src/controllers/notification.controller');
jest.mock('../../src/services/notification.service');
jest.mock('../../src/config/webpush');
jest.mock('../../src/middleware/validateUserId');

const mockNotificationController = {
  subscribe: jest.fn(),
  getUserSubscriptions: jest.fn(),
  unsubscribeDevice: jest.fn(),
  unsubscribeAllDevices: jest.fn(),
  sendToUser: jest.fn(),
  broadcastToAll: jest.fn(),
};

const mockNotificationService = {};
const mockWebPush = {};

// Mock Express Router
const mockRouter = {
  post: jest.fn(),
  get: jest.fn(),
  delete: jest.fn(),
  param: jest.fn(),
};

jest.mock('express', () => ({
  Router: jest.fn(() => mockRouter),
}));

describe('Notification Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock implementations
    (initializeWebPush as jest.Mock).mockReturnValue(mockWebPush);
    (NotificationService as jest.Mock).mockReturnValue(mockNotificationService);
    (NotificationController as jest.Mock).mockReturnValue(mockNotificationController);
  });

  describe('createNotificationRouter', () => {
    it('should create a router with correct dependencies', () => {
      // Act
      const router = createNotificationRouter();

      // Assert
      expect(Router).toHaveBeenCalledTimes(1);
      expect(initializeWebPush).toHaveBeenCalledTimes(1);
      expect(NotificationService).toHaveBeenCalledWith(mockWebPush);
      expect(NotificationController).toHaveBeenCalledWith(mockNotificationService);
      expect(router).toBe(mockRouter);
    });

    it('should register userId parameter validation', () => {
      // Act
      createNotificationRouter();

      // Assert
      expect(mockRouter.param).toHaveBeenCalledWith('userId', expect.any(Function));
    });

    it('should register POST route for subscriptions', () => {
      // Act
      createNotificationRouter();

      // Assert
      expect(mockRouter.post).toHaveBeenCalledWith(
        '/users/:userId/subscriptions',
        mockNotificationController.subscribe
      );
    });

    it('should register GET route for user subscriptions', () => {
      // Act
      createNotificationRouter();

      // Assert
      expect(mockRouter.get).toHaveBeenCalledWith(
        '/users/:userId/subscriptions',
        mockNotificationController.getUserSubscriptions
      );
    });

    it('should register DELETE route for specific device unsubscription', () => {
      // Act
      createNotificationRouter();

      // Assert
      expect(mockRouter.delete).toHaveBeenCalledWith(
        '/users/:userId/subscriptions/:endpoint',
        mockNotificationController.unsubscribeDevice
      );
    });

    it('should register DELETE route for all devices unsubscription', () => {
      // Act
      createNotificationRouter();

      // Assert
      expect(mockRouter.delete).toHaveBeenCalledWith(
        '/users/:userId/subscriptions',
        mockNotificationController.unsubscribeAllDevices
      );
    });

    it('should register all expected routes', () => {
      // Act
      createNotificationRouter();

      // Assert
      expect(mockRouter.post).toHaveBeenCalledTimes(1);
      expect(mockRouter.get).toHaveBeenCalledTimes(1);
      expect(mockRouter.delete).toHaveBeenCalledTimes(2);
      expect(mockRouter.param).toHaveBeenCalledTimes(1);
    });
  });

  describe('createInternalNotificationRouter', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      
      // Reset mocks for clean testing
      (initializeWebPush as jest.Mock).mockReturnValue(mockWebPush);
      (NotificationService as jest.Mock).mockReturnValue(mockNotificationService);
      (NotificationController as jest.Mock).mockReturnValue(mockNotificationController);
    });

    it('should create a router with correct dependencies', () => {
      // Act
      const router = createInternalNotificationRouter();

      // Assert
      expect(Router).toHaveBeenCalledTimes(1);
      expect(initializeWebPush).toHaveBeenCalledTimes(1);
      expect(NotificationService).toHaveBeenCalledWith(mockWebPush);
      expect(NotificationController).toHaveBeenCalledWith(mockNotificationService);
      expect(router).toBe(mockRouter);
    });

    it('should register POST route for sending notifications to user', () => {
      // Act
      createInternalNotificationRouter();

      // Assert
      expect(mockRouter.post).toHaveBeenCalledWith(
        '/users/:userId/notifications',
        mockNotificationController.sendToUser
      );
    });

    it('should register POST route for broadcasting notifications', () => {
      // Act
      createInternalNotificationRouter();

      // Assert
      expect(mockRouter.post).toHaveBeenCalledWith(
        '/notifications/broadcast',
        mockNotificationController.broadcastToAll
      );
    });

    it('should register all expected routes', () => {
      // Act
      createInternalNotificationRouter();

      // Assert
      expect(mockRouter.post).toHaveBeenCalledTimes(2);
      expect(mockRouter.get).not.toHaveBeenCalled();
      expect(mockRouter.delete).not.toHaveBeenCalled();
      expect(mockRouter.param).not.toHaveBeenCalled();
    });
  });

  describe('Router parameter validation', () => {
    it('should call validateUserId middleware when userId parameter is used', () => {
      // Arrange
      const mockReq = { params: { userId: 'user123' } };
      const mockRes = {};
      const mockNext = jest.fn();

      // Act
      createNotificationRouter();

      // Get the parameter handler that was registered
      const paramHandler = mockRouter.param.mock.calls[0][1];
      paramHandler(mockReq, mockRes, mockNext, 'user123');

      // Assert
      expect(mockRouter.param).toHaveBeenCalledWith('userId', expect.any(Function));
    });
  });

  describe('Service initialization', () => {
    it('should initialize services in correct order for notification router', () => {
      // Act
      createNotificationRouter();

      // Assert
      const initializeWebPushCall = (initializeWebPush as jest.Mock).mock.invocationCallOrder[0];
      const notificationServiceCall = (NotificationService as jest.Mock).mock.invocationCallOrder[0];
      const notificationControllerCall = (NotificationController as jest.Mock).mock.invocationCallOrder[0];

      expect(initializeWebPushCall).toBeLessThan(notificationServiceCall);
      expect(notificationServiceCall).toBeLessThan(notificationControllerCall);
    });

    it('should initialize services in correct order for internal router', () => {
      // Clear previous calls
      jest.clearAllMocks();
      (initializeWebPush as jest.Mock).mockReturnValue(mockWebPush);
      (NotificationService as jest.Mock).mockReturnValue(mockNotificationService);
      (NotificationController as jest.Mock).mockReturnValue(mockNotificationController);

      // Act
      createInternalNotificationRouter();

      // Assert
      const initializeWebPushCall = (initializeWebPush as jest.Mock).mock.invocationCallOrder[0];
      const notificationServiceCall = (NotificationService as jest.Mock).mock.invocationCallOrder[0];
      const notificationControllerCall = (NotificationController as jest.Mock).mock.invocationCallOrder[0];

      expect(initializeWebPushCall).toBeLessThan(notificationServiceCall);
      expect(notificationServiceCall).toBeLessThan(notificationControllerCall);
    });
  });

  describe('Router instances', () => {
    it('should create separate router instances', () => {
      // Clear previous calls
      jest.clearAllMocks();
      
      // Act
      const router1 = createNotificationRouter();
      const router2 = createInternalNotificationRouter();

      // Assert
      expect(Router).toHaveBeenCalledTimes(2);
      expect(router1).toBe(mockRouter);
      expect(router2).toBe(mockRouter);
    });

    it('should initialize dependencies separately for each router', () => {
      // Clear previous calls
      jest.clearAllMocks();
      (initializeWebPush as jest.Mock).mockReturnValue(mockWebPush);
      (NotificationService as jest.Mock).mockReturnValue(mockNotificationService);
      (NotificationController as jest.Mock).mockReturnValue(mockNotificationController);

      // Act
      createNotificationRouter();
      createInternalNotificationRouter();

      // Assert
      expect(initializeWebPush).toHaveBeenCalledTimes(2);
      expect(NotificationService).toHaveBeenCalledTimes(2);
      expect(NotificationController).toHaveBeenCalledTimes(2);
    });
  });

  describe('Route registration verification', () => {
    it('should register routes with correct HTTP methods and paths', () => {
      // Act
      createNotificationRouter();

      // Assert - Verify exact route registrations
      const postCalls = mockRouter.post.mock.calls;
      const getCalls = mockRouter.get.mock.calls;
      const deleteCalls = mockRouter.delete.mock.calls;

      expect(postCalls).toHaveLength(1);
      expect(postCalls[0]).toEqual(['/users/:userId/subscriptions', mockNotificationController.subscribe]);

      expect(getCalls).toHaveLength(1);
      expect(getCalls[0]).toEqual(['/users/:userId/subscriptions', mockNotificationController.getUserSubscriptions]);

      expect(deleteCalls).toHaveLength(2);
      expect(deleteCalls[0]).toEqual(['/users/:userId/subscriptions/:endpoint', mockNotificationController.unsubscribeDevice]);
      expect(deleteCalls[1]).toEqual(['/users/:userId/subscriptions', mockNotificationController.unsubscribeAllDevices]);
    });

    it('should register internal routes with correct HTTP methods and paths', () => {
      // Clear previous calls
      jest.clearAllMocks();
      (initializeWebPush as jest.Mock).mockReturnValue(mockWebPush);
      (NotificationService as jest.Mock).mockReturnValue(mockNotificationService);
      (NotificationController as jest.Mock).mockReturnValue(mockNotificationController);

      // Act
      createInternalNotificationRouter();

      // Assert
      const postCalls = mockRouter.post.mock.calls;

      expect(postCalls).toHaveLength(2);
      expect(postCalls[0]).toEqual(['/users/:userId/notifications', mockNotificationController.sendToUser]);
      expect(postCalls[1]).toEqual(['/notifications/broadcast', mockNotificationController.broadcastToAll]);
    });
  });

  describe('Error handling during initialization', () => {
    it('should handle webpush initialization errors', () => {
      // Arrange
      const initError = new Error('VAPID configuration error');
      (initializeWebPush as jest.Mock).mockImplementation(() => {
        throw initError;
      });

      // Act & Assert
      expect(() => createNotificationRouter()).toThrow('VAPID configuration error');
    });

    it('should handle service initialization errors', () => {
      // Arrange
      (initializeWebPush as jest.Mock).mockReturnValue(mockWebPush);
      (NotificationService as jest.Mock).mockImplementation(() => {
        throw new Error('Service initialization failed');
      });

      // Act & Assert
      expect(() => createNotificationRouter()).toThrow('Service initialization failed');
    });

    it('should handle controller initialization errors', () => {
      // Arrange
      (initializeWebPush as jest.Mock).mockReturnValue(mockWebPush);
      (NotificationService as jest.Mock).mockReturnValue(mockNotificationService);
      (NotificationController as jest.Mock).mockImplementation(() => {
        throw new Error('Controller initialization failed');
      });

      // Act & Assert
      expect(() => createNotificationRouter()).toThrow('Controller initialization failed');
    });
  });
});
