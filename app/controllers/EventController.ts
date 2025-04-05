import { Request, Response, NextFunction } from 'express';
import EventService from '../services/EventService';

class EventControllerClass {
  /**
   * Create a new event
   */
  async createEvent(req: Request, res: Response, next: NextFunction) {
    try {
      const organizerId = req.user._id;
      const eventData = req.body;

      const event = await EventService.createEvent(organizerId, eventData);

      res.status(201).json({
        success: true,
        message: 'Event created successfully',
        data: event
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get event by ID
   */
  async getEventById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const event = await EventService.getEventById(id);

      res.status(200).json({
        success: true,
        data: event
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update an event
   */
  async updateEvent(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const organizer = req.user;
      const updateData = req.body;

      const updatedEvent = await EventService.updateEvent(id, organizer, updateData);

      res.status(200).json({
        success: true,
        message: 'Event updated successfully',
        data: updatedEvent
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Publish an event
   */
  async publishEvent(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const organizerId = req.user._id;

      const publishedEvent = await EventService.publishEvent(id, organizerId);

      res.status(200).json({
        success: true,
        message: 'Event published successfully',
        data: publishedEvent
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cancel an event
   */
  async cancelEvent(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const organizerId = req.user._id;

      const canceledEvent = await EventService.cancelEvent(id, organizerId);

      res.status(200).json({
        success: true,
        message: 'Event canceled successfully',
        data: canceledEvent
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get organizer's events
   */
  async getMyEvents(req: Request, res: Response, next: NextFunction) {
    try {
      const organizerId = req.user._id;
      const { page = 1, limit = 10 } = req.query;

      const events = await EventService.getOrganizerEvents(
        organizerId,
        Number(page),
        Number(limit)
      );

      res.status(200).json({
        success: true,
        data: events
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Search events with filters
   */
  async findEvents(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        startDate,
        endDate,
        location,
        eventType,
        venueType,
        minPrice,
        maxPrice,
        artistId,
        page = 1,
        limit = 10
      } = req.query;

      const filters: any = {};

      if (startDate) filters.startDate = startDate;
      if (endDate) filters.endDate = endDate;
      if (location) filters.location = location;
      if (eventType) filters.eventType = eventType;
      if (venueType) filters.venueType = venueType;
      if (minPrice) filters.minPrice = minPrice;
      if (maxPrice) filters.maxPrice = maxPrice;
      if (artistId) filters.artistId = artistId;

      const events = await EventService.findEvents(
        filters,
        Number(page),
        Number(limit)
      );

      res.status(200).json({
        success: true,
        data: events
      });
    } catch (error) {
      next(error);
    }
  }
}

export const EventController = new EventControllerClass();