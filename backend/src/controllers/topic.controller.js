import { catchAsync } from '../utils/catchAsync.js';
import { sendSuccess } from '../utils/apiResponse.js';
import * as topicService from '../services/topic.service.js';

export const createTopic = catchAsync(async (req, res) => {
  const topic = await topicService.createTopic(req.userId, req.body || {});
  sendSuccess(res, 201, 'Topic created', { topic });
});

export const listTopics = catchAsync(async (req, res) => {
  const { topics, pagination } = await topicService.listTopics(req.userId, req.query || {});
  sendSuccess(res, 200, 'Topics retrieved', { topics, pagination });
});

export const getTopic = catchAsync(async (req, res) => {
  const topic = await topicService.getTopicById(req.params.id, req.userId);
  sendSuccess(res, 200, 'Topic retrieved', { topic });
});

export const updateTopic = catchAsync(async (req, res) => {
  const topic = await topicService.updateTopic(req.params.id, req.userId, req.body || {});
  sendSuccess(res, 200, 'Topic updated', { topic });
});

export const deleteTopic = catchAsync(async (req, res) => {
  await topicService.deleteTopic(req.params.id, req.userId);
  sendSuccess(res, 200, 'Topic deleted', {});
});
