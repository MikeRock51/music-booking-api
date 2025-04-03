import { validationResult } from "express-validator";
import { AppError } from "./errorHandler";
import { Request, Response, NextFunction } from "express";

// Middleware to check validation results
export const validate = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors
      .array()
      .map((err) => `${err.msg}`)
      .join(", ");
    return next(new AppError(errorMessages, 400));
  }
  next();
};


// Export the validation middleware with an alternative name for consistency
export const validationMiddleware = validate;