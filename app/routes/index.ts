import { Router } from 'express';
import { AppError } from '../middleware/errorHandler';
import { upload } from '../config/upload';
import { AuthController } from '../controllers/AuthController';
import { registerValidator, loginValidator, upgradeToAdminValidator, upgradeToOrganizerValidator, artistProfileValidator } from '../validators/authValidator';
import { protect, restrictTo } from '../middleware/auth';
import { validationMiddleware } from '../middleware/validator';
import { ArtistController } from '../controllers/ArtistController';
import { EventController } from '../controllers/EventController';
import { createEventValidator, updateEventValidator, eventIdValidator, searchEventsValidator } from '../validators/eventValidator';
import { BookingController } from '../controllers/BookingController';
import { createBookingValidator, bookingIdValidator, updateBookingStatusValidator, updatePaymentStatusValidator, getBookingsValidator } from '../validators/bookingValidator';

const router = Router();

router.get('/', (req, res) => {
  res.send('Music Booking API is active and ready to serve!');
});

// Auth routes
router.post(
  '/auth/register',
  registerValidator,
  validationMiddleware,
  AuthController.register
);

router.post(
  '/auth/login',
  loginValidator,
  validationMiddleware,
  AuthController.login
);

router.get(
  '/auth/me',
  protect,
  AuthController.getProfile
);

router.post(
  '/auth/user/upgrade',
  protect,
  restrictTo('admin'),
  upgradeToAdminValidator,
  validationMiddleware,
  AuthController.upgrade
);

// router.post(
//   '/auth/upgrade-to-organizer',
//   protect,
//   upgradeToOrganizerValidator,
//   validationMiddleware,
//   AuthController.upgradeToOrganizer
// );

// Artist routes
router.post(
  '/artists/profile',
  protect,
  artistProfileValidator,
  validationMiddleware,
  ArtistController.createProfile
);

router.get(
  '/artists/profile',
  protect,
  ArtistController.getMyArtistProfile
);

router.put(
  '/artists/profile',
  protect,
  restrictTo('artist'),
  artistProfileValidator,
  validationMiddleware,
  ArtistController.updateMyProfile
);

router.get(
  '/artists',
  ArtistController.searchArtists
);

router.get(
  '/artists/:id',
  ArtistController.getArtistById
);

// Event routes
router.post(
  '/events',
  protect,
  restrictTo('organizer', 'admin'),
  createEventValidator,
  validationMiddleware,
  EventController.createEvent
);

router.get(
  '/events',
  searchEventsValidator,
  validationMiddleware,
  EventController.searchEvents
);

router.get(
  '/events/my-events',
  protect,
  restrictTo('organizer', 'admin'),
  EventController.getMyEvents
);

router.get(
  '/events/:id',
  eventIdValidator,
  validationMiddleware,
  EventController.getEventById
);

router.put(
  '/events/:id',
  protect,
  restrictTo('organizer', 'admin'),
  updateEventValidator,
  validationMiddleware,
  EventController.updateEvent
);

router.patch(
  '/events/:id/publish',
  protect,
  restrictTo('organizer', 'admin'),
  eventIdValidator,
  validationMiddleware,
  EventController.publishEvent
);

router.patch(
  '/events/:id/cancel',
  protect,
  restrictTo('organizer', 'admin'),
  eventIdValidator,
  validationMiddleware,
  EventController.cancelEvent
);

// Booking routes
router.post(
  '/bookings',
  protect,
  restrictTo('organizer', 'admin'),
  createBookingValidator,
  validationMiddleware,
  BookingController.createBooking
);

router.get(
  '/bookings/:id',
  protect,
  bookingIdValidator,
  validationMiddleware,
  BookingController.getBookingById
);

// Artist bookings
router.get(
  '/bookings/artist',
  protect,
  restrictTo('artist'),
  getBookingsValidator,
  validationMiddleware,
  BookingController.getArtistBookings
);

// Organizer bookings
router.get(
  '/bookings/organizer',
  protect,
  restrictTo('organizer', 'admin'),
  getBookingsValidator,
  validationMiddleware,
  BookingController.getOrganizerBookings
);

// Booking status updates
router.patch(
  '/bookings/:id/status',
  protect,
  bookingIdValidator,
  updateBookingStatusValidator,
  validationMiddleware,
  BookingController.updateBookingStatus
);

router.patch(
  '/bookings/:id/payment',
  protect,
  restrictTo('organizer', 'admin'),
  bookingIdValidator,
  updatePaymentStatusValidator,
  validationMiddleware,
  BookingController.updatePaymentStatus
);

// Quick actions for bookings
router.patch(
  '/bookings/:id/confirm',
  protect,
  restrictTo('artist'),
  bookingIdValidator,
  validationMiddleware,
  BookingController.confirmBooking
);

router.patch(
  '/bookings/:id/reject',
  protect,
  restrictTo('artist'),
  bookingIdValidator,
  validationMiddleware,
  BookingController.rejectBooking
);

router.patch(
  '/bookings/:id/cancel',
  protect,
  bookingIdValidator,
  validationMiddleware,
  BookingController.cancelBooking
);

router.patch(
  '/bookings/:id/complete',
  protect,
  restrictTo('organizer', 'admin'),
  bookingIdValidator,
  validationMiddleware,
  BookingController.completeBooking
);

// Handle 404 - Route not found
router.use((req, res, next) => {
  const error = new AppError('Route not Found', 404);
  next(error);
});

export default router;