// src/routes/notification.routes.ts
import { Router } from "express";
import { NotificationController } from "../controllers/notification.controller";
import { NotificationService } from "../services/notification.service";
import { initializeWebPush } from "../config/webpush";
import { validateUserId } from "../middleware/validateUserId";

export const createNotificationRouter = (): Router => {
  const router = Router();
  const webpush = initializeWebPush();
  const notificationService = new NotificationService(webpush);
  const controller = new NotificationController(notificationService);
  router.param("userId", (req, res, next, userId) => {
    validateUserId(req, res, next);
  });
  // RESTful routes with consistent userId in path

  // Subscribe a device for a user
  router.post("/users/:userId/subscriptions", controller.subscribe);

  // Get user's subscriptions
  router.get("/users/:userId/subscriptions", controller.getUserSubscriptions);

  // Unsubscribe specific device for a user
  router.delete(
    "/users/:userId/subscriptions/:endpoint",
    controller.unsubscribeDevice
  );

  // Unsubscribe all devices for a user
  router.delete(
    "/users/:userId/subscriptions",
    controller.unsubscribeAllDevices
  );

  return router;
};

export const createInternalNotificationRouter = (): Router => {
  const router = Router();
  const webpush = initializeWebPush();
  const notificationService = new NotificationService(webpush);
  const controller = new NotificationController(notificationService);

  // Send notification to specific user (all their devices)
  router.post("/users/:userId/notifications", controller.sendToUser);

  // Broadcast to all users
  router.post("/notifications/broadcast", controller.broadcastToAll);

  return router;
};
