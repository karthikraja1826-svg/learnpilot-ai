import mongoose from 'mongoose';

export const TASK_PRIORITY_VALUES = ['low', 'medium', 'high', 'urgent'];
export const TASK_STATUS_VALUES = ['pending', 'in_progress', 'completed', 'cancelled'];

const taskSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
      maxlength: [150, 'Task title must be at most 150 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description must be at most 1000 characters'],
      default: '',
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
      index: true,
    },
    dueDate: {
      type: Date,
      default: null,
      index: true,
    },
    estimatedMinutes: {
      type: Number,
      min: [1, 'Estimated minutes must be positive'],
      default: null,
    },
    priority: {
      type: String,
      enum: TASK_PRIORITY_VALUES,
      default: 'medium',
    },
    status: {
      type: String,
      enum: TASK_STATUS_VALUES,
      default: 'pending',
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

taskSchema.index({ user: 1, status: 1 });
taskSchema.index({ user: 1, dueDate: 1 });
taskSchema.index({ user: 1, priority: 1 });

export const Task = mongoose.model('Task', taskSchema);
