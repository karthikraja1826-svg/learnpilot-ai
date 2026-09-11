import { isValidTimezone } from './timezone.js';

const EDUCATION_LEVELS = ['high_school', 'undergraduate', 'graduate', 'postgraduate', 'other'];
const DAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
const NOTIFICATION_PREFERENCE_BOOLEAN_FIELDS = [
  'pushEnabled',
  'studyReminders',
  'assignmentReminders',
  'examReminders',
  'streakNotifications',
];

const DAILY_STUDY_TARGETS = ['1 hour', '2 hours', '3 hours', '4 hours', '5+ hours'];
const STUDY_PERIODS = ['Morning', 'Afternoon', 'Evening', 'Night'];
const SESSION_DURATIONS = ['25 minutes', '30 minutes', '45 minutes', '60 minutes', '90 minutes'];
const BREAK_DURATIONS = ['5 minutes', '10 minutes', '15 minutes', '20 minutes'];

const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;

const isPlainString = (value, maxLength) =>
  typeof value === 'string' && value.length <= maxLength;

const isValidDateInput = (value) => {
  if (typeof value !== 'string' && !(value instanceof Date)) return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime());
};

const toMinutes = (time) => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

export const validateProfileInput = (body) => {
  const errors = [];
  const allowedFields = [
    'name',
    'educationLevel',
    'course',
    'studyGoal',
    'timezone',
    'preferredStudyTimes',
    'availableHours',
    'onboardingCompleted',
    'notificationPreferences',
    'phone',
    'dateOfBirth',
    'bio',
    'institution',
    'degreeCourse',
    'department',
    'yearSemester',
    'studentId',
    'subjects',
    'academicGoals',
    'shortTermGoals',
    'longTermGoals',
    'improvementAreas',
    'learningInterests',
    'dailyStudyTarget',
    'preferredStudyPeriods',
    'preferredSessionDuration',
    'breakDuration',
    'additionalInformation',
  ];

  const unexpectedFields = Object.keys(body).filter((key) => !allowedFields.includes(key));
  if (unexpectedFields.length > 0) {
    errors.push(`Unexpected fields: ${unexpectedFields.join(', ')}`);
  }

  const update = {};

  if (body.name !== undefined) {
    if (!isNonEmptyString(body.name) || body.name.length > 100) {
      errors.push('name must be a non-empty string of at most 100 characters');
    } else {
      update.name = body.name.trim();
    }
  }

  if (body.educationLevel !== undefined) {
    if (!EDUCATION_LEVELS.includes(body.educationLevel)) {
      errors.push(`educationLevel must be one of: ${EDUCATION_LEVELS.join(', ')}`);
    } else {
      update.educationLevel = body.educationLevel;
    }
  }

  if (body.course !== undefined) {
    if (typeof body.course !== 'string' || body.course.length > 150) {
      errors.push('course must be a string of at most 150 characters');
    } else {
      update.course = body.course.trim();
    }
  }

  if (body.studyGoal !== undefined) {
    if (typeof body.studyGoal !== 'string' || body.studyGoal.length > 300) {
      errors.push('studyGoal must be a string of at most 300 characters');
    } else {
      update.studyGoal = body.studyGoal.trim();
    }
  }

  if (body.timezone !== undefined) {
    if (typeof body.timezone !== 'string' || body.timezone.length > 100 || !isValidTimezone(body.timezone.trim())) {
      errors.push('timezone must be a valid IANA timezone string');
    } else {
      update.timezone = body.timezone.trim();
    }
  }

  if (body.availableHours !== undefined) {
    const hours = body.availableHours;
    if (typeof hours !== 'number' || Number.isNaN(hours) || hours < 0 || hours > 24) {
      errors.push('availableHours must be a number between 0 and 24');
    } else {
      update.availableHours = hours;
    }
  }

  if (body.onboardingCompleted !== undefined) {
    if (typeof body.onboardingCompleted !== 'boolean') {
      errors.push('onboardingCompleted must be a boolean');
    } else {
      update.onboardingCompleted = body.onboardingCompleted;
    }
  }

  if (body.preferredStudyTimes !== undefined) {
    if (!Array.isArray(body.preferredStudyTimes)) {
      errors.push('preferredStudyTimes must be an array');
    } else {
      const invalidEntry = body.preferredStudyTimes.some((entry) => {
        return (
          typeof entry !== 'object' ||
          entry === null ||
          !DAYS.includes(entry.day) ||
          !TIME_REGEX.test(entry.startTime) ||
          !TIME_REGEX.test(entry.endTime)
        );
      });

      const invalidRange =
        !invalidEntry &&
        body.preferredStudyTimes.some((entry) => toMinutes(entry.startTime) >= toMinutes(entry.endTime));

      if (invalidEntry) {
        errors.push('preferredStudyTimes entries must include a valid day, startTime, and endTime');
      } else if (invalidRange) {
        errors.push('preferredStudyTimes entries must have a startTime earlier than endTime');
      } else {
        update.preferredStudyTimes = body.preferredStudyTimes;
      }
    }
  }

  if (body.notificationPreferences !== undefined) {
    if (typeof body.notificationPreferences !== 'object' || body.notificationPreferences === null || Array.isArray(body.notificationPreferences)) {
      errors.push('notificationPreferences must be an object');
    } else {
      const prefs = body.notificationPreferences;
      const unexpectedPrefFields = Object.keys(prefs).filter(
        (key) => !NOTIFICATION_PREFERENCE_BOOLEAN_FIELDS.includes(key) && key !== 'studyReminderMinutesBefore'
      );

      if (unexpectedPrefFields.length > 0) {
        errors.push(`Unexpected notificationPreferences fields: ${unexpectedPrefFields.join(', ')}`);
      } else {
        const prefErrors = [];

        NOTIFICATION_PREFERENCE_BOOLEAN_FIELDS.forEach((field) => {
          if (prefs[field] !== undefined) {
            if (typeof prefs[field] !== 'boolean') {
              prefErrors.push(`notificationPreferences.${field} must be a boolean`);
            } else {
              update[`notificationPreferences.${field}`] = prefs[field];
            }
          }
        });

        if (prefs.studyReminderMinutesBefore !== undefined) {
          const minutes = prefs.studyReminderMinutesBefore;
          if (typeof minutes !== 'number' || Number.isNaN(minutes) || minutes < 1 || minutes > 180) {
            prefErrors.push('notificationPreferences.studyReminderMinutesBefore must be a number between 1 and 180');
          } else {
            update['notificationPreferences.studyReminderMinutesBefore'] = minutes;
          }
        }

        errors.push(...prefErrors);
      }
    }
  }

  if (body.phone !== undefined) {
    if (typeof body.phone !== 'string' || !isPlainString(body.phone, 30)) {
      errors.push('phone must be a string of at most 30 characters');
    } else {
      update.phone = body.phone.trim();
    }
  }

  if (body.dateOfBirth !== undefined) {
    if (!isValidDateInput(body.dateOfBirth)) {
      errors.push('dateOfBirth must be a valid date');
    } else {
      update.dateOfBirth = new Date(body.dateOfBirth);
    }
  }

  if (body.bio !== undefined) {
    if (typeof body.bio !== 'string' || !isPlainString(body.bio, 500)) {
      errors.push('bio must be a string of at most 500 characters');
    } else {
      update.bio = body.bio.trim();
    }
  }

  if (body.institution !== undefined) {
    if (typeof body.institution !== 'string' || !isPlainString(body.institution, 200)) {
      errors.push('institution must be a string of at most 200 characters');
    } else {
      update.institution = body.institution.trim();
    }
  }

  if (body.degreeCourse !== undefined) {
    if (typeof body.degreeCourse !== 'string' || !isPlainString(body.degreeCourse, 150)) {
      errors.push('degreeCourse must be a string of at most 150 characters');
    } else {
      update.degreeCourse = body.degreeCourse.trim();
    }
  }

  if (body.department !== undefined) {
    if (typeof body.department !== 'string' || !isPlainString(body.department, 150)) {
      errors.push('department must be a string of at most 150 characters');
    } else {
      update.department = body.department.trim();
    }
  }

  if (body.yearSemester !== undefined) {
    if (typeof body.yearSemester !== 'string' || !isPlainString(body.yearSemester, 50)) {
      errors.push('yearSemester must be a string of at most 50 characters');
    } else {
      update.yearSemester = body.yearSemester.trim();
    }
  }

  if (body.studentId !== undefined) {
    if (typeof body.studentId !== 'string' || !isPlainString(body.studentId, 50)) {
      errors.push('studentId must be a string of at most 50 characters');
    } else {
      update.studentId = body.studentId.trim();
    }
  }

  if (body.subjects !== undefined) {
    if (
      !Array.isArray(body.subjects) ||
      body.subjects.length > 20 ||
      body.subjects.some((subject) => typeof subject !== 'string' || subject.trim().length === 0 || subject.trim().length > 60)
    ) {
      errors.push('subjects must be an array of at most 20 non-empty strings, each up to 60 characters');
    } else {
      update.subjects = body.subjects.map((subject) => subject.trim());
    }
  }

  if (body.academicGoals !== undefined) {
    if (typeof body.academicGoals !== 'string' || !isPlainString(body.academicGoals, 500)) {
      errors.push('academicGoals must be a string of at most 500 characters');
    } else {
      update.academicGoals = body.academicGoals.trim();
    }
  }

  if (body.shortTermGoals !== undefined) {
    if (typeof body.shortTermGoals !== 'string' || !isPlainString(body.shortTermGoals, 500)) {
      errors.push('shortTermGoals must be a string of at most 500 characters');
    } else {
      update.shortTermGoals = body.shortTermGoals.trim();
    }
  }

  if (body.longTermGoals !== undefined) {
    if (typeof body.longTermGoals !== 'string' || !isPlainString(body.longTermGoals, 500)) {
      errors.push('longTermGoals must be a string of at most 500 characters');
    } else {
      update.longTermGoals = body.longTermGoals.trim();
    }
  }

  if (body.improvementAreas !== undefined) {
    if (typeof body.improvementAreas !== 'string' || !isPlainString(body.improvementAreas, 500)) {
      errors.push('improvementAreas must be a string of at most 500 characters');
    } else {
      update.improvementAreas = body.improvementAreas.trim();
    }
  }

  if (body.learningInterests !== undefined) {
    if (typeof body.learningInterests !== 'string' || !isPlainString(body.learningInterests, 500)) {
      errors.push('learningInterests must be a string of at most 500 characters');
    } else {
      update.learningInterests = body.learningInterests.trim();
    }
  }

  if (body.dailyStudyTarget !== undefined) {
    if (!DAILY_STUDY_TARGETS.includes(body.dailyStudyTarget)) {
      errors.push(`dailyStudyTarget must be one of: ${DAILY_STUDY_TARGETS.join(', ')}`);
    } else {
      update.dailyStudyTarget = body.dailyStudyTarget;
    }
  }

  if (body.preferredStudyPeriods !== undefined) {
    if (
      !Array.isArray(body.preferredStudyPeriods) ||
      body.preferredStudyPeriods.some((period) => !STUDY_PERIODS.includes(period))
    ) {
      errors.push(`preferredStudyPeriods must be an array containing only: ${STUDY_PERIODS.join(', ')}`);
    } else {
      update.preferredStudyPeriods = body.preferredStudyPeriods;
    }
  }

  if (body.preferredSessionDuration !== undefined) {
    if (!SESSION_DURATIONS.includes(body.preferredSessionDuration)) {
      errors.push(`preferredSessionDuration must be one of: ${SESSION_DURATIONS.join(', ')}`);
    } else {
      update.preferredSessionDuration = body.preferredSessionDuration;
    }
  }

  if (body.breakDuration !== undefined) {
    if (!BREAK_DURATIONS.includes(body.breakDuration)) {
      errors.push(`breakDuration must be one of: ${BREAK_DURATIONS.join(', ')}`);
    } else {
      update.breakDuration = body.breakDuration;
    }
  }

  if (body.additionalInformation !== undefined) {
    if (typeof body.additionalInformation !== 'string' || !isPlainString(body.additionalInformation, 1000)) {
      errors.push('additionalInformation must be a string of at most 1000 characters');
    } else {
      update.additionalInformation = body.additionalInformation.trim();
    }
  }

  return { errors, update };
};

const ONBOARDING_REQUIRED_FIELDS = [
  'name',
  'dailyStudyTarget',
  'preferredSessionDuration',
  'breakDuration',
  'timezone',
];

export const hasRequiredOnboardingData = (existingUser, update) => {
  return ONBOARDING_REQUIRED_FIELDS.every((field) => {
    const value = update[field] !== undefined ? update[field] : existingUser?.[field];
    return typeof value === 'string' && value.trim().length > 0;
  });
};
