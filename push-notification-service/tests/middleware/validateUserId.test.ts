import { Request, Response, NextFunction } from 'express';
import { validateUserId } from '../../src/middleware/validateUserId';
import { IApiResponse } from '../../src/types';

describe('validateUserId Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let responseJson: jest.Mock;
  let responseStatus: jest.Mock;

  beforeEach(() => {
    // Reset mocks before each test
    responseJson = jest.fn();
    responseStatus = jest.fn().mockReturnValue({ json: responseJson });
    
    mockRequest = {
      headers: {},
      params: {}
    };
    
    mockResponse = {
      status: responseStatus,
      json: responseJson
    };
    
    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Valid scenarios', () => {
    it('should call next() when X-UserId header matches userId parameter', () => {
      // Arrange
      const userId = 'user123';
      mockRequest.headers = { 'x-userid': userId };
      mockRequest.params = { userId };

      // Act
      validateUserId(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(responseStatus).not.toHaveBeenCalled();
      expect(responseJson).not.toHaveBeenCalled();
    });

    it('should handle case-sensitive header matching', () => {
      // Arrange
      const userId = 'User123';
      mockRequest.headers = { 'x-userid': userId };
      mockRequest.params = { userId };

      // Act
      validateUserId(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(responseStatus).not.toHaveBeenCalled();
      expect(responseJson).not.toHaveBeenCalled();
    });

    it('should handle special characters in userId', () => {
      // Arrange
      const userId = 'user-123_test@example.com';
      mockRequest.headers = { 'x-userid': userId };
      mockRequest.params = { userId };

      // Act
      validateUserId(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(responseStatus).not.toHaveBeenCalled();
      expect(responseJson).not.toHaveBeenCalled();
    });
  });

  describe('Missing X-UserId header', () => {
    it('should return 401 when X-UserId header is missing', () => {
      // Arrange
      mockRequest.headers = {};
      mockRequest.params = { userId: 'user123' };

      // Act
      validateUserId(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(responseStatus).toHaveBeenCalledWith(401);
      expect(responseJson).toHaveBeenCalledWith({
        success: false,
        error: 'X-UserId header is required'
      } as IApiResponse);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when X-UserId header is empty string', () => {
      // Arrange
      mockRequest.headers = { 'x-userid': '' };
      mockRequest.params = { userId: 'user123' };

      // Act
      validateUserId(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(responseStatus).toHaveBeenCalledWith(401);
      expect(responseJson).toHaveBeenCalledWith({
        success: false,
        error: 'X-UserId header is required'
      } as IApiResponse);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when X-UserId header is undefined', () => {
      // Arrange
      mockRequest.headers = { 'x-userid': undefined };
      mockRequest.params = { userId: 'user123' };

      // Act
      validateUserId(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(responseStatus).toHaveBeenCalledWith(401);
      expect(responseJson).toHaveBeenCalledWith({
        success: false,
        error: 'X-UserId header is required'
      } as IApiResponse);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Missing userId parameter', () => {
    it('should return 400 when userId parameter is missing', () => {
      // Arrange
      mockRequest.headers = { 'x-userid': 'user123' };
      mockRequest.params = {};

      // Act
      validateUserId(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(responseStatus).toHaveBeenCalledWith(400);
      expect(responseJson).toHaveBeenCalledWith({
        success: false,
        error: 'userId parameter is required in the path'
      } as IApiResponse);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 400 when userId parameter is empty string', () => {
      // Arrange
      mockRequest.headers = { 'x-userid': 'user123' };
      mockRequest.params = { userId: '' };

      // Act
      validateUserId(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(responseStatus).toHaveBeenCalledWith(400);
      expect(responseJson).toHaveBeenCalledWith({
        success: false,
        error: 'userId parameter is required in the path'
      } as IApiResponse);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 400 when userId parameter is undefined', () => {
      // Arrange
      mockRequest.headers = { 'x-userid': 'user123' };
      //mockRequest.params = { userId: undefined };

      // Act
      validateUserId(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(responseStatus).toHaveBeenCalledWith(400);
      expect(responseJson).toHaveBeenCalledWith({
        success: false,
        error: 'userId parameter is required in the path'
      } as IApiResponse);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Header and parameter mismatch', () => {
    it('should return 403 when X-UserId header does not match userId parameter', () => {
      // Arrange
      mockRequest.headers = { 'x-userid': 'user123' };
      mockRequest.params = { userId: 'user456' };

      // Act
      validateUserId(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(responseStatus).toHaveBeenCalledWith(403);
      expect(responseJson).toHaveBeenCalledWith({
        success: false,
        error: 'Forbidden: X-UserId header does not match requested user'
      } as IApiResponse);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 403 for case-sensitive mismatch', () => {
      // Arrange
      mockRequest.headers = { 'x-userid': 'user123' };
      mockRequest.params = { userId: 'User123' };

      // Act
      validateUserId(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(responseStatus).toHaveBeenCalledWith(403);
      expect(responseJson).toHaveBeenCalledWith({
        success: false,
        error: 'Forbidden: X-UserId header does not match requested user'
      } as IApiResponse);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 403 for whitespace differences', () => {
      // Arrange
      mockRequest.headers = { 'x-userid': 'user123' };
      mockRequest.params = { userId: ' user123 ' };

      // Act
      validateUserId(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(responseStatus).toHaveBeenCalledWith(403);
      expect(responseJson).toHaveBeenCalledWith({
        success: false,
        error: 'Forbidden: X-UserId header does not match requested user'
      } as IApiResponse);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Edge cases', () => {
    it('should handle numeric userIds', () => {
      // Arrange
      const userId = '12345';
      mockRequest.headers = { 'x-userid': userId };
      mockRequest.params = { userId };

      // Act
      validateUserId(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(responseStatus).not.toHaveBeenCalled();
      expect(responseJson).not.toHaveBeenCalled();
    });

    it('should handle UUID format userIds', () => {
      // Arrange
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      mockRequest.headers = { 'x-userid': userId };
      mockRequest.params = { userId };

      // Act
      validateUserId(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(responseStatus).not.toHaveBeenCalled();
      expect(responseJson).not.toHaveBeenCalled();
    });

    it('should handle very long userIds', () => {
      // Arrange
      const userId = 'a'.repeat(1000);
      mockRequest.headers = { 'x-userid': userId };
      mockRequest.params = { userId };

      // Act
      validateUserId(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(responseStatus).not.toHaveBeenCalled();
      expect(responseJson).not.toHaveBeenCalled();
    });

    it('should handle userIds with special URL characters', () => {
      // Arrange
      const userId = 'user%20with%20spaces';
      mockRequest.headers = { 'x-userid': userId };
      mockRequest.params = { userId };

      // Act
      validateUserId(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(responseStatus).not.toHaveBeenCalled();
      expect(responseJson).not.toHaveBeenCalled();
    });
  });

  describe('Multiple validation failures', () => {
    it('should prioritize missing header over missing parameter', () => {
      // Arrange
      mockRequest.headers = {};
      mockRequest.params = {};

      // Act
      validateUserId(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(responseStatus).toHaveBeenCalledWith(401);
      expect(responseJson).toHaveBeenCalledWith({
        success: false,
        error: 'X-UserId header is required'
      } as IApiResponse);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should prioritize missing header over mismatch', () => {
      // Arrange
      mockRequest.headers = {};
      mockRequest.params = { userId: 'user123' };

      // Act
      validateUserId(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(responseStatus).toHaveBeenCalledWith(401);
      expect(responseJson).toHaveBeenCalledWith({
        success: false,
        error: 'X-UserId header is required'
      } as IApiResponse);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should prioritize missing parameter over mismatch', () => {
      // Arrange
      mockRequest.headers = { 'x-userid': 'user123' };
      mockRequest.params = {};

      // Act
      validateUserId(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(responseStatus).toHaveBeenCalledWith(400);
      expect(responseJson).toHaveBeenCalledWith({
        success: false,
        error: 'userId parameter is required in the path'
      } as IApiResponse);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});
