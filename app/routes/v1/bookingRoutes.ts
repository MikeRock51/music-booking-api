import { Router } from 'express';
import BookingController from '../../controllers/BookingController';
import { createBookingValidator, bookingIdValidator, updateBookingStatusValidator, updatePaymentStatusValidator, getBookingsValidator } from '../../validators/bookingValidator';
import { protect, restrictTo } from '../../middleware/auth';
import { validationMiddleware } from '../../middleware/validator';

const router = Router();
const bookingController = new BookingController();

router.post(
  '/',
  protect,
  restrictTo('organizer', 'admin'),
  createBookingValidator,
  validationMiddleware,
  bookingController.createBooking.bind(bookingController)
);

// Admin endpoint to get all bookings
router.get(
  '/',
  protect,
  restrictTo('admin'),
  getBookingsValidator,
  validationMiddleware,
  bookingController.getAllBookings.bind(bookingController)
);

router.get(
  '/artist',
  protect,
  restrictTo('artist'),
  getBookingsValidator,
  validationMiddleware,
  bookingController.getArtistBookings.bind(bookingController)
);

router.get(
  '/organizer',
  protect,
  restrictTo('organizer', 'admin'),
  getBookingsValidator,
  validationMiddleware,
  bookingController.getOrganizerBookings.bind(bookingController)
);

router.get(
  '/:id',
  protect,
  bookingIdValidator,
  validationMiddleware,
  bookingController.getBookingById.bind(bookingController)
);

// Booking status updates
router.patch(
  '/:id/status',
  protect,
  bookingIdValidator,
  updateBookingStatusValidator,
  validationMiddleware,
  bookingController.updateBookingStatus.bind(bookingController)
);

router.patch(
  '/:id/payment',
  protect,
  restrictTo('organizer', 'admin'),
  bookingIdValidator,
  updatePaymentStatusValidator,
  validationMiddleware,
  bookingController.updatePaymentStatus.bind(bookingController)
);

// Quick actions for bookings
router.patch(
  '/:id/confirm',
  protect,
  restrictTo('artist'),
  bookingIdValidator,
  validationMiddleware,
  bookingController.confirmBooking.bind(bookingController)
);

router.patch(
  '/:id/reject',
  protect,
  restrictTo('artist'),
  bookingIdValidator,
  validationMiddleware,
  bookingController.rejectBooking.bind(bookingController)
);

router.patch(
  '/:id/cancel',
  protect,
  bookingIdValidator,
  validationMiddleware,
  bookingController.cancelBooking.bind(bookingController)
);

router.patch(
  '/:id/complete',
  protect,
  restrictTo('organizer', 'admin'),
  bookingIdValidator,
  validationMiddleware,
  bookingController.completeBooking.bind(bookingController)
);

export default router;