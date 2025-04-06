import { Router } from 'express';
import VenueController from '../../controllers/VenueController';
import { createVenueValidator, updateVenueValidator, venueIdValidator, searchVenuesValidator } from '../../validators/venueValidator';
import { protect, restrictTo } from '../../middleware/auth';
import { validationMiddleware } from '../../middleware/validator';
import { upload } from '../../config/upload';
import { AppError, handleMultipartBoundryError } from '../../middleware/errorHandler';

const router = Router();
const venueController = new VenueController();

router.post(
  '/',
  protect,
  restrictTo('organizer', 'admin'),
  createVenueValidator,
  validationMiddleware,
  venueController.createVenue.bind(venueController)
);

router.get(
  '/',
  searchVenuesValidator,
  validationMiddleware,
  venueController.findVenues.bind(venueController)
);

router.get(
  '/my-venues',
  protect,
  venueController.getMyVenues.bind(venueController)
);

router.get(
  '/:id',
  venueIdValidator,
  validationMiddleware,
  venueController.getVenueById.bind(venueController)
);

router.put(
  '/:id',
  protect,
  updateVenueValidator,
  validationMiddleware,
  venueController.updateVenue.bind(venueController)
);

router.delete(
  '/:id',
  protect,
  venueIdValidator,
  validationMiddleware,
  venueController.deleteVenue.bind(venueController)
);

router.post(
  '/:id/images',
  protect,
  venueIdValidator,
  handleMultipartBoundryError,
  upload.array('images', 10),
  validationMiddleware,
  venueController.uploadVenueImages.bind(venueController)
);

router.patch(
  '/:id/verify',
  protect,
  restrictTo('admin'),
  venueIdValidator,
  validationMiddleware,
  venueController.verifyVenue.bind(venueController)
);

export default router;