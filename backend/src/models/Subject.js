import mongoose from 'mongoose';

const HEX_COLOR_REGEX = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

const subjectSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Subject name is required'],
      trim: true,
      maxlength: [100, 'Subject name must be at most 100 characters'],
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
    importance: {
      type: Number,
      min: [1, 'Importance must be between 1 and 5'],
      max: [5, 'Importance must be between 1 and 5'],
      default: 3,
    },
    targetPerformance: {
      type: Number,
      min: [0, 'Target performance must be between 0 and 100'],
      max: [100, 'Target performance must be between 0 and 100'],
      default: 100,
    },
    currentPerformance: {
      type: Number,
      min: [0, 'Current performance must be between 0 and 100'],
      max: [100, 'Current performance must be between 0 and 100'],
      default: 0,
    },
    color: {
      type: String,
      trim: true,
      maxlength: [20, 'Color must be at most 20 characters'],
      match: [HEX_COLOR_REGEX, 'Color must be a valid hex color'],
    },
  },
  { timestamps: true }
);

subjectSchema.index({ user: 1, name: 1 }, { unique: true });

export const Subject = mongoose.model('Subject', subjectSchema);
