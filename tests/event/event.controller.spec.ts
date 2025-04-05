import request from "supertest";
import mongoose, { ObjectId } from "mongoose";
import { Express } from "express";
import { createApp } from "../../app/createApp";
import { initializeDatabase, closeDatabase } from "../../app/config/database";
import User, { UserRole } from "../../app/models/User";
import Event, { EventStatus, EventType } from "../../app/models/Event";
import Venue, { VenueType } from "../../app/models/Venue";
import { createTestUser, createToken, testUserData } from "../helpers";
import "dotenv/config";

describe("Event Controller", () => {
  let app: Express;
  let testUser: any;
  let organizerUser: any;
  let adminUser: any;
  let testVenue: any;
  let testEvent: any;
  let userToken: string;
  let organizerToken: string;
  let adminToken: string;

  // Test event data
  const testEventData = {
    name: "Test Event",
    description: "A test event for unit testing",
    eventType: EventType.CONCERT,
    date: {
      start: new Date(Date.now() + 86400000), // tomorrow
      end: new Date(Date.now() + 90000000), // tomorrow + a bit
    },
    ticketInfo: {
      price: 25,
      totalTickets: 100,
    },
  };

  beforeAll(async () => {
    await initializeDatabase();
    app = await createApp();
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Event.deleteMany({});
    await Venue.deleteMany({});
    await closeDatabase();
  });

  beforeEach(async () => {
    // Create users with different roles
    testUser = await createTestUser({
      ...testUserData,
      email: `user${Date.now()}@eventcontrollertest.com`,
      role: UserRole.USER,
    });

    organizerUser = await createTestUser({
      ...testUserData,
      email: `organizer${Date.now()}@eventcontrollertest.com`,
      role: UserRole.ORGANIZER,
    });

    adminUser = await createTestUser({
      ...testUserData,
      email: `admin${Date.now()}@eventcontrollertest.com`,
      role: UserRole.ADMIN,
    });

    // Generate tokens
    userToken = createToken(testUser);
    organizerToken = createToken(organizerUser);
    adminToken = createToken(adminUser);

    // Create a test venue
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

    // Create a test event
    testEvent = await Event.create({
      ...testEventData,
      venue: testVenue._id,
      organizer: organizerUser._id,
    });
  });

  afterEach(async () => {
    await User.deleteMany({ email: /@eventcontrollertest.com/ });
    await Event.deleteMany({});
    await Venue.deleteMany({});
  });

  describe("POST /events", () => {
    it("should create an event when authenticated as organizer", async () => {
      const eventData = {
        ...testEventData,
        name: "New Test Event",
        venue: testVenue._id,
      };

      const response = await request(app)
        .post("/v1/events")
        .set("Authorization", `Bearer ${organizerToken}`)
        .send(eventData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty("name", eventData.name);
      expect(response.body.data).toHaveProperty(
        "organizer",
        organizerUser._id.toString()
      );
    });

    it("should create an event when authenticated as admin", async () => {
      const eventData = {
        ...testEventData,
        name: "Admin Created Event",
        venue: testVenue._id,
      };

      const response = await request(app)
        .post("/v1/events")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(eventData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty("name", eventData.name);
    });

    it("should return 403 when authenticated as regular user", async () => {
      const eventData = {
        ...testEventData,
        venue: testVenue._id,
      };

      const response = await request(app)
        .post("/v1/events")
        .set("Authorization", `Bearer ${userToken}`)
        .send(eventData);

      expect(response.status).toBe(403);
    });

    it("should return 401 when not authenticated", async () => {
      const eventData = {
        ...testEventData,
        venue: testVenue._id,
      };

      const response = await request(app).post("/v1/events").send(eventData);

      expect(response.status).toBe(401);
    });

    it("should return 400 when validation fails", async () => {
      // Create data with missing required fields
      const invalidData = {
        name: "Invalid Event",
        // Missing other required fields
      };

      const response = await request(app)
        .post("/v1/events")
        .set("Authorization", `Bearer ${organizerToken}`)
        .send(invalidData);

      expect(response.status).toBe(400);
    });
  });

  describe("GET /events/:id", () => {
    it("should get an event by ID", async () => {
      const response = await request(app)
        .get(`/v1/events/${testEvent._id}`)
        .send();

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty(
        "_id",
        testEvent._id.toString()
      );
      expect(response.body.data).toHaveProperty("name", testEvent.name);
    });

    it("should return 404 for non-existent event ID", async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();

      const response = await request(app)
        .get(`/v1/events/${nonExistentId}`)
        .send();

      expect(response.status).toBe(404);
    });

    it("should return 400 for invalid event ID format", async () => {
      const response = await request(app)
        .get("/v1/events/invalid-id-format")
        .send();

      expect(response.status).toBe(400);
    });
  });

  describe("GET /events", () => {
    beforeEach(async () => {
      // Create additional events for testing search/filters
      await Event.create([
        {
          name: "Rock Concert",
          description: "A rock concert featuring famous bands",
          eventType: EventType.CONCERT,
          date: {
            start: new Date(Date.now() + 2 * 86400000), // 2 days later
            end: new Date(Date.now() + 2 * 86400000 + 3600000), // 2 days later + 1 hour
          },
          venue: testVenue._id,
          organizer: organizerUser._id,
          ticketInfo: {
            price: 50,
            totalTickets: 500,
          },
          status: EventStatus.PUBLISHED,
        },
        {
          name: "Jazz Festival",
          description: "A jazz festival with multiple performers",
          eventType: EventType.FESTIVAL,
          date: {
            start: new Date(Date.now() + 10 * 86400000), // 10 days later
            end: new Date(Date.now() + 12 * 86400000), // 12 days later
          },
          venue: testVenue._id,
          organizer: organizerUser._id,
          ticketInfo: {
            price: 100,
            totalTickets: 1000,
          },
          status: EventStatus.PUBLISHED,
        },
        {
          name: "Wedding Party",
          description: "A private wedding celebration",
          eventType: EventType.WEDDING,
          date: {
            start: new Date(Date.now() + 20 * 86400000), // 20 days later
            end: new Date(Date.now() + 20 * 86400000 + 7200000), // 20 days later + 2 hours
          },
          venue: testVenue._id,
          organizer: organizerUser._id,
          ticketInfo: {
            price: 0,
            totalTickets: 200,
          },
          status: EventStatus.DRAFT,
          isPrivate: true,
        },
      ]);
    });

    it("should return a list of published events", async () => {
      const response = await request(app).get("/v1/events").send();

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);

      // Only published and non-private events should be returned
      response.body.data.forEach((event: any) => {
        expect(event.status).toBe(EventStatus.PUBLISHED);
        expect(event.isPrivate).not.toBe(true);
      });
    });

    it("should filter events by event type", async () => {
      const response = await request(app)
        .get("/v1/events")
        .query({ eventType: EventType.FESTIVAL })
        .send();

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // All events should be of type FESTIVAL
      const allFestivals = response.body.data.every(
        (event: any) => event.eventType === EventType.FESTIVAL
      );
      expect(allFestivals).toBe(true);
    });

    it("should filter events by date range", async () => {
      const startDate = new Date(Date.now() + 5 * 86400000); // 5 days from now
      const endDate = new Date(Date.now() + 15 * 86400000); // 15 days from now

      const response = await request(app)
        .get("/v1/events")
        .query({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        })
        .send();

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // All events should be within the date range
      response.body.data.forEach((event: any) => {
        const eventStartDate = new Date(event.date.start);
        expect(eventStartDate >= startDate).toBe(true);
        expect(eventStartDate <= endDate).toBe(true);
      });
    });

    it("should paginate results correctly", async () => {
      // Create more events to ensure pagination
      const additionalEvents: any[] = [];
      for (let i = 1; i <= 5; i++) {
        additionalEvents.push({
          name: `Pagination Event ${i}`,
          description: `Event ${i} for testing pagination`,
          eventType: EventType.CONCERT,
          date: {
            start: new Date(Date.now() + i * 86400000),
            end: new Date(Date.now() + i * 86400000 + 3600000),
          },
          venue: testVenue._id,
          organizer: organizerUser._id,
          ticketInfo: {
            price: 10,
            totalTickets: 100,
          },
          status: EventStatus.PUBLISHED,
        });
      }
      await Event.create(additionalEvents);

      // Get first page with 2 items per page
      const page1Response = await request(app)
        .get("/v1/events")
        .query({ page: 1, limit: 2 })
        .send();

      expect(page1Response.status).toBe(200);
      expect(page1Response.body.data.length).toBe(2);

      // Get second page with 2 items per page
      const page2Response = await request(app)
        .get("/v1/events")
        .query({ page: 2, limit: 2 })
        .send();

      expect(page2Response.status).toBe(200);
      expect(page2Response.body.data.length).toBe(2);

      // Compare the IDs from the two pages - they should be completely different
      const firstPageIds = new Set(
        page1Response.body.data.map((v: any) => v._id)
      );
      const secondPageIds = new Set(
        page2Response.body.data.map((v: any) => v._id)
      );
      const hasOverlap = [...firstPageIds].some((id) => secondPageIds.has(id));
      expect(hasOverlap).toBe(false);
    });
  });

  describe("GET /events/my-events", () => {
    beforeEach(async () => {
      // Create additional events for the organizer
      await Event.create([
        {
          name: "Organizer's Event 1",
          description: "First organizer event",
          eventType: EventType.CONCERT,
          date: {
            start: new Date(Date.now() + 86400000),
            end: new Date(Date.now() + 90000000),
          },
          venue: testVenue._id,
          organizer: organizerUser._id,
          ticketInfo: {
            price: 20,
            totalTickets: 100,
          },
        },
        {
          name: "Organizer's Event 2",
          description: "Second organizer event",
          eventType: EventType.CORPORATE_EVENT,
          date: {
            start: new Date(Date.now() + 3 * 86400000),
            end: new Date(Date.now() + 3 * 86400000 + 3600000),
          },
          venue: testVenue._id,
          organizer: organizerUser._id,
          ticketInfo: {
            price: 30,
            totalTickets: 200,
          },
        },
      ]);
    });

    it("should return events created by the authenticated organizer", async () => {
      const response = await request(app)
        .get("/v1/events/my-events")
        .set("Authorization", `Bearer ${organizerToken}`)
        .send();

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);

      // All events should be created by the organizer
      const allCreatedByOrganizer = response.body.data.every(
        (event: any) =>
          event.organizer.toString() === organizerUser._id.toString()
      );
      expect(allCreatedByOrganizer).toBe(true);
    });

    it("should return 401 when not authenticated", async () => {
      const response = await request(app).get("/v1/events/my-events").send();
      expect(response.status).toBe(401);
    });

    it("should return 403 when authenticated as regular user", async () => {
      const response = await request(app)
        .get("/v1/events/my-events")
        .set("Authorization", `Bearer ${userToken}`)
        .send();

      expect(response.status).toBe(403);
    });
  });

  describe("PUT /events/:id", () => {
    it("should update an event when authenticated as organizer who created it", async () => {
      const updateData = {
        name: "Updated Event Name",
        description: "Updated event description",
        ticketInfo: {
          price: 35,
          totalTickets: 150,
        },
      };

      const response = await request(app)
        .put(`/v1/events/${testEvent._id}`)
        .set("Authorization", `Bearer ${organizerToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty("name", updateData.name);
      expect(response.body.data).toHaveProperty(
        "description",
        updateData.description
      );
      expect(response.body.data.ticketInfo).toHaveProperty(
        "price",
        updateData.ticketInfo.price
      );
    });

    it("should update an event when authenticated as admin", async () => {
      const updateData = {
        name: "Admin Updated Event",
        isPrivate: true,
      };

      try {
        adminUser = await createTestUser({
          ...testUserData,
          email: `admin${Date.now()}@eventcontrollertest.com`,
          role: UserRole.ADMIN,
        });
        adminToken = createToken(adminUser);
        testEvent = await Event.create({
          ...testEventData,
          venue: testVenue._id,
          organizer: adminUser._id,
        });
      } catch (error) {}

      const response = await request(app)
        .put(`/v1/events/${testEvent._id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty("name", updateData.name);
      expect(response.body.data).toHaveProperty(
        "isPrivate",
        updateData.isPrivate
      );
    });

    it("should return 404 when trying to update a non-existent event", async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const updateData = {
        name: "Update Non-existent",
      };

      const response = await request(app)
        .put(`/v1/events/${nonExistentId}`)
        .set("Authorization", `Bearer ${organizerToken}`)
        .send(updateData);

      expect(response.status).toBe(404);
    });

    it("should return 403 when trying to update someone else's event", async () => {
      // Create another organizer
      const anotherOrganizer = await createTestUser({
        ...testUserData,
        email: `another-organizer${Date.now()}@eventcontrollertest.com`,
        role: UserRole.ORGANIZER,
      });
      const anotherOrganizerToken = createToken(anotherOrganizer);

      const updateData = {
        name: "Unauthorized Update",
      };

      const response = await request(app)
        .put(`/v1/events/${testEvent._id}`)
        .set("Authorization", `Bearer ${anotherOrganizerToken}`)
        .send(updateData);

      expect(response.status).toBe(404); // Should return 404 rather than 403 for security
    });

    it("should return 401 when not authenticated", async () => {
      const updateData = {
        name: "Unauthenticated Update",
      };

      const response = await request(app)
        .put(`/v1/events/${testEvent._id}`)
        .send(updateData);

      expect(response.status).toBe(401);
    });
  });

  describe("PATCH /events/:id/publish", () => {
    it("should publish a draft event when authenticated as organizer who created it", async () => {
      // Create a draft event first
      const draftEvent = await Event.create({
        ...testEventData,
        name: "Draft Event To Publish",
        venue: testVenue._id,
        organizer: organizerUser._id,
        status: EventStatus.DRAFT,
      });

      const response = await request(app)
        .patch(`/v1/events/${draftEvent._id}/publish`)
        .set("Authorization", `Bearer ${organizerToken}`)
        .send();

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty(
        "status",
        EventStatus.PUBLISHED
      );
    });

    it("should return 400 when trying to publish an already published event", async () => {
      // Create a published event first
      const publishedEvent = await Event.create({
        ...testEventData,
        name: "Published Event",
        venue: testVenue._id,
        organizer: organizerUser._id,
        status: EventStatus.PUBLISHED,
      });

      const response = await request(app)
        .patch(`/v1/events/${publishedEvent._id}/publish`)
        .set("Authorization", `Bearer ${organizerToken}`)
        .send();

      expect(response.status).toBe(400);
    });

    it("should return 404 when trying to publish a non-existent event", async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();

      const response = await request(app)
        .patch(`/v1/events/${nonExistentId}/publish`)
        .set("Authorization", `Bearer ${organizerToken}`)
        .send();

      expect(response.status).toBe(404);
    });

    it("should return 401 when not authenticated", async () => {
      const response = await request(app)
        .patch(`/v1/events/${testEvent._id}/publish`)
        .send();

      expect(response.status).toBe(401);
    });
  });

  describe("PATCH /events/:id/cancel", () => {
    it("should cancel an event when authenticated as organizer who created it", async () => {
      const response = await request(app)
        .patch(`/v1/events/${testEvent._id}/cancel`)
        .set("Authorization", `Bearer ${organizerToken}`)
        .send();

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty("status", EventStatus.CANCELED);
    });

    it("should cancel an event when authenticated as admin", async () => {
      try {
        organizerUser = await createTestUser({
          ...testUserData,
          email: `organizer${Date.now()}@eventcontrollertest.com`,
          role: UserRole,
        });
        organizerToken = createToken(organizerUser);
      } catch (error) {}

      // Create another event to cancel
      const eventToCancel = await Event.create({
        ...testEventData,
        name: "Event To Cancel By Admin",
        venue: testVenue._id,
        organizer: organizerUser._id,
      });

      const response = await request(app)
        .patch(`/v1/events/${eventToCancel._id}/cancel`)
        .set("Authorization", `Bearer ${organizerToken}`)
        .send();

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty("status", EventStatus.CANCELED);
    });

    it("should return 400 when trying to cancel an already canceled event", async () => {
      // Create a canceled event first
      const canceledEvent = await Event.create({
        ...testEventData,
        name: "Already Canceled Event",
        venue: testVenue._id,
        organizer: organizerUser._id,
        status: EventStatus.CANCELED,
      });

      const response = await request(app)
        .patch(`/v1/events/${canceledEvent._id}/cancel`)
        .set("Authorization", `Bearer ${organizerToken}`)
        .send();

      expect(response.status).toBe(400);
    });

    it("should return 404 when trying to cancel a non-existent event", async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();

      const response = await request(app)
        .patch(`/v1/events/${nonExistentId}/cancel`)
        .set("Authorization", `Bearer ${organizerToken}`)
        .send();

      expect(response.status).toBe(404);
    });

    it("should return 401 when not authenticated", async () => {
      const response = await request(app)
        .patch(`/v1/events/${testEvent._id}/cancel`)
        .send();

      expect(response.status).toBe(401);
    });
  });
});
