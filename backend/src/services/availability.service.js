import { StudyAvailability, AVAILABILITY_DAYS, STUDY_PERIOD_VALUES } from '../models/StudyAvailability.js';
import { ApiError } from '../utils/ApiError.js';
import { TIME_REGEX, toMinutes } from '../utils/validators.js';
import { resolveTimezone } from '../utils/timezone.js';

const NUMERIC_FIELDS = {
  dailyStudyLimit: [15, 1440],
  preferredSessionDuration: [5, 480],
  preferredBreakDuration: [1, 120],
};

const validateDaySchedule = (day, schedule, errors) => {
  if (schedule === undefined || schedule === null) {
    return undefined;
  }

  if (typeof schedule !== 'object' || Array.isArray(schedule)) {
    errors.push(`${day} must be an object`);
    return undefined;
  }

  const result = {};

  if (schedule.enabled !== undefined) {
    if (typeof schedule.enabled !== 'boolean') {
      errors.push(`${day}.enabled must be a boolean`);
    } else {
      result.enabled = schedule.enabled;
    }
  }

  const hasStart = schedule.startTime !== undefined;
  const hasEnd = schedule.endTime !== undefined;

  if (hasStart) {
    if (typeof schedule.startTime !== 'string' || !TIME_REGEX.test(schedule.startTime)) {
      errors.push(`${day}.startTime must be in HH:mm format`);
    } else {
      result.startTime = schedule.startTime;
    }
  }

  if (hasEnd) {
    if (typeof schedule.endTime !== 'string' || !TIME_REGEX.test(schedule.endTime)) {
      errors.push(`${day}.endTime must be in HH:mm format`);
    } else {
      result.endTime = schedule.endTime;
    }
  }

  if (result.startTime && result.endTime && toMinutes(result.startTime) >= toMinutes(result.endTime)) {
    errors.push(`${day}.startTime must be earlier than ${day}.endTime`);
  }

  return result;
};

const validateAvailabilityInput = (body, { partial = false } = {}) => {
  const errors = [];
  const data = {};

  if (body.weeklySchedule !== undefined) {
    if (typeof body.weeklySchedule !== 'object' || body.weeklySchedule === null || Array.isArray(body.weeklySchedule)) {
      errors.push('weeklySchedule must be an object');
    } else {
      const invalidDays = Object.keys(body.weeklySchedule).filter((day) => !AVAILABILITY_DAYS.includes(day));
      if (invalidDays.length > 0) {
        errors.push(`weeklySchedule contains invalid days: ${invalidDays.join(', ')}`);
      }

      const weeklySchedule = {};
      AVAILABILITY_DAYS.forEach((day) => {
        if (body.weeklySchedule[day] !== undefined) {
          const daySchedule = validateDaySchedule(day, body.weeklySchedule[day], errors);
          if (daySchedule !== undefined) {
            weeklySchedule[day] = daySchedule;
          }
        }
      });

      data.weeklySchedule = weeklySchedule;
    }
  }

  if (body.timezone !== undefined) {
    if (typeof body.timezone !== 'string' || body.timezone.trim().length === 0 || body.timezone.length > 100) {
      errors.push('timezone must be a non-empty string of at most 100 characters');
    } else {
      data.timezone = body.timezone.trim();
    }
  }

  Object.entries(NUMERIC_FIELDS).forEach(([field, [min, max]]) => {
    if (body[field] !== undefined) {
      const value = Number(body[field]);
      if (Number.isNaN(value) || value < min || value > max) {
        errors.push(`${field} must be a number between ${min} and ${max}`);
      } else {
        data[field] = value;
      }
    }
  });

  if (body.preferredStudyPeriods !== undefined) {
    if (!Array.isArray(body.preferredStudyPeriods)) {
      errors.push('preferredStudyPeriods must be an array');
    } else {
      const invalid = body.preferredStudyPeriods.some((period) => !STUDY_PERIOD_VALUES.includes(period));
      if (invalid) {
        errors.push(`preferredStudyPeriods must only contain: ${STUDY_PERIOD_VALUES.join(', ')}`);
      } else {
        data.preferredStudyPeriods = body.preferredStudyPeriods;
      }
    }
  }

  return { errors, data };
};

export const getAvailability = async (userId) => {
  const availability = await StudyAvailability.findOne({ user: userId });
  if (!availability) {
    throw new ApiError(404, 'Study availability not configured');
  }
  return availability;
};

export const createAvailability = async (userId, body) => {
  const existing = await StudyAvailability.findOne({ user: userId });
  if (existing) {
    throw new ApiError(409, 'Study availability already exists for this user. Use PUT to update it.');
  }

  const { errors, data } = validateAvailabilityInput(body);
  if (errors.length > 0) {
    throw new ApiError(400, errors.join('; '));
  }

  return StudyAvailability.create({ ...data, user: userId });
};

export const updateAvailability = async (userId, body) => {
  const availability = await StudyAvailability.findOne({ user: userId });
  if (!availability) {
    throw new ApiError(404, 'Study availability not configured. Create it first.');
  }

  const { errors, data } = validateAvailabilityInput(body, { partial: true });
  if (errors.length > 0) {
    throw new ApiError(400, errors.join('; '));
  }

  if (data.weeklySchedule) {
    availability.weeklySchedule = {
      ...(availability.weeklySchedule?.toObject ? availability.weeklySchedule.toObject() : availability.weeklySchedule),
      ...Object.fromEntries(
        Object.entries(data.weeklySchedule).map(([day, schedule]) => [
          day,
          { ...(availability.weeklySchedule?.[day]?.toObject ? availability.weeklySchedule[day].toObject() : availability.weeklySchedule?.[day]), ...schedule },
        ])
      ),
    };
    delete data.weeklySchedule;
  }

  Object.assign(availability, data);
  await availability.save();
  return availability;
};

export const deleteAvailability = async (userId) => {
  const availability = await StudyAvailability.findOne({ user: userId });
  if (!availability) {
    throw new ApiError(404, 'Study availability not configured');
  }
  await availability.deleteOne();
  return availability;
};

export const getUserTimezone = async (userId) => {
  const availability = await StudyAvailability.findOne({ user: userId }).select('timezone');
  return resolveTimezone(availability?.timezone);
};
