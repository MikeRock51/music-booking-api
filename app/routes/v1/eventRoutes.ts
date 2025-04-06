import { Router } from 'express';
import EventController from '../../controllers/EventController';
import { createEventValidator, updateEventValidator, eventIdValidator, searchEventsValidator } from '../../validators/eventValidator';
import { protect, restrictTo } from '../../middleware/auth';
import { validationMiddleware } from '../../middleware/validator';

const router = Router();
const eventController = new EventController();

router.post(
  '/',
  protect,
  restrictTo('organizer', 'admin'),
  createEventValidator,
  validationMiddleware,
  eventController.createEvent.bind(eventController)
);

router.get(
  '/',
  searchEventsValidator,
  validationMiddleware,
  eventController.findEvents.bind(eventController)
);

router.get(
  '/my-events',
  protect,
  restrictTo('organizer', 'admin'),
  eventController.getMyEvents.bind(eventController)
);

router.get(
  '/:id',
  eventIdValidator,
  validationMiddleware,
  eventController.getEventById.bind(eventController)
);

router.put(
  '/:id',
  protect,
  restrictTo('organizer', 'admin'),
  updateEventValidator,
  validationMiddleware,
  eventController.updateEvent.bind(eventController)
);

router.patch(
  '/:id/publish',
  protect,
  restrictTo('organizer', 'admin'),
  eventIdValidator,
  validationMiddleware,
  eventController.publishEvent.bind(eventController)
);

router.patch(
  '/:id/cancel',
  protect,
  restrictTo('organizer', 'admin'),
  eventIdValidator,
  validationMiddleware,
  eventController.cancelEvent.bind(eventController)
);

export default router;