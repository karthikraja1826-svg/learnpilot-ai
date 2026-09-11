import mongoose from 'mongoose';

export const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === String(id);

export const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

export const toMinutes = (time) => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

export const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;

export const isFiniteNumber = (value) => typeof value === 'number' && Number.isFinite(value);
