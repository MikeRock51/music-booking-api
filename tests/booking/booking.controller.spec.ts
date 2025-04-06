import request from "supertest";
import mongoose from "mongoose";
import { Express } from "express";
import { createApp } from "../../app/createApp";
import { initializeDatabase, closeDatabase } from "../../app/config/database";
import User, { UserRole } from "../../app/models/User";
import Artist from "../../app/models/Artist";
import Event, { EventStatus } from "../../app/models/Event";
import Booking, { BookingStatus, PaymentStatus } from "../../app/models/Booking";
import {
  createTestUser,
  createTestArtist,
  createToken,
  testArtistData,
  testArtistUserData,
  testUserData,
} from "../helpers";
import "dotenv/config";
import Venue, { VenueType } from "../../app/models/Venue";

describe("Booking Controller", () => {
  let app: Express;
  let artistUser: any;
  let organizerUser: any;
  let adminUser: any;
  let testArtist: any;
  let testEvent: any;
  let testBooking: any;
  let artistToken: string;
  let organizerToken: string;
  let adminToken: string;
  let testVenue: any;

  beforeAll(async () => {
    await initializeDatabase();
    app = await createApp();
  });

  afterAll(async () => {
    await User.deleteMany({ email: /@bookingtest.com/ });
    await Artist.deleteMany({ user: artistUser._id });
    await Venue.deleteMany({ owner: organizerUser._id });
    await Event.deleteMany({ organizer: organizerUser._id });
    await Booking.deleteMany({ event: testEvent._id });
    await closeDatabase();
  });

  beforeEach(async () => {
    // Create test users
    artistUser = await createTestUser({
      email: `artist${Date.now()}@bookingtest.com`,
      password: "Password123!",
      firstName: "Test",
      lastName: "Artist",
      role: UserRole.ARTIST,
    });

    organizerUser = await createTestUser({
      email: `organizer${Date.now()}@bookingtest.com`,
      password: "Password123!",
      firstName: "Test",
      lastName: "Organizer",
      role: UserRole.ORGANIZER,
    });

    adminUser = await createTestUser({
      email: `admin${Date.now()}@bookingtest.com`,
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
    testArtist = await createTestArtist(artistData);

    testVenue = await Venue.create({
        name: "Test Venue for Events",
        location: {
          address: "123 Test Street",
          city: "Test City",
          state: "Test State",
          country: "Test Country",
          zipCode: "12345",
        },
        capacity: 1000,
        venueType: VenueType.CONCERT_HALL,
        description: "A test venue for event testing",
        contactInfo: {
          email: "venue@testmail.com",
          phone: "+1234567890",
        },
        owner: organizerUser._id,
      });

    // Create test event
    testEvent = await Event.create({
      name: "Test Event",
      description: "A test event for booking",
      date: {
        start: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week in future
        end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000), // 3 hours after start
      },
      venue: testVenue._id,
      location: "Test Location",
      organizer: organizerUser._id,
      eventType: "concert",
      ticketInfo: {
        totalTickets: 100,
        price: 50,
      },
      status: EventStatus.PUBLISHED,
    });

    // Create a test booking
    testBooking = await Booking.create({
      artist: testArtist._id,
      event: testEvent._id,
      bookedBy: organizerUser._id,
      bookingDetails: {
        startTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week in future
        endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000), // 2 hours after start
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

    // Generate tokens
    artistToken = createToken(artistUser);
    organizerToken = createToken(organizerUser);
    adminToken = createToken(adminUser);
  });

  afterEach(async () => {
    await User.deleteMany({ email: /@bookingtest.com/ });
    await Artist.deleteMany({ user: artistUser._id });
    await Venue.deleteMany({ owner: organizerUser._id });
    await Event.deleteMany({ organizer: organizerUser._id });
    await Booking.deleteMany({ event: testEvent._id });
  });

  describe("POST /bookings", () => {
    it("should create a new booking when authenticated as organizer", async () => {
      // Create a different event with a different date to avoid booking conflicts
      const differentEvent = await Event.create({
        name: "Test Event 2",
        description: "A second test event for non-conflicting booking",
        date: {
          start: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 weeks in future
          end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000), // 3 hours after start
        },
        venue: testVenue._id,
        location: "Test Location",
        organizer: organizerUser._id,
        eventType: "concert",
        ticketInfo: {
          totalTickets: 100,
          price: 50,
        },
        status: EventStatus.PUBLISHED,
      }) as any; // Type assertion to handle the _id property

      const bookingData = {
        artist: testArtist._id.toString(),
        event: differentEvent._id.toString(),
        bookingDetails: {
          startTime: differentEvent.date.start,
          endTime: differentEvent.date.end,
          setDuration: 180,
          specialRequirements: "New testing requirements",
        },
        payment: {
          amount: 800,
          currency: "USD",
        },
        notes: "Test booking notes",
      };

      const response = await request(app)
        .post("/v1/bookings")
        .set("Authorization", `Bearer ${organizerToken}`)
        .send(bookingData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Booking created successfully");
      expect(response.body.data).toHaveProperty("artist._id", testArtist._id.toString());
      expect(response.body.data).toHaveProperty("event._id", differentEvent._id.toString());
      expect(response.body.data).toHaveProperty("status", BookingStatus.PENDING);
      expect(response.body.data.payment).toHaveProperty("amount", 800);

      // Clean up the additional event
      await Event.deleteMany({ _id: differentEvent._id });
    });

    it("should return 401 when not authenticated", async () => {
      const bookingData = {
        artist: testArtist._id.toString(),
        event: testEvent._id.toString(),
        bookingDetails: {
          startTime: new Date(),
          endTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
          setDuration: 120,
        },
        payment: {
          amount: 500,
          currency: "USD",
        },
      };

      const response = await request(app)
        .post("/v1/bookings")
        .send(bookingData);

      expect(response.status).toBe(401);
    });

    it("should return 403 when authenticated as artist", async () => {
      const bookingData = {
        artist: testArtist._id.toString(),
        event: testEvent._id.toString(),
        bookingDetails: {
          startTime: new Date(),
          endTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
          setDuration: 120,
        },
        payment: {
          amount: 500,
          currency: "USD",
        },
      };

      const response = await request(app)
        .post("/v1/bookings")
        .set("Authorization", `Bearer ${artistToken}`)
        .send(bookingData);

      expect(response.status).toBe(403);
    });

    it("should return 400 when validation fails", async () => {
      // Missing required fields
      const invalidBookingData = {
        artist: testArtist._id.toString(),
        // Missing event
        bookingDetails: {
          startTime: new Date(),
          // Missing endTime
          setDuration: 120,
        },
        // Missing payment
      };

      const response = await request(app)
        .post("/v1/bookings")
        .set("Authorization", `Bearer ${organizerToken}`)
        .send(invalidBookingData);

      expect(response.status).toBe(400);
    });
  });

  describe("GET /bookings/:id", () => {
    it("should get a booking by ID", async () => {
      const response = await request(app)
        .get(`/v1/bookings/${testBooking._id}`)
        .set("Authorization", `Bearer ${organizerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty("_id", testBooking._id.toString());
    });

    it("should return 404 for non-existent booking ID", async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const response = await request(app)
        .get(`/v1/bookings/${nonExistentId}`)
        .set("Authorization", `Bearer ${organizerToken}`);

      expect(response.status).toBe(404);
    });

    it("should return 400 for invalid booking ID format", async () => {
      const response = await request(app)
        .get("/v1/bookings/invalid-id-format")
        .set("Authorization", `Bearer ${organizerToken}`);

      expect(response.status).toBe(400);
    });
  });

  describe("GET /bookings/artist", () => {
    it("should get bookings for an artist when authenticated as artist", async () => {
      const response = await request(app)
        .get("/v1/bookings/artist")
        .set("Authorization", `Bearer ${artistToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.results)).toBe(true);
    });

    it("should filter artist bookings by status", async () => {
      const response = await request(app)
        .get(`/v1/bookings/artist?status=${BookingStatus.PENDING}`)
        .set("Authorization", `Bearer ${artistToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const allPending = response.body.data.results.every(
        (booking: any) => booking.status === BookingStatus.PENDING
      );
      expect(allPending).toBe(true);
    });

    it("should return 401 when not authenticated", async () => {
      const response = await request(app).get("/v1/bookings/artist");

      expect(response.status).toBe(401);
    });

    it("should return 403 when authenticated as non-artist", async () => {
      const response = await request(app)
        .get("/v1/bookings/artist")
        .set("Authorization", `Bearer ${organizerToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe("GET /bookings/organizer", () => {
    it("should get bookings for an organizer when authenticated as organizer", async () => {
      const response = await request(app)
        .get("/v1/bookings/organizer")
        .set("Authorization", `Bearer ${organizerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.results)).toBe(true);
    });

    it("should filter organizer bookings by status", async () => {
      const response = await request(app)
        .get(`/v1/bookings/organizer?status=${BookingStatus.PENDING}`)
        .set("Authorization", `Bearer ${organizerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const allPending = response.body.data.results.every(
        (booking: any) => booking.status === BookingStatus.PENDING
      );
      expect(allPending).toBe(true);
    });

    it("should return 401 when not authenticated", async () => {
      const response = await request(app).get("/v1/bookings/organizer");

      expect(response.status).toBe(401);
    });

    it("should return 403 when authenticated as non-organizer", async () => {
      const response = await request(app)
        .get("/v1/bookings/organizer")
        .set("Authorization", `Bearer ${artistToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe("GET /bookings", () => {
    it("should get all bookings when authenticated as admin", async () => {
      const response = await request(app)
        .get("/v1/bookings")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.results)).toBe(true);
    });

    it("should filter all bookings by status", async () => {
      const response = await request(app)
        .get(`/v1/bookings?status=${BookingStatus.PENDING}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const allPending = response.body.data.results.every(
        (booking: any) => booking.status === BookingStatus.PENDING
      );
      expect(allPending).toBe(true);
    });

    it("should return 401 when not authenticated", async () => {
      const response = await request(app).get("/v1/bookings");

      expect(response.status).toBe(401);
    });

    it("should return 403 when authenticated as non-admin", async () => {
      const response = await request(app)
        .get("/v1/bookings")
        .set("Authorization", `Bearer ${artistToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe("PATCH /bookings/:id/status", () => {
    it("should update booking status when authorized", async () => {
      const response = await request(app)
        .patch(`/v1/bookings/${testBooking._id}/status`)
        .set("Authorization", `Bearer ${artistToken}`)
        .send({ status: BookingStatus.CONFIRMED });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty("status", BookingStatus.CONFIRMED);
    });

    it("should return 401 when not authenticated", async () => {
      const response = await request(app)
        .patch(`/v1/bookings/${testBooking._id}/status`)
        .send({ status: BookingStatus.CONFIRMED });

      expect(response.status).toBe(401);
    });

    it("should return 400 when validation fails", async () => {
      const response = await request(app)
        .patch(`/v1/bookings/${testBooking._id}/status`)
        .set("Authorization", `Bearer ${artistToken}`)
        .send({ status: "invalid-status" });

      expect(response.status).toBe(400);
    });
  });

  describe("PATCH /bookings/:id/payment", () => {
    it("should update payment status when authenticated as organizer", async () => {
      const response = await request(app)
        .patch(`/v1/bookings/${testBooking._id}/payment`)
        .set("Authorization", `Bearer ${organizerToken}`)
        .send({ status: PaymentStatus.PAID });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.payment).toHaveProperty("status", PaymentStatus.PAID);
    });

    it("should return 401 when not authenticated", async () => {
      const response = await request(app)
        .patch(`/v1/bookings/${testBooking._id}/payment`)
        .send({ status: PaymentStatus.PAID });

      expect(response.status).toBe(401);
    });

    it("should return 403 when authenticated as artist", async () => {
      const response = await request(app)
        .patch(`/v1/bookings/${testBooking._id}/payment`)
        .set("Authorization", `Bearer ${artistToken}`)
        .send({ status: PaymentStatus.PAID });

      expect(response.status).toBe(403);
    });
  });

  describe("PATCH /bookings/:id/confirm", () => {
    it("should confirm booking when authenticated as artist", async () => {
      const response = await request(app)
        .patch(`/v1/bookings/${testBooking._id}/confirm`)
        .set("Authorization", `Bearer ${artistToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty("status", BookingStatus.CONFIRMED);
    });

    it("should return 401 when not authenticated", async () => {
      const response = await request(app)
        .patch(`/v1/bookings/${testBooking._id}/confirm`);

      expect(response.status).toBe(401);
    });

    it("should return 403 when authenticated as organizer", async () => {
      const response = await request(app)
        .patch(`/v1/bookings/${testBooking._id}/confirm`)
        .set("Authorization", `Bearer ${organizerToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe("PATCH /bookings/:id/reject", () => {
    it("should reject booking when authenticated as artist", async () => {
      const response = await request(app)
        .patch(`/v1/bookings/${testBooking._id}/reject`)
        .set("Authorization", `Bearer ${artistToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty("status", BookingStatus.REJECTED);
    });

    it("should return 401 when not authenticated", async () => {
      const response = await request(app)
        .patch(`/v1/bookings/${testBooking._id}/reject`);

      expect(response.status).toBe(401);
    });
  });

  describe("PATCH /bookings/:id/cancel", () => {
    it("should cancel booking when authenticated", async () => {
      const response = await request(app)
        .patch(`/v1/bookings/${testBooking._id}/cancel`)
        .set("Authorization", `Bearer ${organizerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty("status", BookingStatus.CANCELED);
    });

    it("should return 401 when not authenticated", async () => {
      const response = await request(app)
        .patch(`/v1/bookings/${testBooking._id}/cancel`);

      expect(response.status).toBe(401);
    });
  });

  describe("PATCH /bookings/:id/complete", () => {
    it("should complete booking when authenticated as organizer", async () => {
      const response = await request(app)
        .patch(`/v1/bookings/${testBooking._id}/complete`)
        .set("Authorization", `Bearer ${organizerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty("status", BookingStatus.COMPLETED);
    });

    it("should return 401 when not authenticated", async () => {
      const response = await request(app)
        .patch(`/v1/bookings/${testBooking._id}/complete`);

      expect(response.status).toBe(401);
    });

    it("should return 403 when authenticated as artist", async () => {
      const response = await request(app)
        .patch(`/v1/bookings/${testBooking._id}/complete`)
        .set("Authorization", `Bearer ${artistToken}`);

      expect(response.status).toBe(403);
    });
  });
});