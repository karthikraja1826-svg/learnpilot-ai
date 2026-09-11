import mongoose from 'mongoose';

const studyPerformanceSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    plannedMinutes: {
      type: Number,
      min: 0,
      default: 0,
    },
    completedMinutes: {
      type: Number,
      min: 0,
      default: 0,
    },
    sessionsCompleted: {
      type: Number,
      min: 0,
      default: 0,
    },
    sessionsAbandoned: {
      type: Number,
      min: 0,
      default: 0,
    },
    sessionsCancelled: {
      type: Number,
      min: 0,
      default: 0,
    },
    pomodorosCompleted: {
      type: Number,
      min: 0,
      default: 0,
    },
    interruptions: {
      type: Number,
      min: 0,
      default: 0,
    },
    focusRatingSum: {
      type: Number,
      min: 0,
      default: 0,
    },
    focusRatingCount: {
      type: Number,
      min: 0,
      default: 0,
    },
  },
  { timestamps: true }
);

studyPerformanceSchema.index({ user: 1, date: 1 }, { unique: true });

export const StudyPerformance = mongoose.model('StudyPerformance', studyPerformanceSchema);
