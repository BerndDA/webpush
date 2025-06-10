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

      // Extract endpoint for unique identification
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

      const totalActive = await Subscription.countDocuments({
        userId,
      });
      logger.info(
        `User ${userId} subscribed device. Total active devices: ${totalActive}`
      );

      return sub;
    } catch (error) {
      logger.error("Subscribe error:", error);
      throw new Error("Failed to subscribe device");
    }
  }

  async unsubscribe(
    userId: string,
    endpoint: string
  ): Promise<ISubscriptionDocument | null> {
    try {
      // Find and delete the subscription that matches both userId and endpoint
      const result = await Subscription.findOneAndDelete({ userId, endpoint });

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
      // Delete all subscriptions for the user
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
          // Update last active timestamp
          await sub.updateLastActive();
          return { success: true, endpoint: sub.endpoint };
        } catch (error: any) {
          logger.error(`Failed to send to device ${sub.endpoint}:`, error);

          // Handle invalid subscriptions (410 Gone)
          if (error.statusCode === 410) {
            await Subscription.deleteOne({ endpoint: sub.endpoint });
            logger.info(`Deleted invalid subscription: ${sub.endpoint}`);
          } else if (error.statusCode === 404) {
            // 404 Not Found - Also permanent, can delete
            await Subscription.deleteOne({ endpoint: sub.endpoint });
            logger.info(`Deleted non-existent subscription: ${sub.endpoint}`);
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

    // Group subscriptions by userId for detailed reporting
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