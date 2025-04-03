import { Router } from 'express';
import { EventController } from '../../controllers/EventController';
import { createEventValidator, updateEventValidator, eventIdValidator, searchEventsValidator } from '../../validators/eventValidator';
import { protect, restrictTo } from '../../middleware/auth';
import { validationMiddleware } from '../../middleware/validator';

const router = Router();

router.post(
  '/',
  protect,
  restrictTo('organizer', 'admin'),
  createEventValidator,
  validationMiddleware,
  EventController.createEvent
);

router.get(
  '/',
  searchEventsValidator,
  validationMiddleware,
  EventController.searchEvents
);

router.get(
  '/my-events',
  protect,
  restrictTo('organizer', 'admin'),
  EventController.getMyEvents
);

router.get(
  '/:id',
  eventIdValidator,
  validationMiddleware,
  EventController.getEventById
);

router.put(
  '/:id',
  protect,
  restrictTo('organizer', 'admin'),
  updateEventValidator,
  validationMiddleware,
  EventController.updateEvent
);

router.patch(
  '/:id/publish',
  protect,
  restrictTo('organizer', 'admin'),
  eventIdValidator,
  validationMiddleware,
  EventController.publishEvent
);

router.patch(
  '/:id/cancel',
  protect,
  restrictTo('organizer', 'admin'),
  eventIdValidator,
  validationMiddleware,
  EventController.cancelEvent
);

export default router;