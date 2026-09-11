import mongoose from 'mongoose';

const preferredStudyTimeSchema = new mongoose.Schema(
  {
    day: {
      type: String,
      enum: ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'],
      required: true,
    },
    startTime: {
      type: String,
      match: /^([01]\d|2[0-3]):[0-5]\d$/,
      required: true,
    },
    endTime: {
      type: String,
      match: /^([01]\d|2[0-3]):[0-5]\d$/,
      required: true,
    },
  },
  { _id: false }
);

const DAILY_STUDY_TARGETS = ['1 hour', '2 hours', '3 hours', '4 hours', '5+ hours'];
const STUDY_PERIODS = ['Morning', 'Afternoon', 'Evening', 'Night'];
const SESSION_DURATIONS = ['25 minutes', '30 minutes', '45 minutes', '60 minutes', '90 minutes'];
const BREAK_DURATIONS = ['5 minutes', '10 minutes', '15 minutes', '20 minutes'];

const notificationPreferencesSchema = new mongoose.Schema(
  {
    pushEnabled: { type: Boolean, default: true },
    studyReminders: { type: Boolean, default: true },
    assignmentReminders: { type: Boolean, default: true },
    examReminders: { type: Boolean, default: true },
    streakNotifications: { type: Boolean, default: true },
    studyReminderMinutesBefore: {
      type: Number,
      min: 1,
      max: 180,
      default: 10,
    },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    firebaseUid: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
    },
    profileImage: {
      type: String,
      trim: true,
      maxlength: 2048,
    },
    profileImageUpdatedAt: {
      type: Date,
    },
    profileImageRemovedByUser: {
      type: Boolean,
      default: false,
    },
    authProvider: {
      type: String,
      enum: ['password', 'google.com'],
      required: true,
    },
    educationLevel: {
      type: String,
      enum: ['high_school', 'undergraduate', 'graduate', 'postgraduate', 'other'],
    },
    course: {
      type: String,
      trim: true,
      maxlength: 150,
    },
    studyGoal: {
      type: String,
      trim: true,
      maxlength: 300,
    },
    timezone: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    preferredStudyTimes: {
      type: [preferredStudyTimeSchema],
      default: [],
    },
    availableHours: {
      type: Number,
      min: 0,
      max: 24,
    },
    onboardingCompleted: {
      type: Boolean,
      default: false,
    },
    notificationPreferences: {
      type: notificationPreferencesSchema,
      default: () => ({}),
    },
    phone: {
      type: String,
      trim: true,
      maxlength: 30,
    },
    dateOfBirth: {
      type: Date,
    },
    bio: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    institution: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    degreeCourse: {
      type: String,
      trim: true,
      maxlength: 150,
    },
    department: {
      type: String,
      trim: true,
      maxlength: 150,
    },
    yearSemester: {
      type: String,
      trim: true,
      maxlength: 50,
    },
    studentId: {
      type: String,
      trim: true,
      maxlength: 50,
    },
    subjects: {
      type: [String],
      default: [],
      validate: {
        validator: (value) => Array.isArray(value) && value.length <= 20 && value.every((item) => item.length <= 60),
        message: 'subjects can include at most 20 entries of up to 60 characters each',
      },
    },
    // The Subject document (see models/Subject.js) the user has currently
    // chosen to optimize. Persisted here on the user record (rather than in
    // transient frontend state) so the selection survives refreshes,
    // navigation, and logout/login, and so future AI roadmap/evaluation
    // features can read it directly from the user's profile.
    activeOptimizationSubject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      default: null,
    },
    academicGoals: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    shortTermGoals: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    longTermGoals: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    improvementAreas: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    learningInterests: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    dailyStudyTarget: {
      type: String,
      enum: DAILY_STUDY_TARGETS,
    },
    preferredStudyPeriods: {
      type: [String],
      enum: STUDY_PERIODS,
    },
    preferredSessionDuration: {
      type: String,
      enum: SESSION_DURATIONS,
    },
    breakDuration: {
      type: String,
      enum: BREAK_DURATIONS,
    },
    additionalInformation: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
  },
  { timestamps: true }
);

userSchema.index({ email: 1 });

export const User = mongoose.model('User', userSchema);
