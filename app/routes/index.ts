import { ProductController } from '../controllers/ProductController';
import { Router } from 'express';
import { AppError } from '../middleware/errorHandler';
import { upload } from '../config/upload';
import { AuthController } from '../controllers/AuthController';
import { registerValidator, loginValidator, upgradeToAdminValidator } from '../validators/authValidator';
import { protect, restrictTo } from '../middleware/auth';
import { validationMiddleware } from '../validators';

const router = Router();

router.get('/', (req, res) => {
  res.send('Server is active and ready to serve!');
});


// Auth routes
router.post(
  '/auth/register',
  registerValidator,
  validationMiddleware,
  AuthController.register
);

router.post(
  '/auth/login',
  loginValidator,
  validationMiddleware,
  AuthController.login
);

router.get(
  '/auth/me',
  protect,
  AuthController.getProfile
);

router.post(
  '/auth/upgrade',
  protect,
  restrictTo('admin'),
  upgradeToAdminValidator,
  validationMiddleware,
  AuthController.upgradeToAdmin
);

router.post('/products',
  protect,
  upload.array('images', 10),
  productValidationRules.create,
  ProductController.createProduct
);

router.get('/products',
  productValidationRules.getAll,
  ProductController.getAllProducts
);

router.get('/products/:id',
  productValidationRules.getById,
  ProductController.getProductById
);

router.put('/products/:id',
  protect,
  upload.array('images', 10),
  productValidationRules.update,
  ProductController.updateProduct
);

router.delete('/products/:id',
  protect,
  restrictTo('admin'),
  productValidationRules.delete,
  ProductController.deleteProduct
);


router.use((req, res, next) => {
  const error = new AppError('Route not Found', 404);
  next(error);
});

export default router;