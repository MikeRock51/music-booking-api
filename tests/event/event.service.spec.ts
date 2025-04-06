import mongoose, { ObjectId } from "mongoose";
import EventService from "../../app/services/EventService";
import Event, { IEvent, EventStatus, EventType } from "../../app/models/Event";
import User, { UserRole, IUser } from "../../app/models/User";
import Venue, { VenueType } from "../../app/models/Venue";
import { initializeDatabase, closeDatabase } from "../../app/config/database";
import { createTestUser } from "../helpers";

// Type to handle MongoDB document with _id
type WithId<T> = T & { _id: mongoose.Types.ObjectId };

describe("EventService", () => {
  // Test user data
  let organizerId: string;
  let adminId: string;
  let testUser: WithId<IUser>;
  let testAdmin: WithId<IUser>;
  let testVenue: WithId<any>;

  // Test event data
  const testEventData = {
    name: "Test Concert",
    description: "A test concert event",
    eventType: EventType.CONCERT,
    date: {
      start: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000), // 3 hours later
    },
    ticketInfo: {
      price: 50,
      totalTickets: 100,
      soldTickets: 0,
    },
    isPrivate: false,
  };

  // Setup test database
  beforeAll(async () => {
    await initializeDatabase();
  });

  afterAll(async () => {
    await User.deleteMany({ email: /@eventservicetest.com/ });
    await Event.deleteMany({});
    await Venue.deleteMany({});
    await closeDatabase();
  });

  beforeEach(async () => {
    // Create a test organizer
    testUser = await createTestUser({
      email: `organizer${Date.now()}@eventservicetest.com`,
      password: "Password123!",
      firstName: "Test",
      lastName: "Organizer",
      role: UserRole.USER,
    }) as WithId<IUser>;
    organizerId = testUser._id.toString();

    // Create a test admin
    testAdmin = await createTestUser({
      email: `admin${Date.now()}@eventservicetest.com`,
      password: "Password123!",
      firstName: "Test",
      lastName: "Admin",
      role: UserRole.ADMIN,
    }) as WithId<IUser>;
    adminId = testAdmin._id.toString();

    // Create a test venue with all required fields
    testVenue = await Venue.create({
      name: "Test Venue",
      description: "A test venue for events",
      location: {
        address: "123 Test St",
        city: "Test City",
        state: "Test State",
        country: "Test Country",
        zipCode: "12345",
        coordinates: {
          latitude: 40.7128,
          longitude: -74.006,
        },
      },
      venueType: VenueType.CONCERT_HALL,
      capacity: 500,
      amenities: ["sound_system", "lighting", "parking"],
      images: ["https://example.com/venue-image.jpg"],
      contactInfo: {
        email: "venue@test.com",
        phone: "123-456-7890",
        website: "https://testvenue.com",
      },
      owner: testUser._id, // Using the organizer as the venue owner
    }) as WithId<any>;
  });

  afterEach(async () => {
    // Clean up test data
    await User.deleteMany({});
    await Event.deleteMany({});
    await Venue.deleteMany({});
  });

  describe("createEvent method", () => {
    it("should create an event successfully", async () => {
      const eventData = {
        ...testEventData,
        venue: testVenue._id,
      };

      const result = await EventService.createEvent(organizerId, eventData) as WithId<IEvent>;

      // Check if the result has the expected properties
      expect(result).toHaveProperty("_id");
      expect(result).toHaveProperty("name", eventData.name);
      expect(result).toHaveProperty("description", eventData.description);
      expect(result).toHaveProperty("eventType", eventData.eventType);
      expect(result).toHaveProperty("date");
      expect(result).toHaveProperty("venue");
      expect(result.venue.toString()).toBe(testVenue._id.toString());
      expect(result).toHaveProperty("organizer");
      expect(result.organizer.toString()).toBe(organizerId);
      expect(result).toHaveProperty("status", EventStatus.DRAFT);
    });

    it("should throw an error when venue doesn't exist", async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const eventData = {
        ...testEventData,
        venue: nonExistentId,
      };

      await expect(EventService.createEvent(organizerId, eventData)).rejects.toThrow("Venue not found");
    });

    it("should throw an error when creating a duplicate event", async () => {
      const eventData = {
        ...testEventData,
        venue: testVenue._id,
      };

      // Create first event
      await EventService.createEvent(organizerId, eventData);

      // Try to create duplicate event
      await expect(EventService.createEvent(organizerId, eventData)).rejects.toThrow(
        "An event with the same name at this venue and date already exists."
      );
    });
  });

  describe("getEventById method", () => {
    it("should retrieve an event by ID", async () => {
      const eventData = {
        ...testEventData,
        venue: testVenue._id,
      };

      // Create test event
      const createdEvent = await EventService.createEvent(organizerId, eventData) as WithId<IEvent>;
      const eventId = createdEvent._id.toString();

      // Retrieve event
      const result = await EventService.getEventById(eventId) as WithId<IEvent>;

      expect(result).toHaveProperty("_id");
      expect(result._id.toString()).toBe(eventId);
      expect(result).toHaveProperty("name", eventData.name);
      expect(result).toHaveProperty("venue");
      expect(result).toHaveProperty("organizer");
    });

    it("should throw error when getting non-existent event", async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      await expect(EventService.getEventById(nonExistentId)).rejects.toThrow("Event not found");
    });
  });

  describe("updateEvent method", () => {
    it("should update an event successfully as organizer", async () => {
      // First create an event
      const eventData = {
        ...testEventData,
        venue: testVenue._id,
      };

      const createdEvent = await EventService.createEvent(organizerId, eventData) as WithId<IEvent>;
      const eventId = createdEvent._id.toString();

      // Update event
      const updateData = {
        name: "Updated Event Name",
        description: "Updated event description",
      };

      const result = await EventService.updateEvent(eventId, testUser, updateData);

      expect(result).toHaveProperty("name", updateData.name);
      expect(result).toHaveProperty("description", updateData.description);
      // Original data should still be there for fields not updated
      expect(result).toHaveProperty("eventType", eventData.eventType);
    });

    it("should update an event successfully as admin", async () => {
      // First create an event
      const eventData = {
        ...testEventData,
        venue: testVenue._id,
      };

      const createdEvent = await EventService.createEvent(organizerId, eventData) as WithId<IEvent>;
      const eventId = createdEvent._id.toString();

      // Update event as admin
      const updateData = {
        name: "Admin Updated Event",
        description: "Admin updated description",
      };

      const result = await EventService.updateEvent(eventId, testAdmin, updateData);

      expect(result).toHaveProperty("name", updateData.name);
      expect(result).toHaveProperty("description", updateData.description);
    });

    it("should throw error when updating non-existent event", async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const updateData = {
        name: "Updated Event",
      };

      await expect(EventService.updateEvent(nonExistentId, testUser, updateData)).rejects.toThrow(
        "Event not found or you are not authorized to update it"
      );
    });

    it("should throw error when unauthorized user tries to update event", async () => {
      // Create an event
      const eventData = {
        ...testEventData,
        venue: testVenue._id,
      };

      const createdEvent = await EventService.createEvent(organizerId, eventData) as WithId<IEvent>;
      const eventId = createdEvent._id.toString();

      // Create another user that is not the organizer
      const anotherUser = await createTestUser({
        email: `another${Date.now()}@eventservicetest.com`,
        password: "Password123!",
        firstName: "Another",
        lastName: "User",
        role: UserRole.USER,
      }) as WithId<IUser>;

      // Try to update as unauthorized user
      const updateData = {
        name: "Unauthorized Update",
      };

      await expect(EventService.updateEvent(eventId, anotherUser, updateData)).rejects.toThrow(
        "Event not found or you are not authorized to update it"
      );
    });

    it("should throw error when updating venue to non-existent venue", async () => {
      // Create event
      const eventData = {
        ...testEventData,
        venue: testVenue._id,
      };

      const createdEvent = await EventService.createEvent(organizerId, eventData) as WithId<IEvent>;
      const eventId = createdEvent._id.toString();

      // Try to update venue to non-existent venue
      const nonExistentVenueId = new mongoose.Types.ObjectId().toString();
      const updateData = {
        venue: nonExistentVenueId,
      };

      await expect(EventService.updateEvent(eventId, testUser, updateData)).rejects.toThrow("Venue not found");
    });

    it("should throw error when creating duplicate event on update", async () => {
      // Create two events with different names
      const event1Data = {
        ...testEventData,
        name: "First Test Event",
        venue: testVenue._id,
      };

      const event2Data = {
        ...testEventData,
        name: "Second Test Event",
        venue: testVenue._id,
        date: {
          start: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days later
          end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000),
        },
      };

      await EventService.createEvent(organizerId, event1Data);
      const event2 = await EventService.createEvent(organizerId, event2Data) as WithId<IEvent>;

      // Try to update event2 to have the same name, venue, and date as event1
      const updateData = {
        name: event1Data.name,
        date: event1Data.date,
      };

      await expect(EventService.updateEvent(event2._id.toString(), testUser, updateData)).rejects.toThrow(
        "event with the same name at this venue and date already exists."
      );
    });
  });

  describe("publishEvent method", () => {
    it("should publish a draft event", async () => {
      // Create a draft event
      const eventData = {
        ...testEventData,
        venue: testVenue._id,
      };

      const createdEvent = await EventService.createEvent(organizerId, eventData) as WithId<IEvent>;
      const eventId = createdEvent._id.toString();

      // Publish the event
      const result = await EventService.publishEvent(eventId, organizerId);

      expect(result).toHaveProperty("status", EventStatus.PUBLISHED);
    });

    it("should throw error when event is already published", async () => {
      // Create and publish an event
      const eventData = {
        ...testEventData,
        venue: testVenue._id,
      };

      const createdEvent = await EventService.createEvent(organizerId, eventData) as WithId<IEvent>;
      const eventId = createdEvent._id.toString();

      // Publish the event
      await EventService.publishEvent(eventId, organizerId);

      // Try to publish again
      await expect(EventService.publishEvent(eventId, organizerId)).rejects.toThrow("Event is already published");
    });

    it("should throw error when non-organizer tries to publish event", async () => {
      // Create an event
      const eventData = {
        ...testEventData,
        venue: testVenue._id,
      };

      const createdEvent = await EventService.createEvent(organizerId, eventData) as WithId<IEvent>;
      const eventId = createdEvent._id.toString();

      // Create another user
      const anotherUser = await createTestUser({
        email: `another${Date.now()}@eventservicetest.com`,
        password: "Password123!",
        firstName: "Another",
        lastName: "User",
      }) as WithId<IUser>;
      const anotherUserId = anotherUser._id.toString();

      // Try to publish as non-organizer
      await expect(EventService.publishEvent(eventId, anotherUserId)).rejects.toThrow(
        "Event not found or you are not authorized to update it"
      );
    });
  });

  describe("cancelEvent method", () => {
    it("should cancel an event", async () => {
      // Create an event
      const eventData = {
        ...testEventData,
        venue: testVenue._id,
      };

      const createdEvent = await EventService.createEvent(organizerId, eventData) as WithId<IEvent>;
      const eventId = createdEvent._id.toString();

      // Cancel the event
      const result = await EventService.cancelEvent(eventId, organizerId);

      expect(result).toHaveProperty("status", EventStatus.CANCELED);
    });

    it("should throw error when event is already canceled", async () => {
      // Create and cancel an event
      const eventData = {
        ...testEventData,
        venue: testVenue._id,
      };

      const createdEvent = await EventService.createEvent(organizerId, eventData) as WithId<IEvent>;
      const eventId = createdEvent._id.toString();

      // Cancel the event
      await EventService.cancelEvent(eventId, organizerId);

      // Try to cancel again
      await expect(EventService.cancelEvent(eventId, organizerId)).rejects.toThrow("Event is already canceled");
    });

    it("should throw error when non-organizer tries to cancel event", async () => {
      // Create an event
      const eventData = {
        ...testEventData,
        venue: testVenue._id,
      };

      const createdEvent = await EventService.createEvent(organizerId, eventData) as WithId<IEvent>;
      const eventId = createdEvent._id.toString();

      // Create another user
      const anotherUser = await createTestUser({
        email: `another${Date.now()}@eventservicetest.com`,
        password: "Password123!",
        firstName: "Another",
        lastName: "User",
      }) as WithId<IUser>;
      const anotherUserId = anotherUser._id.toString();

      // Try to cancel as non-organizer
      await expect(EventService.cancelEvent(eventId, anotherUserId)).rejects.toThrow(
        "Event not found or you are not authorized to cancel it"
      );
    });
  });

  describe("getOrganizerEvents method", () => {
    beforeEach(async () => {
      // Create multiple events for the organizer
      const eventData1 = {
        ...testEventData,
        name: "Organizer Event 1",
        venue: testVenue._id,
      };

      const eventData2 = {
        ...testEventData,
        name: "Organizer Event 2",
        venue: testVenue._id,
        date: {
          start: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
          end: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000),
        },
      };

      const eventData3 = {
        ...testEventData,
        name: "Organizer Event 3",
        venue: testVenue._id,
        date: {
          start: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
          end: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000),
        },
      };

      await EventService.createEvent(organizerId, eventData1);
      await EventService.createEvent(organizerId, eventData2);
      await EventService.createEvent(organizerId, eventData3);

      // Create an event for another organizer
      const anotherUser = await createTestUser({
        email: `another${Date.now()}@eventservicetest.com`,
        password: "Password123!",
        firstName: "Another",
        lastName: "User",
      }) as WithId<IUser>;

      const anotherOrganizerEvent = {
        ...testEventData,
        name: "Another Organizer Event",
        venue: testVenue._id,
      };

      await EventService.createEvent(anotherUser._id.toString(), anotherOrganizerEvent);
    });

    it("should return only events for the specified organizer", async () => {
      const events = await EventService.getOrganizerEvents(organizerId) as WithId<IEvent>[];

      expect(events.length).toBe(3);

      // Check that all returned events belong to the organizer
      events.forEach(event => {
        expect(event.organizer.toString()).toBe(organizerId);
      });
    });

    it("should implement pagination correctly", async () => {
      // First page with limit 2
      const page1 = await EventService.getOrganizerEvents(organizerId, 1, 2) as WithId<IEvent>[];
      expect(page1.length).toBe(2);

      // Second page with limit 2
      const page2 = await EventService.getOrganizerEvents(organizerId, 2, 2) as WithId<IEvent>[];
      expect(page2.length).toBe(1);

      // Ensure they're different events
      const page1Ids = page1.map(e => e._id.toString());
      const page2Ids = page2.map(e => e._id.toString());

      expect(page1Ids).not.toContain(page2Ids[0]);
    });

    it("should return empty array when organizer has no events", async () => {
      // Create a new user with no events
      const newUser = await createTestUser({
        email: `noevents${Date.now()}@eventservicetest.com`,
        password: "Password123!",
        firstName: "No",
        lastName: "Events",
      }) as WithId<IUser>;

      const events = await EventService.getOrganizerEvents(newUser._id.toString());
      expect(Array.isArray(events)).toBe(true);
      expect(events.length).toBe(0);
    });
  });

  describe("findEvents method", () => {
    beforeEach(async () => {
      // Create multiple events with different properties for testing search
      const events = [
        {
          name: "Rock Concert",
          description: "A rock concert",
          eventType: EventType.CONCERT,
          date: {
            start: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000),
          },
          venue: testVenue._id,
          organizer: new mongoose.Types.ObjectId(organizerId),
          ticketInfo: {
            price: 50,
            totalTickets: 100,
            soldTickets: 0,
          },
          status: EventStatus.PUBLISHED,
          isPrivate: false,
        },
        {
          name: "Jazz Festival",
          description: "A jazz festival",
          eventType: EventType.FESTIVAL,
          date: {
            start: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            end: new Date(Date.now() + 16 * 24 * 60 * 60 * 1000),
          },
          venue: testVenue._id,
          organizer: new mongoose.Types.ObjectId(organizerId),
          ticketInfo: {
            price: 100,
            totalTickets: 500,
            soldTickets: 0,
          },
          status: EventStatus.PUBLISHED,
          isPrivate: false,
        },
        {
          name: "Private Party",
          description: "A private party",
          eventType: EventType.PRIVATE_EVENT,
          date: {
            start: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
            end: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 5 * 60 * 60 * 1000),
          },
          venue: testVenue._id,
          organizer: new mongoose.Types.ObjectId(organizerId),
          ticketInfo: {
            price: 150,
            totalTickets: 50,
            soldTickets: 0,
          },
          status: EventStatus.PUBLISHED,
          isPrivate: true,
        },
        {
          name: "Draft Event",
          description: "A draft event",
          eventType: EventType.CONCERT,
          date: {
            start: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
            end: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000),
          },
          venue: testVenue._id,
          organizer: new mongoose.Types.ObjectId(organizerId),
          ticketInfo: {
            price: 75,
            totalTickets: 200,
            soldTickets: 0,
          },
          status: EventStatus.DRAFT,
          isPrivate: false,
        },
      ];

      await Event.insertMany(events);
    });

    it("should find only published and non-private events by default", async () => {
      const results = await EventService.findEvents({}) as WithId<IEvent>[];

      expect(results.length).toBe(2); // Only the rock concert and jazz festival

      // Verify none are private
      expect(results.some(event => event.isPrivate)).toBe(false);

      // Verify all are published
      expect(results.every(event => event.status === EventStatus.PUBLISHED)).toBe(true);
    });

    it("should find events by date range", async () => {
      const results = await EventService.findEvents({
        startDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      });

      expect(results.length).toBe(1);
      expect(results[0].name).toBe("Jazz Festival");
    });

    it("should find events by event type", async () => {
      const results = await EventService.findEvents({
        eventType: EventType.FESTIVAL,
      });

      expect(results.length).toBe(1);
      expect(results[0].name).toBe("Jazz Festival");
      expect(results[0].eventType).toBe(EventType.FESTIVAL);
    });

    it("should find events by price range", async () => {
      const results = await EventService.findEvents({
        minPrice: 75,
        maxPrice: 125,
      });

      expect(results.length).toBe(1);
      expect(results[0].name).toBe("Jazz Festival");
      expect(results[0].ticketInfo.price).toBe(100);
    });

    it("should implement pagination correctly", async () => {
      // Add more published events to test pagination
      const moreEvents = [
        {
          name: "Extra Event 1",
          description: "Extra event 1",
          eventType: EventType.CONCERT,
          date: {
            start: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
            end: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000),
          },
          venue: testVenue._id,
          organizer: new mongoose.Types.ObjectId(organizerId),
          ticketInfo: {
            price: 60,
            totalTickets: 100,
            soldTickets: 0,
          },
          status: EventStatus.PUBLISHED,
          isPrivate: false,
        },
        {
          name: "Extra Event 2",
          description: "Extra event 2",
          eventType: EventType.CONCERT,
          date: {
            start: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
            end: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000),
          },
          venue: testVenue._id,
          organizer: new mongoose.Types.ObjectId(organizerId),
          ticketInfo: {
            price: 70,
            totalTickets: 100,
            soldTickets: 0,
          },
          status: EventStatus.PUBLISHED,
          isPrivate: false,
        },
      ];

      await Event.insertMany(moreEvents);

      // First page with limit 2
      const page1 = await EventService.findEvents({}, 1, 2) as WithId<IEvent>[];
      expect(page1.length).toBe(2);

      // Second page with limit 2
      const page2 = await EventService.findEvents({}, 2, 2) as WithId<IEvent>[];
      expect(page2.length).toBe(2);

      // Make sure events from page1 aren't in page2
      const page1Ids = page1.map(e => e._id.toString());
      const page2Ids = page2.map(e => e._id.toString());

      expect(page1Ids.some(id => page2Ids.includes(id))).toBe(false);
    });
  });
});