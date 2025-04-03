import { Router } from 'express';
import { AppError } from '../middleware/errorHandler';
import v1Routes from './v1';

const router = Router();

router.get('/', (req, res) => {
  res.send('Music Booking API is active and ready to serve!');
});

// Mounting v1 routes at root level as well for backward compatibility
router.use('/', v1Routes);

// Mount API v1 routes
router.use('/v1', v1Routes);

// Handle 404 - Route not found
router.use((req, res, next) => {
  const error = new AppError('Route not Found', 404);
  next(error);
});

export default router;