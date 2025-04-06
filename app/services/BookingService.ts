import Booking, {
  IBooking,
  BookingStatus,
  PaymentStatus,
} from "../models/Booking";
import Event from "../models/Event";
import Artist from "../models/Artist";
import { AppError } from "../middleware/errorHandler";
import { CreateBookingInput } from "../interfaces/booking.interface";
import { IUser } from "../models/User";

export class BookingService {
  /**
   * Create a new booking
   * @param userId - User ID making the booking
   * @param bookingData - Booking details
   */
  async createBooking(
    userId: string,
    bookingData: CreateBookingInput
  ): Promise<IBooking> {
    // Check if event exists
    const event = await Event.findById(bookingData.event);
    if (!event) {
      throw new AppError("Event not found", 404);
    }

    // Check if artist exists
    const artist = await Artist.findById(bookingData.artist);
    if (!artist) {
      throw new AppError("Artist not found", 404);
    }

    // Verify booking time is within event time
    const eventStart = new Date(event.date.start);
    const eventEnd = new Date(event.date.end);
    const bookingStart = new Date(bookingData.bookingDetails.startTime);
    const bookingEnd = new Date(bookingData.bookingDetails.endTime);

    if (bookingStart < eventStart || bookingEnd > eventEnd) {
      throw new AppError(
        "Booking time must be within event start and end time",
        400
      );
    }

    // Check for conflicting bookings for this artist
    const conflictingBooking = await Booking.findOne({
      artist: bookingData.artist,
      status: { $in: [BookingStatus.CONFIRMED, BookingStatus.PENDING] },
      $or: [
        {
          "bookingDetails.startTime": {
            $lt: bookingEnd,
            $gte: bookingStart,
          },
        },
        {
          "bookingDetails.endTime": {
            $gt: bookingStart,
            $lte: bookingEnd,
          },
        },
      ],
    });

    if (conflictingBooking) {
      throw new AppError("Artist already has a booking during this time", 400);
    }

    // Create the booking
    const booking = await Booking.create({
      ...bookingData,
      bookedBy: userId,
      status: BookingStatus.PENDING,
    });

    return booking.populate([
      { path: "artist", select: "artistName genres rate" },
      { path: "event", select: "name date venue" },
    ]);
  }

  /**
   * Get booking by ID with populated references
   * @param bookingId - Booking ID
   */
  async getBookingById(bookingId: string): Promise<IBooking> {
    const booking = await Booking.findById(bookingId)
      .populate("artist")
      .populate({
        path: "event",
        populate: { path: "venue" },
      })
      .populate("bookedBy", "firstName lastName email");

    if (!booking) {
      throw new AppError("Booking not found", 404);
    }

    return booking;
  }

  /**
   * Update booking status
   * @param bookingId - Booking ID
   * @param userId - User ID making the update (for authorization)
   * @param status - New booking status
   */
  async updateBookingStatus(
    bookingId: string,
    user: IUser,
    status: BookingStatus
  ): Promise<IBooking> {
    const booking = await this.getBookingById(bookingId);

    // Check authorization: only the artist or the organizer can update booking status
    const artist = await Artist.findById(booking.artist);
    if (!artist) {
      throw new AppError("Artist profile not found", 404);
    }

    if (
      artist.user.toString() !== user._id &&
      booking.bookedBy.toString() !== user._id &&
      user.role !== "admin"
    ) {
      throw new AppError("You are not authorized to update this booking", 403);
    }

    // Validate status change based on current status
    if (booking.status === BookingStatus.CANCELED) {
      throw new AppError("Cannot update a canceled booking", 400);
    }

    if (
      booking.status === BookingStatus.COMPLETED &&
      status !== BookingStatus.CANCELED
    ) {
      throw new AppError("Completed booking cannot be updated", 400);
    }

    // Update booking status
    booking.status = status;
    await booking.save();

    return booking;
  }

