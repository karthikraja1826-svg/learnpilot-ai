import mongoose from 'mongoose';

export const AVAILABILITY_DAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

export const STUDY_PERIOD_VALUES = ['early_morning', 'morning', 'afternoon', 'evening', 'night', 'late_night'];

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

const dayScheduleSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: false },
    startTime: {
      type: String,
      match: [TIME_REGEX, 'startTime must be in HH:mm format'],
      default: '09:00',
    },
    endTime: {
      type: String,
      match: [TIME_REGEX, 'endTime must be in HH:mm format'],
      default: '17:00',
    },
  },
  { _id: false }
);

const weeklyScheduleSchema = new mongoose.Schema(
  AVAILABILITY_DAYS.reduce((fields, day) => {
    fields[day] = { type: dayScheduleSchema, default: () => ({}) };
    return fields;
  }, {}),
  { _id: false }
);

const studyAvailabilitySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    weeklySchedule: {
      type: weeklyScheduleSchema,
      default: () => ({}),
    },
    timezone: {
      type: String,
      trim: true,
      maxlength: [100, 'Timezone must be at most 100 characters'],
      default: 'UTC',
    },
    dailyStudyLimit: {
      type: Number,
      min: [15, 'Daily study limit must be at least 15 minutes'],
      max: [1440, 'Daily study limit cannot exceed 1440 minutes'],
      default: 240,
    },
    preferredSessionDuration: {
      type: Number,
      min: [5, 'Preferred session duration must be at least 5 minutes'],
      max: [480, 'Preferred session duration cannot exceed 480 minutes'],
      default: 45,
    },
    preferredBreakDuration: {
      type: Number,
      min: [1, 'Preferred break duration must be at least 1 minute'],
      max: [120, 'Preferred break duration cannot exceed 120 minutes'],
      default: 10,
    },
    preferredStudyPeriods: {
      type: [{ type: String, enum: STUDY_PERIOD_VALUES }],
      default: [],
    },
  },
  { timestamps: true }
);

export const StudyAvailability = mongoose.model('StudyAvailability', studyAvailabilitySchema);
