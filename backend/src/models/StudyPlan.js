import mongoose from 'mongoose';

export const PLAN_TYPE_VALUES = ['daily', 'weekly'];
export const PLAN_STATUS_VALUES = ['active', 'completed', 'archived'];
export const PLAN_SOURCE_VALUES = ['ai', 'algorithm'];
export const ACTIVITY_TYPE_VALUES = ['study', 'revision', 'assignment', 'practice', 'review'];
export const ENTRY_STATUS_VALUES = ['scheduled', 'in_progress', 'completed', 'skipped', 'missed'];

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

const studyPlanEntrySchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
    },
    startTime: {
      type: String,
      match: [TIME_REGEX, 'startTime must be in HH:mm format'],
      required: true,
    },
    endTime: {
      type: String,
      match: [TIME_REGEX, 'endTime must be in HH:mm format'],
      required: true,
    },
    durationMinutes: {
      type: Number,
      min: [1, 'durationMinutes must be positive'],
      required: true,
    },
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      default: null,
    },
    topic: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Topic',
      default: null,
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
    subjectName: {
      type: String,
      trim: true,
      maxlength: 100,
      default: '',
    },
    topicName: {
      type: String,
      trim: true,
      maxlength: 150,
      default: '',
    },
    activityType: {
      type: String,
      enum: ACTIVITY_TYPE_VALUES,
      required: true,
    },
    priority: {
      type: Number,
      min: 0,
      max: 100,
      required: true,
    },
    status: {
      type: String,
      enum: ENTRY_STATUS_VALUES,
      default: 'scheduled',
    },
    reason: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
  },
  { _id: true }
);

const studyPlanSummarySchema = new mongoose.Schema(
  {
    totalSessions: { type: Number, default: 0 },
    subjectsCovered: { type: Number, default: 0 },
    topicsCovered: { type: Number, default: 0 },
    highPriorityCount: { type: Number, default: 0 },
    unscheduledCount: { type: Number, default: 0 },
    constrained: { type: Boolean, default: false },
    notes: { type: String, trim: true, maxlength: 1000, default: '' },
  },
  { _id: false }
);

const generationMetadataSchema = new mongoose.Schema(
  {
    aiUsed: { type: Boolean, default: false },
    aiModel: { type: String, trim: true, default: null },
    aiFallbackReason: { type: String, trim: true, default: null },
    generationDurationMs: { type: Number, default: null },
    priorityWeights: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { _id: false }
);

const studyPlanSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    planType: {
      type: String,
      enum: PLAN_TYPE_VALUES,
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    generatedAt: {
      type: Date,
      default: Date.now,
    },
    version: {
      type: Number,
      min: 1,
      default: 1,
    },
    previousPlan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StudyPlan',
      default: null,
    },
    status: {
      type: String,
      enum: PLAN_STATUS_VALUES,
      default: 'active',
    },
    // Set only for a "daily roadmap" plan generated from Part 2 (AI Daily
    // Roadmap) — i.e. a plan scoped to a single subject the user has chosen
    // to optimize (see User.activeOptimizationSubject / Subject model).
    // Left null for the pre-existing general multi-subject daily/weekly
    // plans so that behavior is unchanged.
    optimizationSubject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      default: null,
    },
    source: {
      type: String,
      enum: PLAN_SOURCE_VALUES,
      required: true,
    },
    totalPlannedMinutes: {
      type: Number,
      min: 0,
      default: 0,
    },
    entries: {
      type: [studyPlanEntrySchema],
      default: [],
    },
    summary: {
      type: studyPlanSummarySchema,
      default: () => ({}),
    },
    generationMetadata: {
      type: generationMetadataSchema,
      default: () => ({}),
    },
  },
  { timestamps: true }
);

studyPlanSchema.index({ user: 1, planType: 1, startDate: -1 });
studyPlanSchema.index({ user: 1, status: 1 });
studyPlanSchema.index({ user: 1, planType: 1, status: 1, startDate: -1 });
studyPlanSchema.index({ user: 1, planType: 1, optimizationSubject: 1, startDate: -1 });

export const StudyPlan = mongoose.model('StudyPlan', studyPlanSchema);
