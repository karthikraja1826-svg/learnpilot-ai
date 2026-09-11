import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import apiRouter from './routes/index.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

app.use(
  helmet({
    // The frontend and backend are served from different origins (different
    // ports in development, and typically different hosts in production).
    // Helmet's default same-origin resource policy blocks the frontend from
    // loading static assets we serve here (e.g. uploaded profile photos) via
    // <img> tags. Allow cross-origin reads of our own static files while
    // keeping every other helmet protection at its default.
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

app.use(
  express.static(path.join(__dirname, '..', 'public'), {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('service-worker.js')) {
        res.setHeader('Service-Worker-Allowed', '/');
        res.setHeader('Cache-Control', 'no-cache');
      }
    },
  })
);

app.use(
  cors({
    origin: env.clientUrl,
    credentials: true,
  })
);

app.use(morgan(env.nodeEnv === 'development' ? 'dev' : 'combined'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api', apiLimiter, apiRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
