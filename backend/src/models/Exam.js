import mongoose from 'mongoose';

export const EXAM_PRIORITY_VALUES = ['low', 'medium', 'high'];

const examSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Exam title is required'],
      trim: true,
      maxlength: [150, 'Exam title must be at most 150 characters'],
    },
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      default: null,
      index: true,
    },
    examDate: {
      type: Date,
      required: [true, 'Exam date is required'],
      index: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description must be at most 1000 characters'],
      default: '',
    },
    priority: {
      type: String,
      enum: EXAM_PRIORITY_VALUES,
      default: 'medium',
    },
  },
  { timestamps: true }
);

examSchema.index({ user: 1, examDate: 1 });

export const Exam = mongoose.model('Exam', examSchema);
