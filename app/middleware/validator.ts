import { body, param, query, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';

// Middleware to check validation results
export const validate = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => `${err.msg}`).join(', ');
    return next(new AppError(errorMessages, 400));
  }
  next();
};

// Export the validation middleware with an alternative name for consistency
export const validationMiddleware = validate;

// Product validation rules
export const productValidationRules = {
  create: [
    body('name')
      .not().isEmpty().withMessage('Product name is required')
      .trim()
      .escape()
      .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),

    body('description')
      .optional()
      .trim()
      .escape()
      .isLength({ max: 1000 }).withMessage('Description cannot exceed 1000 characters'),

    body('price')
      .not().isEmpty().withMessage('Price is required')
      .isFloat({ min: 0 }).withMessage('Price must be a positive number')
      .toFloat(),

    body('stock')
      .optional()
      .isInt({ min: 0 }).withMessage('Stock must be a positive integer')
      .toInt(),

    body('category')
      .optional()
      .trim()
      .escape()
      .toLowerCase()
      .isLength({ min: 2, max: 50 }).withMessage('Category must be between 2 and 50 characters'),

    body('tags')
      .optional()
      .isArray().withMessage('Tags must be an array of strings')
      .customSanitizer(value => {
        if (Array.isArray(value)) {
          return value.map(tag => require('validator').escape(String(tag).trim().toLowerCase()));
        }
        return value;
      }),

    validate
  ],

  update: [
    param('id')
      .not().isEmpty().withMessage('Product ID is required')
      .trim()
      .escape(),

    body('name')
      .optional()
      .trim()
      .escape()
      .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),

    body('description')
      .optional()
      .trim()
      .escape()
      .isLength({ max: 1000 }).withMessage('Description cannot exceed 1000 characters'),

    body('price')
      .optional()
      .isFloat({ min: 0 }).withMessage('Price must be a positive number')
      .toFloat(),

    body('stock')
      .optional()
      .isInt({ min: 0 }).withMessage('Stock must be a positive integer')
      .toInt(),

    body('category')
      .optional()
      .trim()
      .escape()
      .toLowerCase()
      .isLength({ min: 2, max: 50 }).withMessage('Category must be between 2 and 50 characters'),

    body('tags')
      .optional()
      .isArray().withMessage('Tags must be an array of strings')
      .customSanitizer(value => {
        if (Array.isArray(value)) {
          return value.map(tag => require('validator').escape(String(tag).trim().toLowerCase()));
        }
        return value;
      }),

    validate
  ],

  getById: [
    param('id')
      .not().isEmpty().withMessage('Product ID is required')
      .trim()
      .escape(),

    validate
  ],

  getAll: [
    query('page')
      .optional()
      .isInt({ min: 1 }).withMessage('Page must be a positive integer')
      .toInt(),

    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
      .toInt(),

    query('minPrice')
      .optional()
      .isFloat({ min: 0 }).withMessage('Minimum price must be a positive number')
      .toFloat(),

    query('maxPrice')
      .optional()
      .isFloat({ min: 0 }).withMessage('Maximum price must be a positive number')
      .toFloat(),

    query('minStock')
      .optional()
      .isInt({ min: 0 }).withMessage('Minimum stock must be a non-negative integer')
      .toInt(),

    query('search')
      .optional()
      .trim()
      .escape(),

    query('category')
      .optional()
      .trim()
      .escape()
      .toLowerCase(),

    query('tags')
      .optional()
      .customSanitizer(value => {
        if (Array.isArray(value)) {
          return value.map(tag => require('validator').escape(String(tag).trim().toLowerCase()));
        } else if (value) {
          return [require('validator').escape(String(value).trim().toLowerCase())];
        }
        return value;
      }),

    validate
  ],

  delete: [
    param('id')
      .not().isEmpty().withMessage('Product ID is required')
      .trim()
      .escape(),

    validate
  ]
};