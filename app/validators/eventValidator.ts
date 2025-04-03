import { body, param, query } from 'express-validator';
import { EventType } from '../models/Event';

export const createEventValidator = [
  body('name')
    .notEmpty()
    .withMessage('Event name is required')
    .trim(),
  body('description')
    .notEmpty()
    .withMessage('Event description is required'),
  body('eventType')
    .notEmpty()
    .withMessage('Event type is required')
    .isIn(Object.values(EventType))
    .withMessage('Invalid event type'),
  body('date.start')
    .notEmpty()
    .withMessage('Event start date is required')
    .isISO8601()
    .withMessage('Start date must be a valid date'),
  body('date.end')
    .notEmpty()
    .withMessage('Event end date is required')
    .isISO8601()
    .withMessage('End date must be a valid date')
    .custom((value, { req }) => {
      if (new Date(value) <= new Date(req.body.date.start)) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),
  body('venue')
    .notEmpty()
    .withMessage('Venue is required')
    .isMongoId()
    .withMessage('Invalid venue ID format'),
  body('ticketInfo.price')
    .notEmpty()
    .withMessage('Ticket price is required')
    .isNumeric()
    .withMessage('Ticket price must be a number')
    .custom((value) => value >= 0)
    .withMessage('Ticket price must be greater than or equal to zero'),
  body('ticketInfo.totalTickets')
    .notEmpty()
    .withMessage('Total tickets count is required')
    .isInt({ min: 1 })
    .withMessage('Total tickets must be at least 1'),
  body('featuredArtists')
    .optional()
    .isArray()
    .withMessage('Featured artists must be an array'),
  body('featuredArtists.*')
    .optional()
    .isMongoId()
    .withMessage('Invalid artist ID format'),
  body('isPrivate')
    .optional()
    .isBoolean()
    .withMessage('isPrivate must be a boolean')
];

export const updateEventValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid event ID format'),
  body('name')
    .optional()
    .notEmpty()
    .withMessage('Event name cannot be empty')
    .trim(),
  body('description')
    .optional()
    .notEmpty()
    .withMessage('Event description cannot be empty'),
  body('eventType')
    .optional()
    .isIn(Object.values(EventType))
    .withMessage('Invalid event type'),
  body('date.start')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid date'),
  body('date.end')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid date')
    .custom((value, { req }) => {
      if (req.body.date && req.body.date.start && new Date(value) <= new Date(req.body.date.start)) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),
  body('venue')
    .optional()
    .isMongoId()
    .withMessage('Invalid venue ID format'),
  body('ticketInfo.price')
    .optional()
    .isNumeric()
    .withMessage('Ticket price must be a number')
    .custom((value) => value >= 0)
    .withMessage('Ticket price must be greater than or equal to zero'),
  body('ticketInfo.totalTickets')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Total tickets must be at least 1'),
  body('featuredArtists')
    .optional()
    .isArray()
    .withMessage('Featured artists must be an array'),
  body('featuredArtists.*')
    .optional()
    .isMongoId()
    .withMessage('Invalid artist ID format'),
  body('isPrivate')
    .optional()
    .isBoolean()
    .withMessage('isPrivate must be a boolean')
];

export const eventIdValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid event ID format')
];

export const searchEventsValidator = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid date'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid date'),
  query('eventType')
    .optional()
    .isIn(Object.values(EventType))
    .withMessage('Invalid event type'),
  query('minPrice')
    .optional()
    .isNumeric()
    .withMessage('Minimum price must be a number')
    .custom((value) => value >= 0)
    .withMessage('Minimum price must be greater than or equal to zero'),
  query('maxPrice')
    .optional()
    .isNumeric()
    .withMessage('Maximum price must be a number')
    .custom((value) => value >= 0)
    .withMessage('Maximum price must be greater than or equal to zero'),
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