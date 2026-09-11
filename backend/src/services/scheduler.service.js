import { TIME_REGEX, toMinutes, isValidObjectId } from '../utils/validators.js';
import { ACTIVITY_TYPE_VALUES, ENTRY_STATUS_VALUES } from '../models/StudyPlan.js';
import { resolveTimezone, resolveLocalCalendarDate, addCalendarDays, getCalendarWeekday, toDateKey } from '../utils/timezone.js';

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const MIN_CHUNK_MINUTES = 10;

const STUDY_PERIOD_RANGES = {
  early_morning: [300, 480],
  morning: [480, 720],
  afternoon: [720, 1020],
  evening: [1020, 1200],
  night: [1200, 1380],
  late_night: [1380, 1440],
};

const clampRangeToWindow = ([start, end], windowStart, windowEnd) => {
  const clampedStart = Math.max(start, windowStart);
  const clampedEnd = Math.min(end, windowEnd);
  return clampedEnd > clampedStart ? [clampedStart, clampedEnd] : null;
};

const mergeRanges = (ranges) => {
  const sorted = [...ranges].sort((a, b) => a[0] - b[0]);
  const merged = [];

  sorted.forEach(([start, end]) => {
    const last = merged[merged.length - 1];
    if (last && start <= last[1]) {
      last[1] = Math.max(last[1], end);
    } else {
      merged.push([start, end]);
    }
  });

  return merged;
};

const subtractRanges = (base, subtract) => {
  let remaining = [base];

  subtract.forEach(([subStart, subEnd]) => {
    const next = [];
    remaining.forEach(([start, end]) => {
      if (subEnd <= start || subStart >= end) {
        next.push([start, end]);
        return;
      }
      if (subStart > start) {
        next.push([start, subStart]);
      }
      if (subEnd < end) {
        next.push([subEnd, end]);
      }
    });
    remaining = next;
  });

  return remaining;
};

export class ScheduleValidationError extends Error {
  constructor(errors) {
    super('Schedule validation failed');
    this.name = 'ScheduleValidationError';
    this.errors = errors;
  }
}

