import { Request, Response, NextFunction } from 'express';
import AuthService from '../services/AuthService';
import { LoginCredentials, RegisterUserInput, UpgradeUserInput } from '../interfaces/auth.interface';

class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  /**
   * Register a new user
   */
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const registrationData: RegisterUserInput = req.body;

      const result = await this.authService.register(registrationData);

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
      const loginCredentials: LoginCredentials = req.body;

      const result = await this.authService.login(loginCredentials);

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
  async upgradeTo(req: Request, res: Response, next: NextFunction) {
    try {
      const upgradeInput: UpgradeUserInput = req.body;

      const updatedUser = await this.authService.upgradeTo(upgradeInput);

      res.status(200).json({
        success: true,
        message: 'User role upgraded successfully',
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

export default AuthController;