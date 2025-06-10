import { initializeWebPush } from '../../src/config/webpush';
import webpush from 'web-push';

// Mock the web-push module
jest.mock('web-push', () => ({
  setVapidDetails: jest.fn(),
}));

describe('WebPush Configuration', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment variables
    originalEnv = { ...process.env };
    
    // Clear all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Restore original environment variables
    process.env = originalEnv;
  });

  describe('initializeWebPush', () => {
    it('should initialize web-push with valid VAPID details', () => {
      // Arrange
      process.env.VAPID_EMAIL = 'test@example.com';
      process.env.VAPID_PUBLIC_KEY = 'test-public-key';
      process.env.VAPID_PRIVATE_KEY = 'test-private-key';

      // Act
      const result = initializeWebPush();

      // Assert
      expect(webpush.setVapidDetails).toHaveBeenCalledWith(
        'mailto:test@example.com',
        'test-public-key',
        'test-private-key'
      );
      expect(result).toBe(webpush);
    });

    it('should handle email that already has mailto: prefix', () => {
      // Arrange
      process.env.VAPID_EMAIL = 'mailto:test@example.com';
      process.env.VAPID_PUBLIC_KEY = 'test-public-key';
      process.env.VAPID_PRIVATE_KEY = 'test-private-key';

      // Act
      initializeWebPush();

      // Assert
      expect(webpush.setVapidDetails).toHaveBeenCalledWith(
        'mailto:test@example.com',
        'test-public-key',
        'test-private-key'
      );
    });

    it('should throw error when VAPID_EMAIL is missing', () => {
      // Arrange
      delete process.env.VAPID_EMAIL;
      process.env.VAPID_PUBLIC_KEY = 'test-public-key';
      process.env.VAPID_PRIVATE_KEY = 'test-private-key';

      // Act & Assert
      expect(() => initializeWebPush()).toThrow('Missing required VAPID environment variables');
      expect(webpush.setVapidDetails).not.toHaveBeenCalled();
    });

    it('should throw error when VAPID_PUBLIC_KEY is missing', () => {
      // Arrange
      process.env.VAPID_EMAIL = 'test@example.com';
      delete process.env.VAPID_PUBLIC_KEY;
      process.env.VAPID_PRIVATE_KEY = 'test-private-key';

      // Act & Assert
      expect(() => initializeWebPush()).toThrow('Missing required VAPID environment variables');
      expect(webpush.setVapidDetails).not.toHaveBeenCalled();
    });

    it('should throw error when VAPID_PRIVATE_KEY is missing', () => {
      // Arrange
      process.env.VAPID_EMAIL = 'test@example.com';
      process.env.VAPID_PUBLIC_KEY = 'test-public-key';
      delete process.env.VAPID_PRIVATE_KEY;

      // Act & Assert
      expect(() => initializeWebPush()).toThrow('Missing required VAPID environment variables');
      expect(webpush.setVapidDetails).not.toHaveBeenCalled();
    });

    it('should throw error when all VAPID environment variables are missing', () => {
      // Arrange
      delete process.env.VAPID_EMAIL;
      delete process.env.VAPID_PUBLIC_KEY;
      delete process.env.VAPID_PRIVATE_KEY;

      // Act & Assert
      expect(() => initializeWebPush()).toThrow('Missing required VAPID environment variables');
      expect(webpush.setVapidDetails).not.toHaveBeenCalled();
    });

    it('should throw error when VAPID environment variables are empty strings', () => {
      // Arrange
      process.env.VAPID_EMAIL = '';
      process.env.VAPID_PUBLIC_KEY = '';
      process.env.VAPID_PRIVATE_KEY = '';

      // Act & Assert
      expect(() => initializeWebPush()).toThrow('Missing required VAPID environment variables');
      expect(webpush.setVapidDetails).not.toHaveBeenCalled();
    });

    it('should handle mixed case email addresses', () => {
      // Arrange
      process.env.VAPID_EMAIL = 'Test@Example.COM';
      process.env.VAPID_PUBLIC_KEY = 'test-public-key';
      process.env.VAPID_PRIVATE_KEY = 'test-private-key';

      // Act
      initializeWebPush();

      // Assert
      expect(webpush.setVapidDetails).toHaveBeenCalledWith(
        'mailto:Test@Example.COM',
        'test-public-key',
        'test-private-key'
      );
    });

    it('should handle whitespace in environment variables', () => {
      // Arrange
      process.env.VAPID_EMAIL = '  test@example.com  ';
      process.env.VAPID_PUBLIC_KEY = '  test-public-key  ';
      process.env.VAPID_PRIVATE_KEY = '  test-private-key  ';

      // Act
      initializeWebPush();

      // Assert
      expect(webpush.setVapidDetails).toHaveBeenCalledWith(
        'mailto:  test@example.com  ',
        '  test-public-key  ',
        '  test-private-key  '
      );
    });
  });
});
