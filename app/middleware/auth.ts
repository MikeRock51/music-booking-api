import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import User, { IUser } from "../models/User";
import { jwtPayload } from "../interfaces/jwtPayload";
import { AppError } from "./errorHandler";

// Secret key for JWT verification - should be in environment variables in production
const JWT_SECRET = process.env.JWT_SECRET as string;

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}

/**
 * Middleware to protect routes - verifies JWT token and attaches user to request
 */
export const protect = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    let token: string | undefined;

    // Get token from Authorization header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    // Check if token exists
    if (!token) {
      throw new AppError("Unauthorized, missing token", 401);
    }

    const decoded = jwt.verify(token, JWT_SECRET) as jwtPayload;

    // Get user from database
    const user = await User.findById(decoded.id);

    if (!user) {
      throw new AppError("Unauthorized, user not found", 404);
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    if (!(error instanceof AppError)) {
      error = new AppError("Unauthorized", 401);
    }
    next(error);
  }
};

/**
 * Middleware to restrict access to specific roles
 */
export const restrictTo = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new AppError("Unauthorized, please login", 401);
    }

    if (!roles.includes(req.user.role)) {
      throw new AppError(
        `Unauthorized, you do not have permission to perform this action`,
        403
      );
    }

    next();
  };
};