  /**
   * Update booking payment status
   * @param bookingId - Booking ID
   * @param userId - User ID making the update (for authorization)
   * @param paymentData - Payment update data
   */
  async updatePaymentStatus(
    bookingId: string,
    userId: string,
    paymentData: any
  ): Promise<IBooking> {
    const booking = await this.getBookingById(bookingId);

    // Check authorization: only the booker can update payment status
    if (booking.bookedBy.toString() !== userId) {
      throw new AppError("You are not authorized to update this payment", 403);
    }

    // Update payment details
    booking.payment.status = paymentData.status;

    if (paymentData.depositPaid !== undefined) {
      booking.payment.depositPaid = paymentData.depositPaid;
    }

    await booking.save();

    return booking;
  }

  /**
   * Get bookings for an artist
   * @param artistId - Artist ID
   * @param filters - Filters for bookings
   * @param page - Page number for pagination
   * @param limit - Number of results per page
   */
  async getArtistBookings(
    artistId: string,
    filters: any,
    page = 1,
    limit = 10
  ): Promise<IBooking[]> {
    const query: any = { artist: artistId };

    // Apply status filter
    if (filters.status) {
      query.status = filters.status;
    }

    // Apply date filters
    if (filters.startDate || filters.endDate) {
      query.bookingDetails = query.bookingDetails || {};

      if (filters.startDate) {
        query["bookingDetails.startTime"] = {
          $gte: new Date(filters.startDate),
        };
      }

      if (filters.endDate) {
        query["bookingDetails.endTime"] = { $lte: new Date(filters.endDate) };
      }
    }

    const skip = (page - 1) * limit;

    const bookings = await Booking.find(query)
      .sort({ "bookingDetails.startTime": 1 })
      .skip(skip)
      .limit(limit)
      .populate("event", "name date")
      .populate("bookedBy", "firstName lastName email");

    return bookings;
  }

  /**
   * Get bookings for an event organizer
   * @param organizerId - Organizer user ID
   * @param filters - Filters for bookings
   * @param page - Page number for pagination
   * @param limit - Number of results per page
   */
  async getOrganizerBookings(
    organizerId: string,
    filters: any,
    page = 1,
    limit = 10
  ): Promise<IBooking[]> {
    const query: any = { bookedBy: organizerId };

    // Apply status filter
    if (filters.status) {
      query.status = filters.status;
    }

    // Apply date filters
    if (filters.startDate || filters.endDate) {
      query.bookingDetails = query.bookingDetails || {};

      if (filters.startDate) {
        query["bookingDetails.startTime"] = {
          $gte: new Date(filters.startDate),
        };
      }

      if (filters.endDate) {
        query["bookingDetails.endTime"] = { $lte: new Date(filters.endDate) };
      }
    }

    // Filter by event
    if (filters.eventId) {
      query.event = filters.eventId;
    }

    const skip = (page - 1) * limit;

    const bookings = await Booking.find(query)
      .sort({ "bookingDetails.startTime": 1 })
      .skip(skip)
      .limit(limit)
      .populate("event", "name date")
      .populate("artist", "artistName genres rate");

    return bookings;
  }

  /**
   * Get all bookings in the system (admin only)
   * @param filters - Filters for bookings
   * @param page - Page number for pagination
   * @param limit - Number of results per page
   */
  async getAllBookings(
    filters: any,
    page = 1,
    limit = 10
  ): Promise<IBooking[]> {
    const query: any = {};

    // Apply status filter
    if (filters.status) {
      query.status = filters.status;
    }

    // Apply date filters
    if (filters.startDate || filters.endDate) {
      query.bookingDetails = query.bookingDetails || {};

      if (filters.startDate) {
        query["bookingDetails.startTime"] = {
          $gte: new Date(filters.startDate),
        };
      }

      if (filters.endDate) {
        query["bookingDetails.endTime"] = { $lte: new Date(filters.endDate) };
      }
    }

    // Filter by event
    if (filters.eventId) {
      query.event = filters.eventId;
    }

    // Filter by artist
    if (filters.artistId) {
      query.artist = filters.artistId;
    }

    const skip = (page - 1) * limit;
    const bookings = await Booking.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("event", "name date venue")
      .populate("artist", "artistName genres rate")
      .populate("bookedBy", "firstName lastName email");

    return bookings;
  }
}

export default BookingService;
