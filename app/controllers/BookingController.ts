import { Request, Response, NextFunction } from "express";
import BookingService from "../services/BookingService";
import ArtistService from "../services/ArtistService";
import { BookingStatus } from "../models/Booking";
import { CreateBookingInput } from "../interfaces/booking.interface";
import { ObjectId } from "mongoose";

class BookingController {
  private bookingService: BookingService;
  private artistService: ArtistService;

  constructor() {
    this.bookingService = new BookingService();
    this.artistService = new ArtistService();
  }

  /**
   * Create a new booking
   */
  async createBooking(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user._id;
      const bookingData: CreateBookingInput = req.body;

      const booking = await this.bookingService.createBooking(
        userId,
        bookingData
      );

      res.status(201).json({
        success: true,
        message: "Booking created successfully",
        data: booking,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get booking by ID
   */
  async getBookingById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const booking = await this.bookingService.getBookingById(id);

      res.status(200).json({
        success: true,
        data: booking,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update booking status
   */
  async updateBookingStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const user = req.user;
      const { status } = req.body;

      const booking = await this.bookingService.updateBookingStatus(
        id,
        user,
        status
      );

      res.status(200).json({
        success: true,
        message: `Booking status updated to ${status}`,
        data: booking,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update payment status
   */
  async updatePaymentStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user._id;
      const paymentData = req.body;

      const booking = await this.bookingService.updatePaymentStatus(
        id,
        userId,
        paymentData
      );

      res.status(200).json({
        success: true,
        message: `Payment status updated to ${paymentData.status}`,
        data: booking,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get bookings for an artist
   */
  async getArtistBookings(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user._id;
      const { status, startDate, endDate, page = 1, limit = 10 } = req.query;

      // Get artist profile by user ID
      const artist = await this.artistService.getArtistByUserId(userId);

      const filters: any = {};
      if (status) filters.status = status;
      if (startDate) filters.startDate = startDate;
      if (endDate) filters.endDate = endDate;

      const bookings = await this.bookingService.getArtistBookings(
        (artist._id as ObjectId).toString(),
        filters,
        Number(page),
        Number(limit)
      );

      res.status(200).json({
        success: true,
        data: {
          results: bookings,
          page: Number(page),
          limit: Number(limit)
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get organizer's bookings
   */
  async getOrganizerBookings(req: Request, res: Response, next: NextFunction) {
    try {
      const organizerId = req.user._id;
      const {
        status,
        startDate,
        endDate,
        eventId,
        page = 1,
        limit = 10,
      } = req.query;

      const filters: any = {};
      if (status) filters.status = status;
      if (startDate) filters.startDate = startDate;
      if (endDate) filters.endDate = endDate;
      if (eventId) filters.eventId = eventId;

      const bookings = await this.bookingService.getOrganizerBookings(
        organizerId,
        filters,
        Number(page),
        Number(limit)
      );

      res.status(200).json({
        success: true,
        data: {
          results: bookings,
          page: Number(page),
          limit: Number(limit)
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Confirm a booking (artist accepting a booking request)
   */
  async confirmBooking(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const user = req.user;

      const booking = await this.bookingService.updateBookingStatus(
        id,
        user,
        BookingStatus.CONFIRMED
      );

      res.status(200).json({
        success: true,
        message: "Booking confirmed successfully",
        data: booking,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reject a booking (artist rejecting a booking request)
   */
  async rejectBooking(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const user = req.user;

      const booking = await this.bookingService.updateBookingStatus(
        id,
        user,
        BookingStatus.REJECTED
      );

      res.status(200).json({
        success: true,
        message: "Booking rejected",
        data: booking,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cancel a booking
   */
  async cancelBooking(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const user = req.user;

      const booking = await this.bookingService.updateBookingStatus(
        id,
        user,
        BookingStatus.CANCELED
      );

      res.status(200).json({
        success: true,
        message: "Booking canceled successfully",
        data: booking,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Complete a booking (after performance is done)
   */
  async completeBooking(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const user = req.user;

      const booking = await this.bookingService.updateBookingStatus(
        id,
        user,
        BookingStatus.COMPLETED
      );

      res.status(200).json({
        success: true,
        message: "Booking marked as completed",
        data: booking,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all bookings (admin only)
   */
  async getAllBookings(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        status,
        startDate,
        endDate,
        eventId,
        artistId,
        page = 1,
        limit = 10
      } = req.query;

      const filters: any = {};
      if (status) filters.status = status;
      if (startDate) filters.startDate = startDate;
      if (endDate) filters.endDate = endDate;
      if (eventId) filters.eventId = eventId;
      if (artistId) filters.artistId = artistId;

      const bookings = await this.bookingService.getAllBookings(
        filters,
        Number(page),
        Number(limit)
      );

      res.status(200).json({
        success: true,
        data: bookings,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default BookingController;
