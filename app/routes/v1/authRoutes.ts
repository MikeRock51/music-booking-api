import { Router } from 'express';
import { AuthController } from '../../controllers/AuthController';
import { registerValidator, loginValidator, upgradeToAdminValidator, upgradeToOrganizerValidator } from '../../validators/authValidator';
import { protect, restrictTo } from '../../middleware/auth';
import { validationMiddleware } from '../../middleware/validator';

const router = Router();

router.post(
  '/register',
  registerValidator,
  validationMiddleware,
  AuthController.register
);

router.post(
  '/login',
  loginValidator,
  validationMiddleware,
  AuthController.login
);

router.get(
  '/me',
  protect,
  AuthController.getProfile
);

router.post(
  '/user/upgrade',
  protect,
  restrictTo('admin'),
  upgradeToAdminValidator,
  validationMiddleware,
  AuthController.upgradeTo
);

export default router;