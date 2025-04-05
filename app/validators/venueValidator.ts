import { body, param, query } from 'express-validator';
import { VenueType } from '../models/Venue';

// Validator for venue ID parameter
export const venueIdValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid venue ID format')
];

// Validator for creating a new venue
export const createVenueValidator = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Venue name is required')
    .isLength({ max: 100 })
    .withMessage('Venue name cannot exceed 100 characters'),

  body('location.address')
    .trim()
    .notEmpty()
    .withMessage('Address is required'),

  body('location.city')
    .trim()
    .notEmpty()
    .withMessage('City is required'),

  body('location.state')
    .trim()
    .notEmpty()
    .withMessage('State is required'),

  body('location.country')
    .trim()
    .notEmpty()
    .withMessage('Country is required'),

  body('location.zipCode')
    .trim()
    .notEmpty()
    .withMessage('ZIP code is required'),

  body('location.coordinates')
    .optional(),

  body('location.coordinates.latitude')
    .if(body('location.coordinates').exists())
    .isNumeric()
    .withMessage('Latitude must be a number'),

  body('location.coordinates.longitude')
    .if(body('location.coordinates').exists())
    .isNumeric()
    .withMessage('Longitude must be a number'),

  body('capacity')
    .isInt({ min: 1 })
    .withMessage('Capacity must be a positive integer'),

  body('venueType')
    .isIn(Object.values(VenueType))
    .withMessage(`Venue type must be one of: ${Object.values(VenueType).join(', ')}`),

  body('amenities')
    .optional()
    .isArray()
    .withMessage('Amenities must be an array of strings'),

  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required'),

  body('contactInfo.email')
    .trim()
    .notEmpty()
    .withMessage('Contact email is required')
    .isEmail()
    .withMessage('Valid email is required'),

  body('contactInfo.phone')
    .trim()
    .notEmpty()
    .withMessage('Contact phone is required'),

  body('contactInfo.website')
    .optional()
    .isURL()
    .withMessage('Website must be a valid URL')
];

// Validator for updating a venue
export const updateVenueValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid venue ID format'),

  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Venue name cannot be empty')
    .isLength({ max: 100 })
    .withMessage('Venue name cannot exceed 100 characters'),

  body('location.address')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Address cannot be empty'),

  body('location.city')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('City cannot be empty'),

  body('location.state')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('State cannot be empty'),

  body('location.country')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Country cannot be empty'),

  body('location.zipCode')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('ZIP code cannot be empty'),

  body('location.coordinates.latitude')
    .optional()
    .isNumeric()
    .withMessage('Latitude must be a number'),

  body('location.coordinates.longitude')
    .optional()
    .isNumeric()
    .withMessage('Longitude must be a number'),

  body('capacity')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Capacity must be a positive integer'),

  body('venueType')
    .optional()
    .isIn(Object.values(VenueType))
    .withMessage(`Venue type must be one of: ${Object.values(VenueType).join(', ')}`),

  body('amenities')
    .optional()
    .isArray()
    .withMessage('Amenities must be an array of strings'),

  body('description')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Description cannot be empty'),

  body('contactInfo.email')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Contact email cannot be empty')
    .isEmail()
    .withMessage('Valid email is required'),

  body('contactInfo.phone')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Contact phone cannot be empty'),

  body('contactInfo.website')
    .optional()
    .isURL()
    .withMessage('Website must be a valid URL'),

  body('isVerified')
    .optional()
    .isBoolean()
    .withMessage('isVerified must be a boolean value')
];

// Validator for searching venues
export const searchVenuesValidator = [
  query('name')
    .optional()
    .trim(),

  query('city')
    .optional()
    .trim(),

  query('state')
    .optional()
    .trim(),

  query('country')
    .optional()
    .trim(),

  query('venueType')
    .optional()
    .custom(value => {
      if (Array.isArray(value)) {
        const validValues = Object.values(VenueType);
        for (const type of value) {
          if (!validValues.includes(type)) {
            throw new Error(`Invalid venue type: ${type}`);
          }
        }
        return true;
      } else if (value && !Object.values(VenueType).includes(value)) {
        throw new Error(`Invalid venue type: ${value}`);
      }
      return true;
    }),

  query('minCapacity')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Minimum capacity must be a positive integer'),

  query('maxCapacity')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Maximum capacity must be a positive integer'),

  query('isVerified')
    .optional()
    .isBoolean()
    .withMessage('isVerified must be a boolean value'),

  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
];