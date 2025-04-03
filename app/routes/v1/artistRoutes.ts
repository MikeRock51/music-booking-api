import { Router } from 'express';
import { ArtistController } from '../../controllers/ArtistController';
import { artistProfileValidator, updateArtistProfileValidator } from '../../validators/artistValidator';
import { protect, restrictTo } from '../../middleware/auth';
import { validationMiddleware } from '../../middleware/validator';

const router = Router();

router.post(
  '/profile',
  protect,
  artistProfileValidator,
  validationMiddleware,
  ArtistController.createProfile
);

router.get(
  '/profile',
  protect,
  ArtistController.getMyArtistProfile
);

router.put(
  '/profile',
  protect,
  restrictTo('artist'),
  updateArtistProfileValidator,
  validationMiddleware,
  ArtistController.updateMyProfile
);

router.get(
  '/',
  ArtistController.searchArtists
);

router.get(
  '/:id',
  ArtistController.getArtistById
);

export default router;