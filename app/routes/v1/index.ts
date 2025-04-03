import { Router } from 'express';
import authRoutes from './authRoutes';
import artistRoutes from './artistRoutes';
import eventRoutes from './eventRoutes';
import bookingRoutes from './bookingRoutes';

const router = Router();

// Mount all routes
router.use('/auth', authRoutes);
router.use('/artists', artistRoutes);
router.use('/events', eventRoutes);
router.use('/bookings', bookingRoutes);

export default router;