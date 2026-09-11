import { catchAsync } from '../utils/catchAsync.js';
import { sendSuccess } from '../utils/apiResponse.js';
import * as studySessionService from '../services/studySession.service.js';

export const createSession = catchAsync(async (req, res) => {
  const session = await studySessionService.createSession(req.userId, req.body || {});
  sendSuccess(res, 201, 'Study session created', { session });
});

export const listSessions = catchAsync(async (req, res) => {
  const { sessions, pagination } = await studySessionService.listSessions(req.userId, req.query || {});
  sendSuccess(res, 200, 'Study sessions retrieved', { sessions, pagination });
});

export const getActiveSession = catchAsync(async (req, res) => {
  const session = await studySessionService.getActiveSession(req.userId);
  sendSuccess(res, 200, 'Active study session retrieved', { session });
});

export const getSession = catchAsync(async (req, res) => {
  const session = await studySessionService.getSessionById(req.params.id, req.userId);
  sendSuccess(res, 200, 'Study session retrieved', { session });
});

export const updateSession = catchAsync(async (req, res) => {
  const session = await studySessionService.updateSession(req.params.id, req.userId, req.body || {});
  sendSuccess(res, 200, 'Study session updated', { session });
});

export const startSession = catchAsync(async (req, res) => {
  const session = await studySessionService.startSession(req.params.id, req.userId);
  sendSuccess(res, 200, 'Study session started', { session });
});

export const pauseSession = catchAsync(async (req, res) => {
  const session = await studySessionService.pauseSession(req.params.id, req.userId);
  sendSuccess(res, 200, 'Study session paused', { session });
});

export const resumeSession = catchAsync(async (req, res) => {
  const session = await studySessionService.resumeSession(req.params.id, req.userId);
  sendSuccess(res, 200, 'Study session resumed', { session });
});

export const completeSession = catchAsync(async (req, res) => {
  const session = await studySessionService.completeSession(req.params.id, req.userId, req.body || {});
  sendSuccess(res, 200, 'Study session completed', { session });
});

export const cancelSession = catchAsync(async (req, res) => {
  const session = await studySessionService.cancelSession(req.params.id, req.userId);
  sendSuccess(res, 200, 'Study session cancelled', { session });
});

export const abandonSession = catchAsync(async (req, res) => {
  const session = await studySessionService.abandonSession(req.params.id, req.userId);
  sendSuccess(res, 200, 'Study session abandoned', { session });
});

export const completeCycle = catchAsync(async (req, res) => {
  const session = await studySessionService.completeCycle(req.params.id, req.userId);
  sendSuccess(res, 200, 'Pomodoro cycle completed', { session });
});

export const deleteSession = catchAsync(async (req, res) => {
  await studySessionService.deleteSession(req.params.id, req.userId);
  sendSuccess(res, 200, 'Study session deleted', {});
});
