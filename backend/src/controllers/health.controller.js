import { env } from '../config/env.js';
import { getDatabaseState, isDatabaseConnected } from '../config/database.js';
import { sendSuccess } from '../utils/apiResponse.js';

export const getHealth = (req, res) => {
  sendSuccess(res, 200, 'Server is healthy', {
    server: 'running',
    database: getDatabaseState(),
    databaseConnected: isDatabaseConnected(),
    environment: env.nodeEnv,
    timestamp: new Date().toISOString(),
  });
};
