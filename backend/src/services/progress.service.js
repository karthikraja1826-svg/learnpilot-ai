import mongoose from 'mongoose';
import { Subject } from '../models/Subject.js';
import { Topic } from '../models/Topic.js';
import { Exam } from '../models/Exam.js';
import { StudySession } from '../models/StudySession.js';
import { ApiError } from '../utils/ApiError.js';
import { isValidObjectId } from '../utils/validators.js';
import { verifySubjectOwnership } from './subject.service.js';
import { verifyTopicOwnership } from './topic.service.js';
import { getWeeklyPerformance } from './studyPerformance.service.js';

const objectId = (value) => new mongoose.Types.ObjectId(value);

const averageMasteryOf = (topics) =>
  topics.length > 0 ? topics.reduce((sum, topic) => sum + (topic.currentMastery || 0), 0) / topics.length : 0;

export const getOverallProgress = async (userId) => {
  const [subjectCount, topicCount, totalAgg, topics] = await Promise.all([
    Subject.countDocuments({ user: userId }),
    Topic.countDocuments({ user: userId }),
    StudySession.aggregate([
      { $match: { user: objectId(userId), status: 'completed' } },
      { $group: { _id: null, totalMinutes: { $sum: '$completedDurationMinutes' }, sessionsCompleted: { $sum: 1 } } },
    ]),
    Topic.find({ user: userId }).select('currentMastery'),
  ]);

  return {
    subjectCount,
    topicCount,
    totalStudyMinutes: totalAgg[0]?.totalMinutes || 0,
    sessionsCompleted: totalAgg[0]?.sessionsCompleted || 0,
    averageMastery: Math.round(averageMasteryOf(topics) * 100) / 100,
  };
};

export const getSubjectProgress = async (userId, subjectId) => {
  if (!isValidObjectId(subjectId)) {
    throw new ApiError(400, 'Invalid subject id');
  }
  const subject = await verifySubjectOwnership(subjectId, userId);

  const topics = await Topic.find({ user: userId, subject: subject._id }).select('currentMastery status');
  const completedTopics = topics.filter((topic) => topic.status === 'completed').length;

  const [studyAgg] = await StudySession.aggregate([
    { $match: { user: objectId(userId), subject: subject._id, status: 'completed' } },
    { $group: { _id: null, studyMinutes: { $sum: '$completedDurationMinutes' }, sessionsCompleted: { $sum: 1 } } },
  ]);

  return {
    subjectId: subject._id,
    subjectName: subject.name,
    topicCount: topics.length,
    completedTopics,
    averageMastery: Math.round(averageMasteryOf(topics) * 100) / 100,
    studyMinutes: studyAgg?.studyMinutes || 0,
    sessionsCompleted: studyAgg?.sessionsCompleted || 0,
  };
};

export const getTopicProgress = async (userId, topicId) => {
  if (!isValidObjectId(topicId)) {
    throw new ApiError(400, 'Invalid topic id');
  }
  const topic = await verifyTopicOwnership(topicId, userId);

  const [studyAgg] = await StudySession.aggregate([
    { $match: { user: objectId(userId), topic: topic._id, status: 'completed' } },
    { $group: { _id: null, studyMinutes: { $sum: '$completedDurationMinutes' }, sessionsCompleted: { $sum: 1 } } },
  ]);

  return {
    topicId: topic._id,
    topicName: topic.name,
    status: topic.status,
    currentMastery: topic.currentMastery,
    targetMastery: topic.targetMastery,
    studyMinutes: studyAgg?.studyMinutes || 0,
    sessionsCompleted: studyAgg?.sessionsCompleted || 0,
  };
};

export const getWeeklyProgress = async (userId, startDateStr) => getWeeklyPerformance(userId, startDateStr);

export const getExamProgress = async (userId, examId) => {
  if (!isValidObjectId(examId)) {
    throw new ApiError(400, 'Invalid exam id');
  }
  const exam = await Exam.findOne({ _id: examId, user: userId });
  if (!exam) {
    throw new ApiError(404, 'Exam not found');
  }

  const daysRemaining = Math.max(0, Math.ceil((new Date(exam.examDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

  if (!exam.subject) {
    return {
      examId: exam._id,
      examTitle: exam.title,
      examDate: exam.examDate,
      subjectId: null,
      averageMastery: 0,
      studyMinutes: 0,
      daysRemaining,
    };
  }

  const topics = await Topic.find({ user: userId, subject: exam.subject }).select('currentMastery');

  const [studyAgg] = await StudySession.aggregate([
    { $match: { user: objectId(userId), subject: exam.subject, status: 'completed' } },
    { $group: { _id: null, studyMinutes: { $sum: '$completedDurationMinutes' } } },
  ]);

  return {
    examId: exam._id,
    examTitle: exam.title,
    examDate: exam.examDate,
    subjectId: exam.subject,
    averageMastery: Math.round(averageMasteryOf(topics) * 100) / 100,
    studyMinutes: studyAgg?.studyMinutes || 0,
    daysRemaining,
  };
};
