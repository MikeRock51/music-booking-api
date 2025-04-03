import { Request, Response, NextFunction } from 'express';
import AuthService from '../services/AuthService';

class AuthControllerClass {
  /**
   * Register a new user
   */
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, firstName, lastName } = req.body;

      const result = await AuthService.register({
        email,
        password,
        firstName,
        lastName,
      });

      res.status(201).json({
        success: true,
        data: result
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Login a user
   */
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;

      const result = await AuthService.login({
        email,
        password
      });

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Get current user profile
   */
  async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;

      res.status(200).json({
        success: true,
        data: user
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Upgrade a user's role to admin
   * Only accessible by admin users
   */
  async upgradeToAdmin(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.body;

      const updatedUser = await AuthService.upgradeToAdmin(userId);

      res.status(200).json({
        success: true,
        message: 'User role upgraded to admin successfully',
        data: {
          id: updatedUser._id,
          email: updatedUser.email,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          role: updatedUser.role
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

export const AuthController = new AuthControllerClass();