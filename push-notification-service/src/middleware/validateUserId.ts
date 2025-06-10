// src/middleware/validateUserId.ts
import { Request, Response, NextFunction } from 'express';
import { IApiResponse } from '../types';


export const validateUserId = (req: Request, res: Response, next: NextFunction): void => {
  const headerUserId = req.headers['x-userid'] as string;
  const pathUserId = req.params.userId;

  // Check if header is present
  if (!headerUserId) {
    res.status(401).json({
      success: false,
      error: 'X-UserId header is required'
    } as IApiResponse);
    return;
  }

  // Check if userId is in the path
  if (!pathUserId) {
    res.status(400).json({
      success: false,
      error: 'userId parameter is required in the path'
    } as IApiResponse);
    return;
  }

  // Validate that header matches path parameter
  if (headerUserId !== pathUserId) {
    res.status(403).json({
      success: false,
      error: 'Forbidden: X-UserId header does not match requested user'
    } as IApiResponse);
    return;
  }

  // Validation passed
  next();
};