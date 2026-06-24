import express, { type Request, type Response } from 'express';
import { applySecurityMiddleware } from './common/middlewares/security.middleware.js';
import { globalRateLimiter } from './common/middlewares/rate-limit.middleware.js';
import { notFoundMiddleware } from './common/middlewares/not-found.middleware.js';
import { globalErrorHandler } from './common/middlewares/error.middleware.js';

const app = express();

applySecurityMiddleware(app);

app.use(globalRateLimiter);

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

app.use(notFoundMiddleware);
app.use(globalErrorHandler);

export { app };
