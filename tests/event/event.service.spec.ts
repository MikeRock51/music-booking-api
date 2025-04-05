import mongoose, { Types, ObjectId } from "mongoose";
import { initializeDatabase, closeDatabase } from "../../app/config/database";
import EventService from "../../app/services/EventService";
import User, { UserRole } from "../../app/models/User";
import Event, { EventStatus, EventType, IEvent } from "../../app/models/Event";
import Venue, { VenueType } from "../../app/models/Venue";
import { AppError } from "../../app/middleware/errorHandler";
import { createTestUser } from "../helpers";

describe("Event Service", () => {
  let testUser: any;
  let organizerUser: any;
  let adminUser: any;
  let testVenue: any;
  let testEvent: IEvent;

  const adminUserData = {
    email: `admin${Date.now()}@eventservice.test`,
    password: "Password123!",
    firstName: "Test",
    lastName: "Admin",
    role: UserRole.ADMIN,
  };

  const testUserData = {
    email: `user${Date.now()}@eventservice.test`,
    password: "Password123!",
    firstName: "Test",
    lastName: "User",
    role: UserRole.USER,
  };

  const organizerUserData = {
    email: `organizer${Date.now()}@eventservice.test`,
    password: "Password123!",
    firstName: "Test",
    lastName: "Organizer",
    role: UserRole.ORGANIZER,
  };

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
    }
  };

  beforeAll(async () => {
    await initializeDatabase();
  });

  afterAll(async () => {
    await User.deleteMany({ email: /@eventservice.test/ });
    await Event.deleteMany({});
    await Venue.deleteMany({});
    await closeDatabase();
  });

  beforeEach(async () => {
    // Create test users with different roles
    testUser = await createTestUser(testUserData);
    organizerUser = await createTestUser(organizerUserData);
    adminUser = await createTestUser(adminUserData);

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
      organizer: organizerUser._id
    });
  });

  afterEach(async () => {
    await User.deleteMany({ email: /@eventservice.test/ });
    await Event.deleteMany({});
    await Venue.deleteMany({});
  });

  describe("createEvent", () => {
    it("should create an event successfully", async () => {
      const eventData = {
        ...testEventData,
        name: "New Service Test Event",
        venue: testVenue._id
      };

      const event = await EventService.createEvent(
        (organizerUser._id as Types.ObjectId).toString(),
        eventData
      );

      expect(event).toBeDefined();
      expect(event.name).toBe(eventData.name);
      expect(event.organizer.toString()).toBe((organizerUser._id as Types.ObjectId).toString());
      expect(event.status).toBe(EventStatus.DRAFT);
    });

    it("should throw an error if venue does not exist", async () => {
      const nonExistentVenueId = new mongoose.Types.ObjectId().toString();
      const eventData = {
        ...testEventData,
        name: "Event with non-existent venue",
        venue: nonExistentVenueId
      };

      await expect(
        EventService.createEvent((organizerUser._id as Types.ObjectId).toString(), eventData)
      ).rejects.toThrow("Venue not found");
    });

    it("should throw an error for duplicate events", async () => {
      // Create first event
      const eventData = {
        name: "Duplicate Event Test",
        description: "An event to test duplication prevention",
        eventType: EventType.CONCERT,
        date: {
          start: new Date("2025-05-01T19:00:00"),
          end: new Date("2025-05-01T23:00:00"),
        },
        venue: testVenue._id,
        ticketInfo: {
          price: 30,
          totalTickets: 200,
        }
      };

      await EventService.createEvent(
        (organizerUser._id as Types.ObjectId).toString(),
        eventData
      );

      // Try to create the same event again
      await expect(
        EventService.createEvent((organizerUser._id as Types.ObjectId).toString(), eventData)
      ).rejects.toThrow("An event with the same name at this venue and date already exists");
    });
  });

  describe("getEventById", () => {
    it("should retrieve an event by ID", async () => {
      const event = await EventService.getEventById(
        (testEvent._id as Types.ObjectId).toString()
      );

      expect(event).toBeDefined();
      expect((event._id as Types.ObjectId).toString()).toBe(
        (testEvent._id as Types.ObjectId).toString()
      );
      expect(event.name).toBe(testEvent.name);
    });

    it("should throw an error if event does not exist", async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();

      await expect(
        EventService.getEventById(nonExistentId)
      ).rejects.toThrow("Event not found");
    });
  });

  describe("updateEvent", () => {
    it("should update an event when organizer is updating their own event", async () => {
      const updateData = {
        name: "Updated Event Name",
        description: "Updated event description",
        ticketInfo: {
          price: 35,
          totalTickets: 150,
        }
      };

      const updatedEvent = await EventService.updateEvent(
        (testEvent._id as Types.ObjectId).toString(),
        (organizerUser._id as Types.ObjectId).toString(),
        updateData
      );

      expect(updatedEvent.name).toBe(updateData.name);
      expect(updatedEvent.description).toBe(updateData.description);
      expect(updatedEvent.ticketInfo.price).toBe(updateData.ticketInfo.price);
      expect(updatedEvent.ticketInfo.totalTickets).toBe(updateData.ticketInfo.totalTickets);
    });

    it("should throw error when non-owner tries to update", async () => {
      const updateData = {
        name: "Unauthorized Update",
      };

      // Create another organizer
      const anotherOrganizer = await createTestUser({
        ...organizerUserData,
        email: `another-organizer${Date.now()}@eventservice.test`,
      });

      await expect(
        EventService.updateEvent(
          (testEvent._id as Types.ObjectId).toString(),
          (anotherOrganizer._id as Types.ObjectId).toString(),
          updateData
        )
      ).rejects.toThrow("Event not found or you are not authorized to update it");
    });

    it("should throw error for non-existent venue in update", async () => {
      const nonExistentVenueId = new mongoose.Types.ObjectId().toString();
      const updateData = {
        venue: nonExistentVenueId
      };

      await expect(
        EventService.updateEvent(
          (testEvent._id as Types.ObjectId).toString(),
          (organizerUser._id as Types.ObjectId).toString(),
          updateData
        )
      ).rejects.toThrow("Venue not found");
    });

    it("should throw error for non-existent event ID", async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const updateData = {
        name: "Update Non-existent Event",
      };

      await expect(
        EventService.updateEvent(
          nonExistentId,
          (organizerUser._id as Types.ObjectId).toString(),
          updateData
        )
      ).rejects.toThrow("Event not found or you are not authorized to update it");
    });
  });

  describe("publishEvent", () => {
    it("should publish a draft event", async () => {
      // Create a draft event
      const draftEvent = await Event.create({
        ...testEventData,
        name: "Draft Event to Publish",
        venue: testVenue._id,
        organizer: organizerUser._id,
        status: EventStatus.DRAFT
      });

      const publishedEvent = await EventService.publishEvent(
        (draftEvent._id as Types.ObjectId).toString(),
        (organizerUser._id as Types.ObjectId).toString()
      );

      expect(publishedEvent.status).toBe(EventStatus.PUBLISHED);
    });

    it("should throw error when trying to publish an already published event", async () => {
      // Create a published event
      const publishedEvent = await Event.create({
        ...testEventData,
        name: "Already Published Event",
        venue: testVenue._id,
        organizer: organizerUser._id,
        status: EventStatus.PUBLISHED
      });

      await expect(
        EventService.publishEvent(
          (publishedEvent._id as Types.ObjectId).toString(),
          (organizerUser._id as Types.ObjectId).toString()
        )
      ).rejects.toThrow("Event is already published");
    });

    it("should throw error when non-owner tries to publish", async () => {
      // Create another organizer
      const anotherOrganizer = await createTestUser({
        ...organizerUserData,
        email: `another-organizer${Date.now()}@eventservice.test`,
      });

      await expect(
        EventService.publishEvent(
          (testEvent._id as Types.ObjectId).toString(),
          (anotherOrganizer._id as Types.ObjectId).toString()
        )
      ).rejects.toThrow("Event not found or you are not authorized to update it");
    });

    it("should throw error for non-existent event ID", async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();

      await expect(
        EventService.publishEvent(
          nonExistentId,
          (organizerUser._id as Types.ObjectId).toString()
        )
      ).rejects.toThrow("Event not found or you are not authorized to update it");
    });
  });

  describe("cancelEvent", () => {
    it("should cancel an event", async () => {
      const canceledEvent = await EventService.cancelEvent(
        (testEvent._id as Types.ObjectId).toString(),
        (organizerUser._id as Types.ObjectId).toString()
      );

      expect(canceledEvent.status).toBe(EventStatus.CANCELED);
    });

    it("should throw error when trying to cancel an already canceled event", async () => {
      // Create a canceled event
      const canceledEvent = await Event.create({
        ...testEventData,
        name: "Already Canceled Event",
        venue: testVenue._id,
        organizer: organizerUser._id,
        status: EventStatus.CANCELED
      });

      await expect(
        EventService.cancelEvent(
          (canceledEvent._id as Types.ObjectId).toString(),
          (organizerUser._id as Types.ObjectId).toString()
        )
      ).rejects.toThrow("Event is already canceled");
    });

    it("should throw error when non-owner tries to cancel", async () => {
      // Create another organizer
      const anotherOrganizer = await createTestUser({
        ...organizerUserData,
        email: `another-organizer${Date.now()}@eventservice.test`,
      });

      await expect(
        EventService.cancelEvent(
          (testEvent._id as Types.ObjectId).toString(),
          (anotherOrganizer._id as Types.ObjectId).toString()
        )
      ).rejects.toThrow("Event not found or you are not authorized to cancel it");
    });

    it("should throw error for non-existent event ID", async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();

      await expect(
        EventService.cancelEvent(
          nonExistentId,
          (organizerUser._id as Types.ObjectId).toString()
        )
      ).rejects.toThrow("Event not found or you are not authorized to cancel it");
    });
  });

  describe("getOrganizerEvents", () => {
    beforeEach(async () => {
      // Create multiple events for the organizer
      await Event.create([
        {
          ...testEventData,
          name: "Organizer Event 1",
          venue: testVenue._id,
          organizer: organizerUser._id,
        },
        {
          ...testEventData,
          name: "Organizer Event 2",
          venue: testVenue._id,
          organizer: organizerUser._id,
        },
      ]);
    });

    it("should return events created by an organizer", async () => {
      const events = await EventService.getOrganizerEvents(
        (organizerUser._id as Types.ObjectId).toString()
      );

      expect(Array.isArray(events)).toBe(true);
      expect(events.length).toBeGreaterThan(0);

      // All events should be created by the organizer
      events.forEach((event) => {
        expect(event.organizer.toString()).toBe(
          (organizerUser._id as Types.ObjectId).toString()
        );
      });
    });

    it("should paginate results correctly", async () => {
      const events = await EventService.getOrganizerEvents(
        (organizerUser._id as Types.ObjectId).toString(),
        1,
        2
      );

      expect(Array.isArray(events)).toBe(true);
      expect(events.length).toBeLessThanOrEqual(2);
    });

    it("should return empty array if organizer has no events", async () => {
      // Create a new organizer without events
      const newOrganizer = await createTestUser({
        ...organizerUserData,
        email: `new-organizer${Date.now()}@eventservice.test`,
      });

      const events = await EventService.getOrganizerEvents(
        (newOrganizer._id as Types.ObjectId).toString()
      );

      expect(events).toEqual([]);
    });
  });

  describe("findEvents", () => {
    beforeEach(async () => {
      // Create test events with different properties for filtering tests
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
        {
          name: "Corporate Conference",
          description: "A corporate event with workshops",
          eventType: EventType.CORPORATE_EVENT,
          date: {
            start: new Date(Date.now() + 5 * 86400000), // 5 days later
            end: new Date(Date.now() + 6 * 86400000), // 6 days later
          },
          venue: testVenue._id,
          organizer: organizerUser._id,
          ticketInfo: {
            price: 200,
            totalTickets: 300,
          },
          status: EventStatus.PUBLISHED,
          isPrivate: false,
        },
      ]);
    });

    it("should find all published and non-private events without filters", async () => {
      const events = await EventService.findEvents();

      expect(Array.isArray(events)).toBe(true);
      expect(events.length).toBeGreaterThan(0);

      // Should only return published and non-private events
      events.forEach((event) => {
        expect(event.status).toBe(EventStatus.PUBLISHED);
        expect(event.isPrivate).toBe(false);
      });
    });

    it("should filter events by date range", async () => {
      const startDate = new Date(Date.now() + 4 * 86400000); // 4 days from now
      const endDate = new Date(Date.now() + 15 * 86400000); // 15 days from now

      const events = await EventService.findEvents({
        startDate,
        endDate,
      });

      // Should only include events that start within this range
      events.forEach((event) => {
        expect(new Date(event.date.start) >= startDate).toBe(true);
        expect(new Date(event.date.start) <= endDate).toBe(true);
      });
    });

    it("should filter events by event type", async () => {
      const events = await EventService.findEvents({
        eventType: EventType.FESTIVAL,
      });

      expect(events.length).toBeGreaterThan(0);
      events.forEach((event) => {
        expect(event.eventType).toBe(EventType.FESTIVAL);
      });
    });

    it("should filter events by price range", async () => {
      const events = await EventService.findEvents({
        minPrice: 75,
        maxPrice: 250,
      });

      events.forEach((event) => {
        expect(event.ticketInfo.price).toBeGreaterThanOrEqual(75);
        expect(event.ticketInfo.price).toBeLessThanOrEqual(250);
      });
    });

    it("should handle pagination", async () => {
      // Add more events to ensure we have enough for pagination testing
      const additionalEvents = [];
      for (let i = 1; i <= 3; i++) {
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
            price: 10 * i,
            totalTickets: 100,
          },
          status: EventStatus.PUBLISHED,
          isPrivate: false,
        });
      }
      await Event.create(additionalEvents);

      const page1 = await EventService.findEvents({}, 1, 2);
      const page2 = await EventService.findEvents({}, 2, 2);

      expect(Array.isArray(page1)).toBe(true);
      expect(Array.isArray(page2)).toBe(true);
      expect(page1.length).toBe(2);
      expect(page2.length).toBeGreaterThan(0);

      // Check for no overlap between pages
      const page1Ids = page1.map(e => e._id.toString());
      const page2Ids = page2.map(e => e._id.toString());
      const hasOverlap = page1Ids.some(id => page2Ids.includes(id));
      expect(hasOverlap).toBe(false);
    });
  });
});