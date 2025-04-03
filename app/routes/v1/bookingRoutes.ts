import { Router } from 'express';
import { BookingController } from '../../controllers/BookingController';
import { createBookingValidator, bookingIdValidator, updateBookingStatusValidator, updatePaymentStatusValidator, getBookingsValidator } from '../../validators/bookingValidator';
import { protect, restrictTo } from '../../middleware/auth';
import { validationMiddleware } from '../../middleware/validator';

const router = Router();

router.post(
  '/',
  protect,
  restrictTo('organizer', 'admin'),
  createBookingValidator,
  validationMiddleware,
  BookingController.createBooking
);

router.get(
  '/:id',
  protect,
  bookingIdValidator,
  validationMiddleware,
  BookingController.getBookingById
);

// Artist bookings
router.get(
  '/artist',
  protect,
  restrictTo('artist'),
  getBookingsValidator,
  validationMiddleware,
  BookingController.getArtistBookings
);

// Organizer bookings
router.get(
  '/organizer',
  protect,
  restrictTo('organizer', 'admin'),
  getBookingsValidator,
  validationMiddleware,
  BookingController.getOrganizerBookings
);

// Booking status updates
router.patch(
  '/:id/status',
  protect,
  bookingIdValidator,
  updateBookingStatusValidator,
  validationMiddleware,
  BookingController.updateBookingStatus
);

router.patch(
  '/:id/payment',
  protect,
  restrictTo('organizer', 'admin'),
  bookingIdValidator,
  updatePaymentStatusValidator,
  validationMiddleware,
  BookingController.updatePaymentStatus
);

// Quick actions for bookings
router.patch(
  '/:id/confirm',
  protect,
  restrictTo('artist'),
  bookingIdValidator,
  validationMiddleware,
  BookingController.confirmBooking
);

router.patch(
  '/:id/reject',
  protect,
  restrictTo('artist'),
  bookingIdValidator,
  validationMiddleware,
  BookingController.rejectBooking
);

router.patch(
  '/:id/cancel',
  protect,
  bookingIdValidator,
  validationMiddleware,
  BookingController.cancelBooking
);

router.patch(
  '/:id/complete',
  protect,
  restrictTo('organizer', 'admin'),
  bookingIdValidator,
  validationMiddleware,
  BookingController.completeBooking
);

export default router;