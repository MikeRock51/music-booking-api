import Event, { IEvent, EventStatus } from "../models/Event";
import { AppError } from "../middleware/errorHandler";
import mongoose from "mongoose";
import Venue from "../models/Venue";

class EventService {
  /**
   * Create a new event
   * @param organizerId - User ID of the organizer
   * @param eventData - Event data
   */
  async createEvent(organizerId: string, eventData: any): Promise<IEvent> {
    // Verify venue exists
    const venue = await Venue.findById(eventData.venue);
    if (!venue) {
      throw new AppError("Venue not found", 404);
    }

    try {
      // Create the event
      const event = await Event.create({
        ...eventData,
        organizer: organizerId,
      });

      return event;
    } catch (error: any) {
      // Check for duplicate key error (MongoDB error code 11000)
      if (error.code === 11000 && error.keyPattern) {
        throw new AppError(
          "An event with the same name at this venue and date already exists.",
          409
        );
      }
      // Re-throw other errors
      throw error;
    }
  }

  /**
   * Get event by ID
   * @param eventId - Event ID
   */
  async getEventById(eventId: string): Promise<IEvent> {
    const event = await Event.findById(eventId)
      .populate("venue")
      .populate("organizer", "firstName lastName email")
      .populate("featuredArtists");

    if (!event) {
      throw new AppError("Event not found", 404);
    }

    return event;
  }

  /**
   * Update an event
   * @param eventId - Event ID
   * @param organizerId - User ID of the organizer (for authorization)
   * @param updateData - Event update data
   */
  async updateEvent(
    eventId: string,
    organizerId: string,
    updateData: any
  ): Promise<IEvent> {
    // Check if event exists and belongs to the organizer
    const event = await Event.findOne({
      _id: eventId,
      organizer: organizerId,
    });

    if (!event) {
      throw new AppError(
        "Event not found or you are not authorized to update it",
        404
      );
    }

    // If venue is being updated, verify it exists
    if (updateData.venue) {
      const venue = await Venue.findById(updateData.venue);
      if (!venue) {
        throw new AppError("Venue not found", 404);
      }
    }

    try {
      // Update the event
      const updatedEvent = await Event.findByIdAndUpdate(eventId, updateData, {
        new: true,
        runValidators: true,
      })
        .populate("venue")
        .populate("organizer", "firstName lastName email")
        .populate("featuredArtists");

      if (!updatedEvent) {
        throw new AppError("Failed to update event", 500);
      }

      return updatedEvent;
    } catch (error: any) {
      // Check for duplicate key error (MongoDB error code 11000)
      if (error.code === 11000 && error.keyPattern) {
        throw new AppError(
          " event with the same name at this venue and date already exists.",
          409
        );
      }
      // Re-throw other errors
      throw error;
    }
  }

  /**
   * Publish an event (change status from DRAFT to PUBLISHED)
   * @param eventId - Event ID
   * @param organizerId - User ID of the organizer (for authorization)
   */
  async publishEvent(eventId: string, organizerId: string): Promise<IEvent> {
    const event = await Event.findOne({
      _id: eventId,
      organizer: organizerId,
    });

    if (!event) {
      throw new AppError(
        "Event not found or you are not authorized to update it",
        404
      );
    }

    if (event.status === EventStatus.PUBLISHED) {
      throw new AppError("Event is already published", 400);
    }

    event.status = EventStatus.PUBLISHED;
    await event.save();

    return event;
  }

  /**
   * Cancel an event
   * @param eventId - Event ID
   * @param organizerId - User ID of the organizer (for authorization)
   */
  async cancelEvent(eventId: string, organizerId: string): Promise<IEvent> {
    const event = await Event.findOne({
      _id: eventId,
      organizer: organizerId,
    });

    if (!event) {
      throw new AppError(
        "Event not found or you are not authorized to cancel it",
        404
      );
    }

    if (event.status === EventStatus.CANCELED) {
      throw new AppError("Event is already canceled", 400);
    }

    event.status = EventStatus.CANCELED;
    await event.save();

    return event;
  }

  /**
   * List events created by a specific organizer
   * @param organizerId - User ID of the organizer
   * @param page - Page number for pagination
   * @param limit - Number of results per page
   */
  async getOrganizerEvents(
    organizerId: string,
    page = 1,
    limit = 10
  ): Promise<IEvent[]> {
    const skip = (page - 1) * limit;

    const events = await Event.find({ organizer: organizerId })
      .sort({ "date.start": 1 })
      .skip(skip)
      .limit(limit)
      .populate("venue", "name location")
      .populate("featuredArtists", "artistName");

    return events;
  }

  /**
   * Search events with filters
   * @param filters - Search filters
   * @param page - Page number for pagination
   * @param limit - Number of results per page
   */
  async findEvents(
    filters: any,
    page = 1,
    limit = 10
  ): Promise<IEvent[]> {
    const query: any = {
      status: EventStatus.PUBLISHED,
      isPrivate: false,
    };

    // Date filters
    if (filters.startDate) {
      query["date.start"] = { $gte: new Date(filters.startDate) };
    }

    if (filters.endDate) {
      query["date.end"] = { $lte: new Date(filters.endDate) };
    }

    // Location filter (will search in venue's city or address)
    if (filters.location) {
      // First find venues in the location
      const venues = await Venue.find({
        $or: [
          { "location.city": { $regex: filters.location, $options: "i" } },
          { "location.address": { $regex: filters.location, $options: "i" } },
        ],
      }).select("_id");

      const venueIds = venues.map((v) => v._id);
      query.venue = { $in: venueIds };
    }

    // Event type filter
    if (filters.eventType) {
      query.eventType = filters.eventType;
    }

    // Venue type filter
    if (filters.venueType) {
      // Find venues of the specified type
      const venues = await Venue.find({ venueType: filters.venueType }).select(
        "_id"
      );
      const venueIds = venues.map((v) => v._id);
      query.venue = { $in: venueIds };
    }

    // Price range filter
    if (filters.minPrice || filters.maxPrice) {
      if (filters.minPrice) {
        query["ticketInfo.price"] = { $gte: Number(filters.minPrice) };
      }

      if (filters.maxPrice) {
        query["ticketInfo.price"] = {
          ...query["ticketInfo.price"],
          $lte: Number(filters.maxPrice),
        };
      }
    }

    // Featured artist filter
    if (filters.artistId) {
      query.featuredArtists = { $in: [filters.artistId] };
    }

    const skip = (page - 1) * limit;

    const events = await Event.find(query)
      .sort({ "date.start": 1 })
      .skip(skip)
      .limit(limit)
      .populate("venue", "name location venueType")
      .populate("organizer", "firstName lastName")
      .populate("featuredArtists", "artistName genres");

    return events;
  }
}

export default new EventService();
