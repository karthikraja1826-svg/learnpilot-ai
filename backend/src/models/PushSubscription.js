import mongoose from 'mongoose';

const pushKeysSchema = new mongoose.Schema(
  {
    p256dh: {
      type: String,
      required: true,
    },
    auth: {
      type: String,
      required: true,
    },
  },
  { _id: false }
);

const pushSubscriptionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    endpoint: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: 2048,
    },
    expirationTime: {
      type: Date,
      default: null,
    },
    keys: {
      type: pushKeysSchema,
      required: true,
    },
    userAgent: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
    deviceLabel: {
      type: String,
      trim: true,
      maxlength: 150,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastUsedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

pushSubscriptionSchema.index({ user: 1, isActive: 1 });

export const PushSubscription = mongoose.model('PushSubscription', pushSubscriptionSchema);
