import mongoose from 'mongoose';

export const ASSIGNMENT_PRIORITY_VALUES = ['low', 'medium', 'high'];
export const ASSIGNMENT_STATUS_VALUES = ['pending', 'in_progress', 'completed', 'overdue'];

const assignmentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Assignment title is required'],
      trim: true,
      maxlength: [150, 'Assignment title must be at most 150 characters'],
    },
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      default: null,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description must be at most 1000 characters'],
      default: '',
    },
    deadline: {
      type: Date,
      required: [true, 'Deadline is required'],
      index: true,
    },
    estimatedHours: {
      type: Number,
      required: [true, 'Estimated hours is required'],
      min: [0.1, 'Estimated hours must be positive'],
    },
    priority: {
      type: String,
      enum: ASSIGNMENT_PRIORITY_VALUES,
      default: 'medium',
    },
    status: {
      type: String,
      enum: ASSIGNMENT_STATUS_VALUES,
      default: 'pending',
    },
  },
  { timestamps: true }
);

assignmentSchema.index({ user: 1, status: 1 });
assignmentSchema.index({ user: 1, deadline: 1 });

export const Assignment = mongoose.model('Assignment', assignmentSchema);
