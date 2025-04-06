import { Router } from 'express';
import AuthController from '../../controllers/AuthController';
import { registerValidator, loginValidator, upgradeToAdminValidator, upgradeToOrganizerValidator } from '../../validators/authValidator';
import { protect, restrictTo } from '../../middleware/auth';
import { validationMiddleware } from '../../middleware/validator';

const router = Router();
const authController = new AuthController();

router.post(
  '/register',
  registerValidator,
  validationMiddleware,
  authController.register.bind(authController)
);

router.post(
  '/login',
  loginValidator,
  validationMiddleware,
  authController.login.bind(authController)
);

router.get(
  '/me',
  protect,
  authController.getProfile.bind(authController)
);

router.post(
  '/user/upgrade',
  protect,
  restrictTo('admin'),
  upgradeToAdminValidator,
  validationMiddleware,
  authController.upgradeTo.bind(authController)
);

export default router;