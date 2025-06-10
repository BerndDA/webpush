// src/models/subscription.model.ts
import mongoose, { Document, Schema, Model } from 'mongoose';
import { ISubscription } from '../types';

// Define the instance methods interface
export interface ISubscriptionMethods {
  updateLastActive(): Promise<ISubscriptionDocument>;
}

// Combine the document interface with methods
export interface ISubscriptionDocument extends ISubscription, Document, ISubscriptionMethods {}

// Define the model interface (for static methods if you have any)
export interface ISubscriptionModel extends Model<ISubscriptionDocument> {}

const subscriptionSchema = new Schema<ISubscriptionDocument>({
  userId: {
    type: String,
    required: true,
    index: true // Not unique anymore - allows multiple subscriptions per user
  },
  endpoint: {
    type: String,
    required: true,
    unique: true, // Endpoint is the unique identifier
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
subscriptionSchema.index({ userId: 1, active: 1 });
subscriptionSchema.index({ userId: 1, endpoint: 1 });

// Update lastActiveAt on each successful notification
subscriptionSchema.methods.updateLastActive = function() {
  this.lastActiveAt = new Date();
  return this.save();
};

export const Subscription = mongoose.model<ISubscriptionDocument, ISubscriptionModel>('Subscription', subscriptionSchema);