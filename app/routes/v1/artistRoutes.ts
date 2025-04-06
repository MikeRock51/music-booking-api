import { Router } from 'express';
import ArtistController from '../../controllers/ArtistController';
import { artistProfileValidator, updateArtistProfileValidator } from '../../validators/artistValidator';
import { protect, restrictTo } from '../../middleware/auth';
import { validationMiddleware } from '../../middleware/validator';
import { upload } from '../../config/upload';
import { AppError, handleMultipartBoundryError } from '../../middleware/errorHandler';

const router = Router();
const artistController = new ArtistController();

router.post(
  '/profile',
  protect,
  artistProfileValidator,
  validationMiddleware,
  artistController.createProfile.bind(artistController)
);

router.get(
  '/profile',
  protect,
  artistController.getMyArtistProfile.bind(artistController)
);

router.put(
  '/profile',
  protect,
  restrictTo('artist'),
  updateArtistProfileValidator,
  validationMiddleware,
  artistController.updateMyProfile.bind(artistController)
);

router.post(
  '/portfolio/images',
  protect,
  restrictTo('artist'),
  handleMultipartBoundryError,
  upload.array('images', 10),
  artistController.uploadPortfolioImages.bind(artistController)
);

router.get(
  '/',
  artistController.findArtists.bind(artistController)
);

router.get(
  '/:id',
  artistController.getArtistById.bind(artistController)
);

export default router;