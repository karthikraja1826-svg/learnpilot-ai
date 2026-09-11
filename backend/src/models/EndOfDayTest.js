import mongoose from 'mongoose';

export const TEST_STATUS_VALUES = ['not_started', 'started', 'submitted'];
export const QUESTION_TYPE_VALUES = ['multiple_choice', 'short_answer'];
export const TEST_SOURCE_VALUES = ['ai', 'algorithm'];

const questionSchema = new mongoose.Schema(
  {
    questionText: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    questionType: {
      type: String,
      enum: QUESTION_TYPE_VALUES,
      required: true,
    },
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
    options: {
      type: [String],
      default: [],
    },
    // Never sent to the client until the test has been submitted — see
    // eodTest.service.js's sanitizeQuestion, which strips this field from
    // every response prior to submission.
    correctAnswer: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
    },
    explanation: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
  },
  { _id: true }
);

const answerSchema = new mongoose.Schema(
  {
    question: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    answerText: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
    isCorrect: {
      type: Boolean,
      default: null,
    },
  },
  { _id: false }
);

const topicPerformanceSchema = new mongoose.Schema(
  {
    topic: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Topic',
      default: null,
    },
    topicName: {
      type: String,
      trim: true,
      default: '',
    },
    correct: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
  },
  { _id: false }
);

const resultSchema = new mongoose.Schema(
  {
    totalQuestions: { type: Number, default: 0 },
    attemptedQuestions: { type: Number, default: 0 },
    correctAnswers: { type: Number, default: 0 },
    incorrectAnswers: { type: Number, default: 0 },
    score: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
    topicPerformance: {
      type: [topicPerformanceSchema],
      default: [],
    },
    completionStatus: {
      type: String,
      enum: ['completed', 'partial'],
      default: null,
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

const endOfDayTestSchema = new mongoose.Schema(
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
    studyPlan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StudyPlan',
      default: null,
    },
    // Normalized local-day marker, same convention as StudyPlan.startDate.
    studyDate: {
      type: Date,
      required: true,
      index: true,
    },
    topicsCovered: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'Topic',
      default: [],
    },
    status: {
      type: String,
      enum: TEST_STATUS_VALUES,
      default: 'not_started',
      index: true,
    },
    questions: {
      type: [questionSchema],
      default: [],
    },
    answers: {
      type: [answerSchema],
      default: [],
    },
    source: {
      type: String,
      enum: TEST_SOURCE_VALUES,
      required: true,
    },
    generationMetadata: {
      type: generationMetadataSchema,
      default: () => ({}),
    },
    startedAt: {
      type: Date,
      default: null,
    },
    submittedAt: {
      type: Date,
      default: null,
    },
    result: {
      type: resultSchema,
      default: null,
    },
  },
  { timestamps: true }
);

endOfDayTestSchema.index({ user: 1, subject: 1, studyDate: 1 }, { unique: true });

export const EndOfDayTest = mongoose.model('EndOfDayTest', endOfDayTestSchema);
