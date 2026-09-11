import { catchAsync } from '../utils/catchAsync.js';
import { sendSuccess } from '../utils/apiResponse.js';
import * as examService from '../services/exam.service.js';

export const createExam = catchAsync(async (req, res) => {
  const exam = await examService.createExam(req.userId, req.body || {});
  sendSuccess(res, 201, 'Exam created', { exam });
});

export const listExams = catchAsync(async (req, res) => {
  const { exams, pagination } = await examService.listExams(req.userId, req.query || {});
  sendSuccess(res, 200, 'Exams retrieved', { exams, pagination });
});

export const getExam = catchAsync(async (req, res) => {
  const exam = await examService.getExamById(req.params.id, req.userId);
  sendSuccess(res, 200, 'Exam retrieved', { exam });
});

export const updateExam = catchAsync(async (req, res) => {
  const exam = await examService.updateExam(req.params.id, req.userId, req.body || {});
  sendSuccess(res, 200, 'Exam updated', { exam });
});

export const deleteExam = catchAsync(async (req, res) => {
  await examService.deleteExam(req.params.id, req.userId);
  sendSuccess(res, 200, 'Exam deleted', {});
});
