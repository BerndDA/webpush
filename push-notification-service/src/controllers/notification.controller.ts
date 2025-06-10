// src/controllers/notification.controller.ts
import { Request, Response, NextFunction } from 'express';
import { NotificationService } from '../services/notification.service';
import { INotificationPayload, IApiResponse } from '../types';

export class NotificationController {
  constructor(private notificationService: NotificationService) {}

  subscribe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;
      const { subscription, deviceInfo } = req.body;
      
      if (!subscription) {
        res.status(400).json({
          success: false,
          error: 'subscription is required'
        } as IApiResponse);
        return;
      }
      
      const result = await this.notificationService.subscribe({
        userId,
        subscription,
        deviceInfo
      });
      
      res.status(201).json({
        success: true,
        data: { 
          userId: result.userId, 
          endpoint: result.endpoint,
          subscribedAt: result.subscribedAt
        }
      } as IApiResponse);
    } catch (error) {
      next(error);
    }
  };

  unsubscribeDevice = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId, endpoint } = req.params;
      
      const result = await this.notificationService.unsubscribe(userId, endpoint);
      
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
    } catch (error) {
      next(error);
    }
  };

  unsubscribeAllDevices = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;
      
      const count = await this.notificationService.unsubscribeAllDevices(userId);
      
      res.json({
        success: true,
        data: { 
          userId, 
          devicesUnsubscribed: count 
        }
      } as IApiResponse);
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

  sendToUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;
      const { notification } = req.body as { notification: INotificationPayload };
      
      if (!notification) {
        res.status(400).json({
          success: false,
          error: 'notification payload is required'
        } as IApiResponse);
        return;
      }
      
      const result = await this.notificationService.sendToUser(userId, notification);
      
      res.json({
        success: true,
        data: { 
          userId, 
          devicesNotified: result.sent,
          devicesFailed: result.failed 
        }
      } as IApiResponse);
    } catch (error) {
      next(error);
    }
  };

  broadcastToAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { notification } = req.body as { notification: INotificationPayload };
      
      if (!notification) {
        res.status(400).json({
          success: false,
          error: 'notification payload is required'
        } as IApiResponse);
        return;
      }
      
      const result = await this.notificationService.sendToAll(notification);
      
      res.json({
        success: true,
        data: result
      } as IApiResponse);
    } catch (error) {
      next(error);
    }
  };
}