const minutesToTime = (mins) => {
  const normalized = ((mins % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

export const generateAvailableSlots = (availability, startDate, numDays) => {
  const slots = [];

  if (!availability) {
    return slots;
  }

  const timezone = resolveTimezone(availability.timezone);
  const sessionDuration = availability.preferredSessionDuration;
  const breakDuration = availability.preferredBreakDuration;
  const dailyLimit = availability.dailyStudyLimit;

  const localStart = resolveLocalCalendarDate(startDate, timezone);

  for (let i = 0; i < numDays; i += 1) {
    const day = addCalendarDays(localStart, i);
    const dayName = DAY_NAMES[getCalendarWeekday(day)];
    const daySchedule = availability.weeklySchedule?.[dayName];

    if (!daySchedule || !daySchedule.enabled) {
      continue;
    }

    if (!TIME_REGEX.test(daySchedule.startTime) || !TIME_REGEX.test(daySchedule.endTime)) {
      continue;
    }

    const windowStart = toMinutes(daySchedule.startTime);
    const windowEnd = toMinutes(daySchedule.endTime);

    if (windowEnd <= windowStart) {
      continue;
    }

    const preferredPeriods = availability.preferredStudyPeriods || [];
    const preferredRanges = mergeRanges(
      preferredPeriods
        .map((period) => STUDY_PERIOD_RANGES[period])
        .filter(Boolean)
        .map((range) => clampRangeToWindow(range, windowStart, windowEnd))
        .filter(Boolean)
    );

    const fallbackRanges =
      preferredRanges.length > 0 ? subtractRanges([windowStart, windowEnd], preferredRanges) : [[windowStart, windowEnd]];

    let allocatedToday = 0;
    let slotIndex = 0;

    const packRange = (rangeStart, rangeEnd) => {
      let cursor = rangeStart;

      while (cursor < rangeEnd && allocatedToday < dailyLimit) {
        const remainingWindow = rangeEnd - cursor;
        const remainingDaily = dailyLimit - allocatedToday;
        const duration = Math.min(sessionDuration, remainingWindow, remainingDaily);

        if (duration < MIN_CHUNK_MINUTES) {
          break;
        }

        slots.push({
          slotId: `${toDateKey(day)}_${slotIndex}`,
          date: day,
          startTime: minutesToTime(cursor),
          endTime: minutesToTime(cursor + duration),
          durationMinutes: duration,
        });

        cursor += duration + breakDuration;
        allocatedToday += duration;
        slotIndex += 1;
      }
    };

    preferredRanges.forEach(([start, end]) => packRange(start, end));
    fallbackRanges.forEach(([start, end]) => packRange(start, end));
  }

  return slots;
};

const buildEntry = (slot, item, duration, startTime, endTime, reasonOverride) => ({
  date: slot.date,
  startTime,
  endTime,
  durationMinutes: duration,
  subject: item.subjectId || null,
  topic: item.type === 'topic' ? item.refId : null,
  assignment: item.type === 'assignment' ? item.refId : null,
  task: item.type === 'task' ? item.refId : null,
  subjectName: item.subjectName || '',
  topicName: item.title || '',
  activityType: item.activityType,
  priority: item.priorityScore,
  status: 'scheduled',
  reason: reasonOverride || item.reason || '',
});

export const allocateItemsToSlots = (slots, items) => {
  const pool = items.map((item) => ({ ...item, remainingMinutes: item.estimatedMinutes }));
  const entries = [];

  for (const slot of slots) {
    let cursorMinutes = toMinutes(slot.startTime);
    let capacityLeft = slot.durationMinutes;

    while (capacityLeft >= MIN_CHUNK_MINUTES) {
      pool.sort((a, b) => b.priorityScore - a.priorityScore);
      const candidate = pool.find((item) => item.remainingMinutes > 0);

      if (!candidate) {
        break;
      }

      const duration = Math.min(capacityLeft, candidate.remainingMinutes);
      const startTime = minutesToTime(cursorMinutes);
      const endTime = minutesToTime(cursorMinutes + duration);

      entries.push(buildEntry(slot, candidate, duration, startTime, endTime));

      candidate.remainingMinutes -= duration;
      cursorMinutes += duration;
      capacityLeft -= duration;
    }
  }

  const unscheduled = pool.filter((item) => item.remainingMinutes > 0);

  return { entries, unscheduled };
};

export const applyGroqAllocation = (groqResponse, slots, items) => {
  const errors = [];

  if (!Array.isArray(groqResponse?.entries)) {
    throw new ScheduleValidationError(['Groq response is missing an entries array']);
  }

  const slotsById = new Map(slots.map((slot) => [slot.slotId, slot]));
  const itemsById = new Map(items.map((item) => [item.itemId, item]));

  const usedSlotCapacity = new Map();
  const usedItemMinutes = new Map();
  const slotEntries = new Map();

  for (const rawEntry of groqResponse.entries) {
    if (!rawEntry || typeof rawEntry !== 'object') {
      errors.push('Entry must be an object');
      continue;
    }

    const { slotId, itemId, durationMinutes, activityType, reason } = rawEntry;

    if (typeof slotId !== 'string' || !slotsById.has(slotId)) {
      errors.push(`Unknown slotId: ${String(slotId)}`);
      continue;
    }

    if (typeof itemId !== 'string' || !itemsById.has(itemId)) {
      errors.push(`Unknown itemId: ${String(itemId)}`);
      continue;
    }

    const duration = Number(durationMinutes);
    if (!Number.isFinite(duration) || duration <= 0) {
      errors.push(`Invalid durationMinutes for itemId ${itemId}`);
      continue;
    }

    if (activityType !== undefined && !ACTIVITY_TYPE_VALUES.includes(activityType)) {
      errors.push(`Invalid activityType: ${String(activityType)}`);
      continue;
    }

    const slot = slotsById.get(slotId);
    const item = itemsById.get(itemId);

    const slotUsed = usedSlotCapacity.get(slotId) || 0;
    if (slotUsed + duration > slot.durationMinutes) {
      errors.push(`Entry exceeds capacity for slot ${slotId}`);
      continue;
    }

    const itemUsed = usedItemMinutes.get(itemId) || 0;
    if (itemUsed + duration > item.estimatedMinutes) {
      errors.push(`Entry exceeds remaining work for item ${itemId}`);
      continue;
    }

    usedSlotCapacity.set(slotId, slotUsed + duration);
    usedItemMinutes.set(itemId, itemUsed + duration);

    if (!slotEntries.has(slotId)) {
      slotEntries.set(slotId, []);
    }

    slotEntries.get(slotId).push({
      item,
      duration,
      activityType: ACTIVITY_TYPE_VALUES.includes(activityType) ? activityType : item.activityType,
      reason: typeof reason === 'string' ? reason.slice(0, 500) : item.reason,
    });
  }

  if (errors.length > 0) {
    throw new ScheduleValidationError(errors);
  }

  if (slotEntries.size === 0) {
    throw new ScheduleValidationError(['Groq response did not produce any valid entries']);
  }

  const entries = [];

  for (const slot of slots) {
    const items_ = slotEntries.get(slot.slotId);
    if (!items_ || items_.length === 0) {
      continue;
    }

    let cursorMinutes = toMinutes(slot.startTime);

    for (const { item, duration, activityType, reason } of items_) {
      const startTime = minutesToTime(cursorMinutes);
      const endTime = minutesToTime(cursorMinutes + duration);
      entries.push(
        buildEntry(
          slot,
          { ...item, activityType },
          duration,
          startTime,
          endTime,
          reason
        )
      );
      cursorMinutes += duration;
    }
  }

  return entries;
};

export const validateScheduleEntries = (entries, availability) => {
  const errors = [];

  if (!Array.isArray(entries)) {
    return { valid: false, errors: ['Entries must be an array'] };
  }

  const byDay = new Map();

  entries.forEach((entry, index) => {
    const label = `entry[${index}]`;

    const date = new Date(entry.date);
    if (Number.isNaN(date.getTime())) {
      errors.push(`${label}: invalid date`);
      return;
    }

    if (typeof entry.startTime !== 'string' || !TIME_REGEX.test(entry.startTime)) {
      errors.push(`${label}: invalid startTime`);
      return;
    }

    if (typeof entry.endTime !== 'string' || !TIME_REGEX.test(entry.endTime)) {
      errors.push(`${label}: invalid endTime`);
      return;
    }

    const startMin = toMinutes(entry.startTime);
    const endMin = toMinutes(entry.endTime);

    if (endMin <= startMin) {
      errors.push(`${label}: endTime must be after startTime`);
      return;
    }

    const expectedDuration = endMin - startMin;
    if (!Number.isFinite(entry.durationMinutes) || entry.durationMinutes <= 0) {
      errors.push(`${label}: invalid durationMinutes`);
      return;
    }

    if (entry.durationMinutes !== expectedDuration) {
      errors.push(`${label}: durationMinutes does not match startTime/endTime`);
      return;
    }

    if (!ACTIVITY_TYPE_VALUES.includes(entry.activityType)) {
      errors.push(`${label}: invalid activityType`);
      return;
    }

    if (entry.status !== undefined && !ENTRY_STATUS_VALUES.includes(entry.status)) {
      errors.push(`${label}: invalid status`);
      return;
    }

    ['subject', 'topic', 'assignment', 'task'].forEach((field) => {
      const value = entry[field];
      if (value !== null && value !== undefined && !isValidObjectId(value)) {
        errors.push(`${label}: invalid ${field} reference`);
      }
    });

    const key = toDateKey(date);
    if (!byDay.has(key)) {
      byDay.set(key, []);
    }
    byDay.get(key).push({ startMin, endMin, index });
  });

  byDay.forEach((dayEntries, key) => {
    const sorted = [...dayEntries].sort((a, b) => a.startMin - b.startMin);

    for (let i = 1; i < sorted.length; i += 1) {
      if (sorted[i].startMin < sorted[i - 1].endMin) {
        errors.push(`Overlapping sessions detected on ${key}`);
      }
    }

    if (availability) {
      const dayName = DAY_NAMES[getCalendarWeekday(`${key}T00:00:00.000Z`)];
      const daySchedule = availability.weeklySchedule?.[dayName];

      const totalMinutes = dayEntries.reduce((sum, e) => sum + (e.endMin - e.startMin), 0);
      if (totalMinutes > availability.dailyStudyLimit) {
        errors.push(`Daily study limit exceeded on ${key}`);
      }

      if (!daySchedule || !daySchedule.enabled) {
        errors.push(`Sessions scheduled on ${key} but that day is not enabled in availability`);
      } else {
        const windowStart = toMinutes(daySchedule.startTime);
        const windowEnd = toMinutes(daySchedule.endTime);

        dayEntries.forEach(({ startMin, endMin }) => {
          if (startMin < windowStart || endMin > windowEnd) {
            errors.push(`Session outside availability window on ${key}`);
          }
        });
      }
    }
  });

  return { valid: errors.length === 0, errors };
};
