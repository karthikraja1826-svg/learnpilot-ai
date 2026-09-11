import mongoose from 'mongoose';

export const TOPIC_STATUS_VALUES = ['not_started', 'in_progress', 'completed', 'needs_revision'];

const topicSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Topic name is required'],
      trim: true,
      maxlength: [150, 'Topic name must be at most 150 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description must be at most 1000 characters'],
      default: '',
    },
    difficulty: {
      type: Number,
      min: [1, 'Difficulty must be between 1 and 5'],
      max: [5, 'Difficulty must be between 1 and 5'],
      default: 3,
    },
    estimatedHours: {
      type: Number,
      required: [true, 'Estimated hours is required'],
      min: [0.1, 'Estimated hours must be positive'],
    },
    currentMastery: {
      type: Number,
      min: [0, 'Current mastery must be between 0 and 100'],
      max: [100, 'Current mastery must be between 0 and 100'],
      default: 0,
    },
    targetMastery: {
      type: Number,
      min: [0, 'Target mastery must be between 0 and 100'],
      max: [100, 'Target mastery must be between 0 and 100'],
      default: 100,
    },
    status: {
      type: String,
      enum: TOPIC_STATUS_VALUES,
      default: 'not_started',
    },
    lastStudiedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

topicSchema.index({ user: 1, subject: 1 });
topicSchema.index({ user: 1, status: 1 });

export const Topic = mongoose.model('Topic', topicSchema);
