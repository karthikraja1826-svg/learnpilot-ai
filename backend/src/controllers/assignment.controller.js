import { catchAsync } from '../utils/catchAsync.js';
import { sendSuccess } from '../utils/apiResponse.js';
import * as assignmentService from '../services/assignment.service.js';

export const createAssignment = catchAsync(async (req, res) => {
  const assignment = await assignmentService.createAssignment(req.userId, req.body || {});
  sendSuccess(res, 201, 'Assignment created', { assignment });
});

export const listAssignments = catchAsync(async (req, res) => {
  const { assignments, pagination } = await assignmentService.listAssignments(req.userId, req.query || {});
  sendSuccess(res, 200, 'Assignments retrieved', { assignments, pagination });
});

export const getAssignment = catchAsync(async (req, res) => {
  const assignment = await assignmentService.getAssignmentById(req.params.id, req.userId);
  sendSuccess(res, 200, 'Assignment retrieved', { assignment });
});

export const updateAssignment = catchAsync(async (req, res) => {
  const assignment = await assignmentService.updateAssignment(req.params.id, req.userId, req.body || {});
  sendSuccess(res, 200, 'Assignment updated', { assignment });
});

export const deleteAssignment = catchAsync(async (req, res) => {
  await assignmentService.deleteAssignment(req.params.id, req.userId);
  sendSuccess(res, 200, 'Assignment deleted', {});
});
