import mongoose, { ObjectId } from "mongoose";
import { initializeDatabase, closeDatabase } from "../../app/config/database";
import User, { UserRole } from "../../app/models/User";
import Artist from "../../app/models/Artist";
import Event, { EventStatus, EventType } from "../../app/models/Event";
import Venue, { VenueType } from "../../app/models/Venue";
import Booking, { BookingStatus, PaymentStatus } from "../../app/models/Booking";
import BookingService from "../../app/services/BookingService";
import { CreateBookingInput } from "../../app/interfaces/booking.interface";
import {
  createTestUser,
  testArtistData,
} from "../helpers";
import "dotenv/config";

describe("Booking Service", () => {
  let artistUser: any;
  let organizerUser: any;
  let adminUser: any;
  let testArtist: any;
  let testEvent: any;
  let testBooking: any;
  let testVenue: any;
  let bookingService: BookingService;

  beforeAll(async () => {
    await initializeDatabase();
    bookingService = new BookingService();
  });

  afterAll(async () => {
    await User.deleteMany({ email: /@bookingservicetest.com/ });
    await Artist.deleteMany({ user: artistUser._id });
    await Event.deleteMany({ organizer: organizerUser._id });
    await Venue.deleteMany({ owner: organizerUser._id });
    await Booking.deleteMany({ event: testEvent._id });
    await closeDatabase();
  });

  beforeEach(async () => {
    // Create test users
    artistUser = await createTestUser({
      email: `artist${Date.now()}@bookingservicetest.com`,
      password: "Password123!",
      firstName: "Test",
      lastName: "Artist",
      role: UserRole.ARTIST,
    });

    organizerUser = await createTestUser({
      email: `organizer${Date.now()}@bookingservicetest.com`,
      password: "Password123!",
      firstName: "Test",
      lastName: "Organizer",
      role: UserRole.ORGANIZER,
    });

    adminUser = await createTestUser({
      email: `admin${Date.now()}@bookingservicetest.com`,
      password: "Password123!",
      firstName: "Test",
      lastName: "Admin",
      role: UserRole.ADMIN,
    });

    // Create artist profile
    const artistData = {
      ...testArtistData,
      user: artistUser._id,
    };
    testArtist = await Artist.create(artistData);

    // Create test venue
    testVenue = await Venue.create({
      name: "Test Venue",
      location: {
        address: "123 Test Street",
        city: "Test City",
        state: "Test State",
        country: "Test Country",
        zipCode: "12345"
      },
      capacity: 500,
      venueType: VenueType.CLUB,
      amenities: ["Sound System", "Stage Lighting"],
      images: ["test-image.jpg"],
      description: "A test venue for events",
      contactInfo: {
        email: "venue@test.com",
        phone: "123-456-7890"
      },
      owner: organizerUser._id,
      isVerified: true
    });

    // Create test event
    const startDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 1 week in future
    const endDate = new Date(startDate.getTime() + 8 * 60 * 60 * 1000); // 8 hours after start

    testEvent = await Event.create({
      name: "Test Event",
      description: "A test event for booking",
      date: {
        start: startDate,
        end: endDate
      },
      venue: testVenue._id,
      organizer: organizerUser._id,
      eventType: EventType.CONCERT,
      status: EventStatus.PUBLISHED,
      ticketInfo: {
        available: true,
        price: 25,
        currency: "USD",
        totalTickets: 200,
        soldTickets: 0
      },
      images: ["test-event.jpg"],
      isPrivate: false
    });

    // Create a test booking
    const bookingStartTime = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hour after event starts
    const bookingEndTime = new Date(bookingStartTime.getTime() + 2 * 60 * 60 * 1000); // 2 hours after booking starts

    testBooking = await Booking.create({
      artist: testArtist._id,
      event: testEvent._id,
      bookedBy: organizerUser._id,
      bookingDetails: {
        startTime: bookingStartTime,
        endTime: bookingEndTime,
        setDuration: 120, // 2 hours in minutes
        specialRequirements: "Test requirements",
      },
      payment: {
        amount: 500,
        currency: "USD",
        status: PaymentStatus.PENDING,
      },
      status: BookingStatus.PENDING,
    });
  });

  afterEach(async () => {
    await User.deleteMany({ email: /@bookingservicetest.com/ });
    await Artist.deleteMany({ user: artistUser._id });
    await Event.deleteMany({ organizer: organizerUser._id });
    await Venue.deleteMany({ owner: organizerUser._id });
    await Booking.deleteMany({ event: testEvent._id });
  });

  describe("createBooking", () => {
    it("should create a new booking successfully", async () => {
      const bookingStartTime = new Date(testEvent.date.start.getTime() + 3 * 60 * 60 * 1000); // 3 hours after event starts
      const bookingEndTime = new Date(bookingStartTime.getTime() + 2 * 60 * 60 * 1000); // 2 hours after booking starts

      const bookingData: CreateBookingInput = {
        artist: testArtist._id.toString(),
        event: testEvent._id.toString(),
        bookingDetails: {
          startTime: bookingStartTime,
          endTime: bookingEndTime,
          setDuration: 120, // 2 hours in minutes
          specialRequirements: "New test requirements",
        },
        payment: {
          amount: 800,
          currency: "USD",
        },
        notes: "Test notes",
      };

      const result = await bookingService.createBooking(
        organizerUser._id.toString(),
        bookingData
      );

      expect(result).toBeDefined();
      expect(result.artist._id.toString()).toBe(testArtist._id.toString());
      expect(result.event._id.toString()).toBe(testEvent._id.toString());
      expect(result.bookedBy.toString()).toBe(organizerUser._id.toString());
      expect(result.status).toBe(BookingStatus.PENDING);
      expect(result.payment.amount).toBe(800);
    });

    it("should throw error if event not found", async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const bookingData: CreateBookingInput = {
        artist: testArtist._id.toString(),
        event: nonExistentId,
        bookingDetails: {
          startTime: new Date(testEvent.date.start.getTime() + 60 * 60 * 1000),
          endTime: new Date(testEvent.date.start.getTime() + 3 * 60 * 60 * 1000),
          setDuration: 120,
        },
        payment: {
          amount: 500,
          currency: "USD",
        },
      };

      await expect(
        bookingService.createBooking(organizerUser._id.toString(), bookingData)
      ).rejects.toThrow("Event not found");
    });

    it("should throw error if artist not found", async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const bookingData: CreateBookingInput = {
        artist: nonExistentId,
        event: testEvent._id.toString(),
        bookingDetails: {
          startTime: new Date(testEvent.date.start.getTime() + 60 * 60 * 1000),
          endTime: new Date(testEvent.date.start.getTime() + 3 * 60 * 60 * 1000),
          setDuration: 120,
        },
        payment: {
          amount: 500,
          currency: "USD",
        },
      };

      await expect(
        bookingService.createBooking(organizerUser._id.toString(), bookingData)
      ).rejects.toThrow("Artist not found");
    });

    it("should throw error if booking time is outside event time", async () => {
      const bookingStartTime = new Date(testEvent.date.start.getTime() - 60 * 60 * 1000); // 1 hour before event starts
      const bookingEndTime = new Date(bookingStartTime.getTime() + 2 * 60 * 60 * 1000);

      const bookingData: CreateBookingInput = {
        artist: testArtist._id.toString(),
        event: testEvent._id.toString(),
        bookingDetails: {
          startTime: bookingStartTime,
          endTime: bookingEndTime,
          setDuration: 120,
        },
        payment: {
          amount: 500,
          currency: "USD",
        },
      };

      await expect(
        bookingService.createBooking(organizerUser._id.toString(), bookingData)
      ).rejects.toThrow("Booking time must be within event start and end time");
    });

    it("should throw error if there's a conflicting booking", async () => {
      const bookingData: CreateBookingInput = {
        artist: testArtist._id.toString(),
        event: testEvent._id.toString(),
        bookingDetails: {
          startTime: testBooking.bookingDetails.startTime,
          endTime: testBooking.bookingDetails.endTime,
          setDuration: 120,
        },
        payment: {
          amount: 500,
          currency: "USD",
        },
      };

      await expect(
        bookingService.createBooking(organizerUser._id.toString(), bookingData)
      ).rejects.toThrow("Artist already has a booking during this time");
    });
  });

  describe("getBookingById", () => {
    it("should get a booking by ID", async () => {
      const result = await bookingService.getBookingById(testBooking._id.toString());

      expect(result).toBeDefined();
      expect((result._id as ObjectId).toString()).toBe(testBooking._id.toString());
    });

    it("should throw error if booking not found", async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();

      await expect(bookingService.getBookingById(nonExistentId)).rejects.toThrow(
        "Booking not found"
      );
    });
  });

  describe("updateBookingStatus", () => {
    it("should update booking status as artist", async () => {
      const result = await bookingService.updateBookingStatus(
        testBooking._id.toString(),
        { _id: artistUser._id.toString(), role: UserRole.ARTIST } as any,
        BookingStatus.CONFIRMED
      );

      expect(result).toBeDefined();
      expect(result.status).toBe(BookingStatus.CONFIRMED);
    });

    it("should update booking status as organizer", async () => {
      const result = await bookingService.updateBookingStatus(
        testBooking._id.toString(),
        { _id: organizerUser._id.toString(), role: UserRole.ORGANIZER } as any,
        BookingStatus.CANCELED
      );

      expect(result).toBeDefined();
      expect(result.status).toBe(BookingStatus.CANCELED);
    });

    it("should update booking status as admin", async () => {
      const result = await bookingService.updateBookingStatus(
        testBooking._id.toString(),
        { _id: adminUser._id.toString(), role: UserRole.ADMIN } as any,
        BookingStatus.COMPLETED
      );

      expect(result).toBeDefined();
      expect(result.status).toBe(BookingStatus.COMPLETED);
    });

    it("should throw error if user is not authorized", async () => {
      const unauthorizedUser = await createTestUser({
        email: `unauthorized${Date.now()}@bookingservicetest.com`,
        password: "Password123!",
        firstName: "Unauthorized",
        lastName: "User",
        role: UserRole.USER,
      });

      await expect(
        bookingService.updateBookingStatus(
          testBooking._id.toString(),
          { _id: (unauthorizedUser._id as ObjectId).toString(), role: UserRole.USER } as any,
          BookingStatus.CONFIRMED
        )
      ).rejects.toThrow("You are not authorized to update this booking");
    });

    it("should throw error if trying to update a canceled booking", async () => {
      // Create a special booking with canceled status
      const canceledBooking = await Booking.create({
        artist: testArtist._id,
        event: testEvent._id,
        bookedBy: organizerUser._id,
        bookingDetails: {
          startTime: new Date(testEvent.date.start.getTime() + 120 * 60 * 1000),
          endTime: new Date(testEvent.date.start.getTime() + 240 * 60 * 1000),
          setDuration: 120,
          specialRequirements: "Test requirements",
        },
        payment: {
          amount: 500,
          currency: "USD",
          status: PaymentStatus.PENDING,
        },
        status: BookingStatus.CANCELED,
      });

      await expect(
        bookingService.updateBookingStatus(
          (canceledBooking as any)._id.toString(),
          { _id: adminUser._id.toString(), role: UserRole.ADMIN } as any,
          BookingStatus.CONFIRMED
        )
      ).rejects.toThrow("Cannot update a canceled booking");
    });

    it("should throw error if trying to update a completed booking to non-canceled status", async () => {
      // Create a special booking with completed status
      const completedBooking = await Booking.create({
        artist: testArtist._id,
        event: testEvent._id,
        bookedBy: organizerUser._id,
        bookingDetails: {
          startTime: new Date(testEvent.date.start.getTime() + 120 * 60 * 1000),
          endTime: new Date(testEvent.date.start.getTime() + 240 * 60 * 1000),
          setDuration: 120,
          specialRequirements: "Test requirements",
        },
        payment: {
          amount: 500,
          currency: "USD",
          status: PaymentStatus.PAID,
        },
        status: BookingStatus.COMPLETED,
      });

      await expect(
        bookingService.updateBookingStatus(
          (completedBooking as any)._id.toString(),
          { _id: adminUser._id.toString(), role: UserRole.ADMIN } as any,
          BookingStatus.CONFIRMED
        )
      ).rejects.toThrow("Completed booking cannot be updated");
    });
  });

  describe("updatePaymentStatus", () => {
    it("should update payment status as booking organizer", async () => {
      const result = await bookingService.updatePaymentStatus(
        testBooking._id.toString(),
        organizerUser._id.toString(),
        { status: PaymentStatus.PAID }
      );

      expect(result).toBeDefined();
      expect(result.payment.status).toBe(PaymentStatus.PAID);
    });

    it("should update deposit paid status", async () => {
      const result = await bookingService.updatePaymentStatus(
        testBooking._id.toString(),
        organizerUser._id.toString(),
        { status: PaymentStatus.PARTIALLY_PAID, depositPaid: true }
      );

      expect(result).toBeDefined();
      expect(result.payment.status).toBe(PaymentStatus.PARTIALLY_PAID);
      expect(result.payment.depositPaid).toBe(true);
    });

    it("should throw error if user is not authorized", async () => {
      await expect(
        bookingService.updatePaymentStatus(
          testBooking._id.toString(),
          artistUser._id.toString(), // Not the booker
          { status: PaymentStatus.PAID }
        )
      ).rejects.toThrow("You are not authorized to update this payment");
    });
  });

  describe("getArtistBookings", () => {
    it("should get bookings for an artist", async () => {
      const results = await bookingService.getArtistBookings(
        testArtist._id.toString(),
        {},
        1,
        10
      );

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].artist.toString()).toBe(testArtist._id.toString());
    });

    it("should filter bookings by status", async () => {
      const results = await bookingService.getArtistBookings(
        testArtist._id.toString(),
        { status: BookingStatus.PENDING },
        1,
        10
      );

      expect(Array.isArray(results)).toBe(true);

      const allPending = results.every(booking => booking.status === BookingStatus.PENDING);
      expect(allPending).toBe(true);
    });

    it("should filter bookings by date range", async () => {
      const startDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000); // 5 days in future
      const endDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000); // 10 days in future

      const results = await bookingService.getArtistBookings(
        testArtist._id.toString(),
        { startDate, endDate },
        1,
        10
      );

      expect(Array.isArray(results)).toBe(true);

      const allInDateRange = results.every(
        booking =>
          booking.bookingDetails.startTime >= startDate &&
          booking.bookingDetails.endTime <= endDate
      );

      expect(allInDateRange).toBe(true);
    });
  });

  describe("getOrganizerBookings", () => {
    it("should get bookings for an organizer", async () => {
      const results = await bookingService.getOrganizerBookings(
        organizerUser._id.toString(),
        {},
        1,
        10
      );

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].bookedBy.toString()).toBe(organizerUser._id.toString());
    });

    it("should filter organizer bookings by status", async () => {
      const results = await bookingService.getOrganizerBookings(
        organizerUser._id.toString(),
        { status: BookingStatus.PENDING },
        1,
        10
      );

      expect(Array.isArray(results)).toBe(true);

      const allPending = results.every(booking => booking.status === BookingStatus.PENDING);
      expect(allPending).toBe(true);
    });

    it("should filter organizer bookings by event", async () => {
      const results = await bookingService.getOrganizerBookings(
        organizerUser._id.toString(),
        { eventId: testEvent._id.toString() },
        1,
        10
      );

      expect(Array.isArray(results)).toBe(true);

      // Check that results contain at least one booking and all match the event
      expect(results.length).toBeGreaterThan(0);
      const allForEvent = results.every(
        booking => booking.event._id.toString() === testEvent._id.toString()
      );
      expect(allForEvent).toBe(true);
    });
  });

  describe("getAllBookings", () => {
    it("should get all bookings", async () => {
      const results = await bookingService.getAllBookings({}, 1, 10);

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
    });

    it("should filter all bookings by status", async () => {
      const results = await bookingService.getAllBookings(
        { status: BookingStatus.PENDING },
        1,
        10
      );

      expect(Array.isArray(results)).toBe(true);

      const allPending = results.every(booking => booking.status === BookingStatus.PENDING);
      expect(allPending).toBe(true);
    });

    it("should filter all bookings by artist", async () => {
      const results = await bookingService.getAllBookings(
        { artistId: testArtist._id.toString() },
        1,
        10
      );

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);

      const allForArtist = results.every(
        booking => booking.artist._id.toString() === testArtist._id.toString()
      );
      expect(allForArtist).toBe(true);
    });

    it("should filter all bookings by event", async () => {
      const results = await bookingService.getAllBookings(
        { eventId: testEvent._id.toString() },
        1,
        10
      );

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);

      const allForEvent = results.every(
        booking => booking.event._id.toString() === testEvent._id.toString()
      );
      expect(allForEvent).toBe(true);
    });

    it("should filter all bookings by date range", async () => {
      const startDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000); // 5 days in future
      const endDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000); // 10 days in future

      const results = await bookingService.getAllBookings(
        { startDate, endDate },
        1,
        10
      );

      expect(Array.isArray(results)).toBe(true);

      const allInDateRange = results.every(
        booking =>
          booking.bookingDetails.startTime >= startDate &&
          booking.bookingDetails.endTime <= endDate
      );

      expect(allInDateRange).toBe(true);
    });
  });
});