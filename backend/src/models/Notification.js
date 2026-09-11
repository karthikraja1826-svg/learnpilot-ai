import mongoose from 'mongoose';

export const NOTIFICATION_TYPE_VALUES = [
  'study_session_start',
  'study_session_reminder',
  'study_session_missed',
  'assignment_deadline',
  'exam_reminder',
  'streak',
  'study_plan',
  'adaptive_plan',
  'system',
];

export const NOTIFICATION_STATUS_VALUES = ['pending', 'sent', 'failed', 'expired'];

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: NOTIFICATION_TYPE_VALUES,
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    body: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    url: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '/',
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    status: {
      type: String,
      enum: NOTIFICATION_STATUS_VALUES,
      default: 'pending',
      index: true,
    },
    dedupeKey: {
      type: String,
      required: true,
      unique: true,
      maxlength: 300,
    },
    deliveryInfo: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    sentAt: {
      type: Date,
      default: null,
    },
    readAt: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ user: 1, status: 1 });
notificationSchema.index({ user: 1, type: 1 });
notificationSchema.index({ user: 1, readAt: 1 });

export const Notification = mongoose.model('Notification', notificationSchema);
