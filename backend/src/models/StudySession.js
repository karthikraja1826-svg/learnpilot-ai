import mongoose from 'mongoose';

export const SESSION_TYPE_VALUES = ['pomodoro', 'focus', 'revision', 'assignment', 'practice', 'review'];
export const SESSION_STATUS_VALUES = ['planned', 'active', 'paused', 'completed', 'cancelled', 'abandoned'];

const studySessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    studyPlan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StudyPlan',
      default: null,
      index: true,
    },
    studyPlanEntry: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      default: null,
      index: true,
    },
    topic: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Topic',
      default: null,
      index: true,
    },
    assignment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Assignment',
      default: null,
    },
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      default: null,
    },
    sessionType: {
      type: String,
      enum: SESSION_TYPE_VALUES,
      required: true,
    },
    status: {
      type: String,
      enum: SESSION_STATUS_VALUES,
      default: 'planned',
      index: true,
    },
    plannedDurationMinutes: {
      type: Number,
      min: [1, 'plannedDurationMinutes must be positive'],
      required: true,
    },
    actualDurationMinutes: {
      type: Number,
      min: 0,
      default: 0,
    },
    completedDurationMinutes: {
      type: Number,
      min: 0,
      default: 0,
    },
    startTime: {
      type: Date,
      default: null,
      index: true,
    },
    endTime: {
      type: Date,
      default: null,
    },
    lastResumedAt: {
      type: Date,
      default: null,
    },
    pausedAt: {
      type: Date,
      default: null,
    },
    pauseDurationMinutes: {
      type: Number,
      min: 0,
      default: 0,
    },
    focusDurationMinutes: {
      type: Number,
      min: [1, 'focusDurationMinutes must be positive'],
      max: [180, 'focusDurationMinutes must be at most 180 minutes'],
      default: 25,
    },
    shortBreakDurationMinutes: {
      type: Number,
      min: [1, 'shortBreakDurationMinutes must be positive'],
      max: [60, 'shortBreakDurationMinutes must be at most 60 minutes'],
      default: 5,
    },
    longBreakDurationMinutes: {
      type: Number,
      min: [1, 'longBreakDurationMinutes must be positive'],
      max: [120, 'longBreakDurationMinutes must be at most 120 minutes'],
      default: 15,
    },
    cyclesPlanned: {
      type: Number,
      min: [1, 'cyclesPlanned must be at least 1'],
      max: [20, 'cyclesPlanned must be at most 20'],
      default: 1,
    },
    cyclesCompleted: {
      type: Number,
      min: 0,
      default: 0,
    },
    focusRating: {
      type: Number,
      min: [1, 'focusRating must be between 1 and 5'],
      max: [5, 'focusRating must be between 1 and 5'],
      default: null,
    },
    interruptionCount: {
      type: Number,
      min: 0,
      default: 0,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
    },
    completionPercentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
  },
  { timestamps: true }
);

studySessionSchema.index({ user: 1, status: 1 });
studySessionSchema.index({ user: 1, startTime: -1 });
studySessionSchema.index({ user: 1, subject: 1 });
studySessionSchema.index({ user: 1, topic: 1 });
studySessionSchema.index({ user: 1, studyPlan: 1 });
studySessionSchema.index({ user: 1, createdAt: -1 });

export const StudySession = mongoose.model('StudySession', studySessionSchema);
