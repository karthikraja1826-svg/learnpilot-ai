import dotenv from 'dotenv';

dotenv.config();

const requiredVars = [
  'MONGODB_URI',
  'PORT',
  'CLIENT_URL',
  'NODE_ENV',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_PRIVATE_KEY',
];

const missing = requiredVars.filter((key) => !process.env[key]);

if (missing.length > 0) {
  throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
}

export const env = {
  mongodbUri: process.env.MONGODB_URI,
  port: parseInt(process.env.PORT, 10),
  clientUrl: process.env.CLIENT_URL,
  nodeEnv: process.env.NODE_ENV,
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID,
  firebaseClientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  firebasePrivateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  groqApiKey: process.env.GROQ_API_KEY || '',
  groqModel: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
  vapidPublicKey: process.env.VAPID_PUBLIC_KEY || '',
  vapidPrivateKey: process.env.VAPID_PRIVATE_KEY || '',
  vapidSubject: process.env.VAPID_SUBJECT || '',
  studyReminderMinutesBefore: parseInt(process.env.STUDY_REMINDER_MINUTES_BEFORE, 10) || 10,
  deadlineReminderHoursBefore: parseInt(process.env.DEADLINE_REMINDER_HOURS_BEFORE, 10) || 24,
  notificationSchedulerIntervalMs: parseInt(process.env.NOTIFICATION_SCHEDULER_INTERVAL_MS, 10) || 60000,
};
