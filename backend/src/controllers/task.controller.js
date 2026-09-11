import { catchAsync } from '../utils/catchAsync.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import * as taskService from '../services/task.service.js';

export const createTask = catchAsync(async (req, res) => {
  const task = await taskService.createTask(req.userId, req.body || {});
  sendSuccess(res, 201, 'Task created', { task });
});

export const listTasks = catchAsync(async (req, res) => {
  const { tasks, pagination } = await taskService.listTasks(req.userId, req.query || {});
  sendSuccess(res, 200, 'Tasks retrieved', { tasks, pagination });
});

export const getTask = catchAsync(async (req, res) => {
  const task = await taskService.getTaskById(req.params.id, req.userId);
  sendSuccess(res, 200, 'Task retrieved', { task });
});

export const updateTask = catchAsync(async (req, res) => {
  const task = await taskService.updateTask(req.params.id, req.userId, req.body || {});
  sendSuccess(res, 200, 'Task updated', { task });
});

export const updateTaskStatus = catchAsync(async (req, res) => {
  const { status } = req.body || {};
  if (!status) {
    throw new ApiError(400, 'status is required');
  }
  const task = await taskService.updateTaskStatus(req.params.id, req.userId, status);
  sendSuccess(res, 200, 'Task status updated', { task });
});

export const deleteTask = catchAsync(async (req, res) => {
  await taskService.deleteTask(req.params.id, req.userId);
  sendSuccess(res, 200, 'Task deleted', {});
});
