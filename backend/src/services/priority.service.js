const URGENCY_HORIZON_DAYS = 30;

const PRIORITY_LABEL_WEIGHTS = {
  low: 20,
  medium: 50,
  high: 75,
  urgent: 95,
};

export const PRIORITY_WEIGHTS = {
  topic: {
    masteryGap: 0.3,
    difficulty: 0.15,
    importance: 0.15,
    examUrgency: 0.3,
    status: 0.1,
  },
  assignment: {
    deadlineUrgency: 0.45,
    priorityLabel: 0.25,
    subjectImportance: 0.15,
    workload: 0.15,
  },
  task: {
    deadlineUrgency: 0.4,
    priorityLabel: 0.4,
    subjectImportance: 0.2,
  },
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export const calculateDeadlineUrgency = (deadline, referenceDate = new Date()) => {
  if (!deadline) {
    return 0;
  }

  const deadlineDate = new Date(deadline);
  if (Number.isNaN(deadlineDate.getTime())) {
    return 0;
  }

  const diffMs = deadlineDate.getTime() - referenceDate.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffDays < 0) {
    return 100;
  }

  if (diffDays < 1) {
    return 95;
  }

  if (diffDays >= URGENCY_HORIZON_DAYS) {
    return 5;
  }

  const score = 90 - ((diffDays - 1) / (URGENCY_HORIZON_DAYS - 1)) * 80;
  return clamp(Math.round(score), 10, 90);
};

const topicStatusScore = (status) => {
  switch (status) {
    case 'needs_revision':
      return 80;
    case 'not_started':
      return 60;
    case 'in_progress':
      return 50;
    case 'completed':
      return 10;
    default:
      return 50;
  }
};

export const calculateTopicPriority = (topic, subject, nearestExamDate, referenceDate = new Date()) => {
  const masteryGap = clamp(100 - (topic.currentMastery ?? 0), 0, 100);
  const avgDifficulty = ((topic.difficulty ?? 3) + (subject?.difficulty ?? 3)) / 2;
  const difficultyScore = clamp((avgDifficulty / 5) * 100, 0, 100);
  const importanceScore = clamp(((subject?.importance ?? 3) / 5) * 100, 0, 100);
  const examUrgency = calculateDeadlineUrgency(nearestExamDate, referenceDate);
  const statusScore = topicStatusScore(topic.status);

  const weights = PRIORITY_WEIGHTS.topic;
  const raw =
    masteryGap * weights.masteryGap +
    difficultyScore * weights.difficulty +
    importanceScore * weights.importance +
    examUrgency * weights.examUrgency +
    statusScore * weights.status;

  return clamp(Math.round(raw), 0, 100);
};

export const calculateAssignmentPriority = (assignment, subject, referenceDate = new Date()) => {
  const deadlineUrgency = calculateDeadlineUrgency(assignment.deadline, referenceDate);
  const priorityLabel = PRIORITY_LABEL_WEIGHTS[assignment.priority] ?? PRIORITY_LABEL_WEIGHTS.medium;
  const subjectImportance = clamp(((subject?.importance ?? 3) / 5) * 100, 0, 100);
  const workload = clamp((Math.min(assignment.estimatedHours ?? 1, 10) / 10) * 100, 0, 100);

  const weights = PRIORITY_WEIGHTS.assignment;
  const raw =
    deadlineUrgency * weights.deadlineUrgency +
    priorityLabel * weights.priorityLabel +
    subjectImportance * weights.subjectImportance +
    workload * weights.workload;

  return clamp(Math.round(raw), 0, 100);
};

export const calculateTaskPriority = (task, subject, referenceDate = new Date()) => {
  const deadlineUrgency = task.dueDate ? calculateDeadlineUrgency(task.dueDate, referenceDate) : 30;
  const priorityLabel = PRIORITY_LABEL_WEIGHTS[task.priority] ?? PRIORITY_LABEL_WEIGHTS.medium;
  const subjectImportance = subject ? clamp((subject.importance / 5) * 100, 0, 100) : 50;

  const weights = PRIORITY_WEIGHTS.task;
  const raw =
    deadlineUrgency * weights.deadlineUrgency +
    priorityLabel * weights.priorityLabel +
    subjectImportance * weights.subjectImportance;

  return clamp(Math.round(raw), 0, 100);
};
