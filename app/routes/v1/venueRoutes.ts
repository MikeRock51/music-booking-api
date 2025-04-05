import { Router } from 'express';
import { VenueController } from '../../controllers/VenueController';
import { createVenueValidator, updateVenueValidator, venueIdValidator, searchVenuesValidator } from '../../validators/venueValidator';
import { protect, restrictTo } from '../../middleware/auth';
import { validationMiddleware } from '../../middleware/validator';
import { upload } from '../../config/upload';
import { AppError, handleMultipartBoundryError } from '../../middleware/errorHandler';

const router = Router();

router.post(
  '/',
  protect,
  restrictTo('organizer', 'admin'),
  createVenueValidator,
  validationMiddleware,
  VenueController.createVenue
);

router.get(
  '/',
  searchVenuesValidator,
  validationMiddleware,
  VenueController.findVenues
);

router.get(
  '/my-venues',
  protect,
  VenueController.getMyVenues
);

router.get(
  '/:id',
  venueIdValidator,
  validationMiddleware,
  VenueController.getVenueById
);

router.put(
  '/:id',
  protect,
  updateVenueValidator,
  validationMiddleware,
  VenueController.updateVenue
);

router.delete(
  '/:id',
  protect,
  venueIdValidator,
  validationMiddleware,
  VenueController.deleteVenue
);

router.post(
  '/:id/images',
  protect,
  venueIdValidator,
  handleMultipartBoundryError,
  upload.array('images', 10),
  validationMiddleware,
  VenueController.uploadVenueImages
);

router.patch(
  '/:id/verify',
  protect,
  restrictTo('admin'),
  venueIdValidator,
  validationMiddleware,
  VenueController.verifyVenue
);

export default router;