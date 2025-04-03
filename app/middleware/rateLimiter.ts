import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { AppError } from './errorHandler';

// Create a rate limiter configuration
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  standardHeaders: 'draft-7', // Set standard headers with draft spec 7
  legacyHeaders: false, // Disable legacy headers
  handler: (_req: Request, _res: Response) => {
    throw new AppError('Too many requests, please try again after 15 minutes', 429);
  },
});
