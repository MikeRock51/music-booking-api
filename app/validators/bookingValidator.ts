import { body, param, query } from 'express-validator';
import { BookingStatus, PaymentStatus } from '../models/Booking';

export const createBookingValidator = [
  body('artist')
    .notEmpty()
    .withMessage('Artist ID is required')
    .isMongoId()
    .withMessage('Invalid artist ID format'),
  body('event')
    .notEmpty()
    .withMessage('Event ID is required')
    .isMongoId()
    .withMessage('Invalid event ID format'),
  body('bookingDetails.startTime')
    .notEmpty()
    .withMessage('Start time is required')
    .isISO8601()
    .withMessage('Start time must be a valid date'),
  body('bookingDetails.endTime')
    .notEmpty()
    .withMessage('End time is required')
    .isISO8601()
    .withMessage('End time must be a valid date')
    .custom((value, { req }) => {
      if (new Date(value) <= new Date(req.body.bookingDetails.startTime)) {
        throw new Error('End time must be after start time');
      }
      return true;
    }),
  body('bookingDetails.setDuration')
    .notEmpty()
    .withMessage('Set duration is required')
    .isInt({ min: 1 })
    .withMessage('Set duration must be greater than 0 minutes'),
  body('payment.amount')
    .notEmpty()
    .withMessage('Payment amount is required')
    .isNumeric()
    .withMessage('Payment amount must be a number')
    .custom((value) => value > 0)
    .withMessage('Payment amount must be greater than zero'),
  body('payment.currency')
    .optional()
    .isString()
    .withMessage('Currency must be a string'),
  body('payment.depositAmount')
    .optional()
    .isNumeric()
    .withMessage('Deposit amount must be a number')
    .custom((value, { req }) => value < req.body.payment.amount)
    .withMessage('Deposit amount must be less than the total amount'),
  body('notes')
    .optional()
    .isString()
    .withMessage('Notes must be a string')
];

export const bookingIdValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid booking ID format')
];

export const updateBookingStatusValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid booking ID format'),
  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn(Object.values(BookingStatus))
    .withMessage('Invalid booking status')
];

export const updatePaymentStatusValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid booking ID format'),
  body('status')
    .notEmpty()
    .withMessage('Payment status is required')
    .isIn(Object.values(PaymentStatus))
    .withMessage('Invalid payment status'),
  body('depositPaid')
    .optional()
    .isBoolean()
    .withMessage('depositPaid must be a boolean value')
];

export const getBookingsValidator = [
  query('status')
    .optional()
    .isIn(Object.values(BookingStatus))
    .withMessage('Invalid booking status'),
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid date'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid date'),
  query('eventId')
    .optional()
    .isMongoId()
    .withMessage('Invalid event ID format'),
  query('artistId')
    .optional()
    .isMongoId()
    .withMessage('Invalid artist ID format'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be at least 1'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
];