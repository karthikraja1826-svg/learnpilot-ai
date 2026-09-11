import mongoose from 'mongoose';

export const UNDERSTANDING_LEVEL_VALUES = ['weak', 'developing', 'proficient', 'strong'];
export const EVALUATION_SOURCE_VALUES = ['ai', 'algorithm'];

const topicInsightSchema = new mongoose.Schema(
  {
    topic: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Topic',
      default: null,
    },
    topicName: {
      type: String,
      trim: true,
      maxlength: 150,
      default: '',
    },
    // Read-only reference back to the official Part 4 test percentage for
    // this topic — never derived from or overwritten by the AI response.
    performance: {
      type: Number,
      min: 0,
      max: 100,
      default: null,
    },
    understandingLevel: {
      type: String,
      enum: UNDERSTANDING_LEVEL_VALUES,
      required: true,
    },
    strengths: {
      type: [String],
      default: [],
    },
    weaknesses: {
      type: [String],
      default: [],
    },
    recommendation: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
  },
  { _id: false }
);

const studyConsistencySchema = new mongoose.Schema(
  {
    // Deterministic score computed server-side from real planned/actual
    // minutes and roadmap entry completion — never taken from the AI
    // response. See evaluation.service.js's computeConsistencyScore.
    consistencyScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    assessment: {
      type: String,
      trim: true,
      maxlength: 800,
      default: '',
    },
  },
  { _id: false }
);

const generationMetadataSchema = new mongoose.Schema(
  {
    aiUsed: { type: Boolean, default: false },
    aiModel: { type: String, trim: true, default: null },
    aiFallbackReason: { type: String, trim: true, default: null },
  },
  { _id: false }
);

const evaluationSchema = new mongoose.Schema(
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
    // Normalized local-day marker, same convention as EndOfDayTest.studyDate.
    studyDate: {
      type: Date,
      required: true,
      index: true,
    },
    // One evaluation document per submitted test — see the unique index
    // below. Regeneration updates this same document (bumping `version`)
    // rather than creating a second one.
    endOfDayTest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EndOfDayTest',
      required: true,
      unique: true,
      index: true,
    },
    version: {
      type: Number,
      min: 1,
      default: 1,
    },
    source: {
      type: String,
      enum: EVALUATION_SOURCE_VALUES,
      required: true,
    },
    overallAssessment: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
    },
    strengths: {
      type: [String],
      default: [],
    },
    weaknesses: {
      type: [String],
      default: [],
    },
    topicInsights: {
      type: [topicInsightSchema],
      default: [],
    },
    studyConsistency: {
      type: studyConsistencySchema,
      default: () => ({}),
    },
    plannedVsActualInsight: {
      type: String,
      trim: true,
      maxlength: 800,
      default: '',
    },
    recommendedFocusAreas: {
      type: [String],
      default: [],
    },
    learningSummary: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
    },
    generationMetadata: {
      type: generationMetadataSchema,
      default: () => ({}),
    },
  },
  { timestamps: true }
);

evaluationSchema.index({ user: 1, subject: 1, studyDate: 1 });

export const Evaluation = mongoose.model('Evaluation', evaluationSchema);
