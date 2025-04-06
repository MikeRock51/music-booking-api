import mongoose, { Types, ObjectId } from "mongoose";
import { initializeDatabase, closeDatabase } from "../../app/config/database";
import VenueService from "../../app/services/VenueService";
import User, { UserRole } from "../../app/models/User";
import Venue, { VenueType, IVenue } from "../../app/models/Venue";
import { AppError } from "../../app/middleware/errorHandler";
import { createTestUser } from "../helpers";

describe("Venue Service", () => {
  let venueService: VenueService;
  let testUser: any;
  let organizerUser: any;
  let adminUser: any;
  let testVenue: IVenue;
  const adminUserData = {
    email: `admin${Date.now()}@venueservice.test`,
    password: "Password123!",
    firstName: "Test",
    lastName: "Admin",
    role: UserRole.ADMIN,
  };
  const testUserData = {
    email: `user${Date.now()}@venueservice.test`,
    password: "Password123!",
    firstName: "Test",
    lastName: "User",
    role: UserRole.USER,
  };
  const organizerUserData = {
    email: `organizer${Date.now()}@venueservice.test`,
    password: "Password123!",
    firstName: "Test",
    lastName: "Organizer",
    role: UserRole.ORGANIZER,
  };

  // Test venue data
  const testVenueData = {
    name: "Test Venue",
    location: {
      address: "123 Test Street",
      city: "Test City",
      state: "Test State",
      country: "Test Country",
      zipCode: "12345",
      coordinates: {
        latitude: 40.7128,
        longitude: -74.006,
      },
    },
    capacity: 1000,
    venueType: VenueType.CONCERT_HALL,
    amenities: ["Parking", "Sound System", "Lighting"],
    description: "A test venue for unit testing",
    contactInfo: {
      email: "venue@testmail.com",
      phone: "+1234567890",
      website: "https://testvenue.com",
    },
  };

  beforeAll(async () => {
    await initializeDatabase();
  });

  afterAll(async () => {
    await User.deleteMany({ email: /@venueservice.test/ });
    await Venue.deleteMany({});
    await closeDatabase();
  });

  beforeEach(async () => {
    // Create a new VenueService instance for each test
    venueService = new VenueService();

    // Create test users with different roles
    testUser = await createTestUser(testUserData);

    organizerUser = await createTestUser(organizerUserData);

    adminUser = await createTestUser(adminUserData);

    // Create a test venue
    testVenue = await Venue.create({
      ...testVenueData,
      owner: organizerUser._id,
    });
  });

  afterEach(async () => {
    await User.deleteMany({ email: /@venueservice\.test/ });
    await Venue.deleteMany({});
  });

  describe("createVenue", () => {
    it("should create a venue successfully", async () => {
      const venueData = {
        ...testVenueData,
        name: "New Service Test Venue",
      };

      try {
        organizerUser = await createTestUser(organizerUserData);
      } catch (error) {}

      const venue = await venueService.createVenue(
        (organizerUser._id as Types.ObjectId).toString(),
        venueData
      );

      expect(venue).toBeDefined();
      expect(venue.name).toBe(venueData.name);
      expect(venue.owner.toString()).toBe(
        (organizerUser._id as Types.ObjectId).toString()
      );
      expect(venue.isVerified).toBe(false);
    });

    it("should throw an error if user does not exist", async () => {
      const nonExistentUserId = new mongoose.Types.ObjectId().toString();

      await expect(
        venueService.createVenue(nonExistentUserId, testVenueData)
      ).rejects.toThrow("User not found");
    });
  });

  describe("getVenueById", () => {
    it("should retrieve a venue by ID", async () => {
      const venue = await venueService.getVenueById(
        (testVenue._id as Types.ObjectId).toString()
      );

      expect(venue).toBeDefined();
      expect((venue._id as Types.ObjectId).toString()).toBe(
        (testVenue._id as Types.ObjectId).toString()
      );
      expect(venue.name).toBe(testVenue.name);
    });

    it("should throw an error if venue does not exist", async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();

      await expect(venueService.getVenueById(nonExistentId)).rejects.toThrow(
        "Venue not found"
      );
    });
  });

  describe("getUserVenues", () => {
    beforeEach(async () => {
      // Create multiple venues for the organizer
      await Venue.create([
        {
          ...testVenueData,
          name: "Organizer Venue 1",
          owner: organizerUser._id,
        },
        {
          ...testVenueData,
          name: "Organizer Venue 2",
          owner: organizerUser._id,
        },
      ]);
    });

    it("should return venues owned by a user", async () => {
      const venues = await venueService.getUserVenues(
        (organizerUser._id as Types.ObjectId).toString()
      );

      expect(Array.isArray(venues)).toBe(true);
      expect(venues.length).toBeGreaterThan(0);

      // All venues should be owned by the organizer
      venues.forEach((venue) => {
        expect(venue.owner.toString()).toBe(
          (organizerUser._id as Types.ObjectId).toString()
        );
      });
    });

    it("should paginate results correctly", async () => {
      const venues = await venueService.getUserVenues(
        (organizerUser._id as Types.ObjectId).toString(),
        1,
        2
      );

      expect(Array.isArray(venues)).toBe(true);
      expect(venues.length).toBeLessThanOrEqual(2);
    });

    it("should return empty array if user has no venues", async () => {
      const venues = await venueService.getUserVenues(
        (testUser._id as Types.ObjectId).toString()
      );

      expect(venues).toEqual([]);
    });
  });

  describe("updateVenue", () => {
    it("should update a venue when owner is updating", async () => {
      const updateData = {
        name: "Updated Service Venue",
        description: "Updated description",
        capacity: 1500,
      };

      const updatedVenue = await venueService.updateVenue(
        (testVenue._id as Types.ObjectId).toString(),
        (organizerUser._id as Types.ObjectId).toString(),
        updateData
      );

      expect(updatedVenue.name).toBe(updateData.name);
      expect(updatedVenue.description).toBe(updateData.description);
      expect(updatedVenue.capacity).toBe(updateData.capacity);
    });

    it("should update a venue when admin is updating", async () => {
      const updateData = {
        name: "Admin Updated Venue",
        isVerified: true,
      };

      const updatedVenue = await venueService.updateVenue(
        (testVenue._id as Types.ObjectId).toString(),
        (adminUser._id as Types.ObjectId).toString(),
        updateData
      );

      expect(updatedVenue.name).toBe(updateData.name);
      expect(updatedVenue.isVerified).toBe(true);
    });

    it("should throw error when non-owner/non-admin tries to update", async () => {
      const updateData = {
        name: "Unauthorized Update",
      };

      await expect(
        venueService.updateVenue(
          (testVenue._id as Types.ObjectId).toString(),
          (testUser._id as Types.ObjectId).toString(),
          updateData
        )
      ).rejects.toThrow("You are not authorized to update this venue");
    });

    it("should throw error when non-admin tries to update isVerified", async () => {
      const updateData = {
        name: "Valid Update",
        isVerified: true,
      };

      await expect(
        venueService.updateVenue(
          (testVenue._id as Types.ObjectId).toString(),
          (organizerUser._id as Types.ObjectId).toString(),
          updateData
        )
      ).rejects.toThrow("Only administrators can verify venues");
    });
  });

  describe("deleteVenue", () => {
    it("should delete a venue when owner is deleting", async () => {
      await venueService.deleteVenue(
        (testVenue._id as Types.ObjectId).toString(),
        (organizerUser._id as Types.ObjectId).toString()
      );

      // Verify venue is deleted
      const venueCheck = await Venue.findById(testVenue._id);
      expect(venueCheck).toBeNull();
    });

    it("should delete a venue when admin is deleting", async () => {
      await venueService.deleteVenue(
        (testVenue._id as Types.ObjectId).toString(),
        (adminUser._id as Types.ObjectId).toString()
      );

      // Verify venue is deleted
      const venueCheck = await Venue.findById(testVenue._id);
      expect(venueCheck).toBeNull();
    });

    it("should throw error when non-owner/non-admin tries to delete", async () => {
      await expect(
        venueService.deleteVenue(
          (testVenue._id as Types.ObjectId).toString(),
          (testUser._id as Types.ObjectId).toString()
        )
      ).rejects.toThrow("You are not authorized to delete this venue");
    });

    it("should throw error for non-existent venue ID", async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();

      await expect(
        venueService.deleteVenue(
          nonExistentId,
          (adminUser._id as Types.ObjectId).toString()
        )
      ).rejects.toThrow("Venue not found");
    });
  });

  describe("findVenues", () => {
    beforeEach(async () => {
      // Create test venues with different properties for filtering tests
      await Venue.create([
        {
          name: "Large Stadium",
          location: {
            address: "456 Stadium Drive",
            city: "Big City",
            state: "New State",
            country: "USA",
            zipCode: "54321",
          },
          capacity: 10000,
          venueType: VenueType.STADIUM,
          description: "A large stadium for events",
          contactInfo: {
            email: "stadium@test.com",
            phone: "1234567890",
          },
          owner: organizerUser._id,
          isVerified: true,
        },
        {
          name: "Small Club",
          location: {
            address: "789 Club Lane",
            city: "Small Town",
            state: "Old State",
            country: "USA",
            zipCode: "98765",
          },
          capacity: 200,
          venueType: VenueType.CLUB,
          description: "A cozy club for intimate performances",
          contactInfo: {
            email: "club@test.com",
            phone: "0987654321",
          },
          owner: organizerUser._id,
        },
        {
          name: "Medium Venue",
          location: {
            address: "101 Mid Avenue",
            city: "Mid City",
            state: "Mid State",
            country: "Canada",
            zipCode: "M1D123",
          },
          capacity: 500,
          venueType: VenueType.CONCERT_HALL,
          description: "A medium-sized concert hall",
          contactInfo: {
            email: "mid@test.com",
            phone: "5555555555",
          },
          owner: testUser._id,
          isVerified: false,
        },
      ]);
    });

    it("should find all venues without filters", async () => {
      const venues = await venueService.findVenues();

      expect(Array.isArray(venues)).toBe(true);
      expect(venues.length).toBeGreaterThan(0);
    });

    it("should filter venues by name", async () => {
      const venues = await venueService.findVenues({ name: "Club" });

      venues.forEach((venue) => {
        expect(venue.name.toLowerCase()).toContain("club");
      });
    });

    it("should filter venues by city", async () => {
      const venues = await venueService.findVenues({ city: "Small Town" });

      venues.forEach((venue) => {
        expect(venue.location.city).toBe("Small Town");
      });
    });

    it("should filter venues by state", async () => {
      const venues = await venueService.findVenues({ state: "Mid State" });

      venues.forEach((venue) => {
        expect(venue.location.state).toBe("Mid State");
      });
    });

    it("should filter venues by country", async () => {
      const venues = await venueService.findVenues({ country: "Canada" });

      venues.forEach((venue) => {
        expect(venue.location.country).toBe("Canada");
      });
    });

    it("should filter venues by venue type", async () => {
      const venues = await venueService.findVenues({
        venueType: VenueType.STADIUM,
      });

      venues.forEach((venue) => {
        expect(venue.venueType).toBe(VenueType.STADIUM);
      });
    });

    it("should filter venues by capacity range", async () => {
      const venues = await venueService.findVenues({
        minCapacity: 5000,
        maxCapacity: 15000,
      });

      venues.forEach((venue) => {
        expect(venue.capacity).toBeGreaterThanOrEqual(5000);
        expect(venue.capacity).toBeLessThanOrEqual(15000);
      });
    });

    it("should filter venues by verified status", async () => {
      const venues = await venueService.findVenues({ isVerified: true });

      venues.forEach((venue) => {
        expect(venue.isVerified).toBe(true);
      });
    });

    it("should filter venues by owner", async () => {
      const venues = await venueService.findVenues({
        owner: (testUser._id as Types.ObjectId).toString(),
      });

      venues.forEach((venue) => {
        // Check if owner is populated (object) or just an ID
        const venueOwnerId = venue.owner._id.toString();

        expect(venueOwnerId).toBe((testUser._id as Types.ObjectId).toString());
      });
    });

    it("should handle pagination", async () => {
      const page1 = await venueService.findVenues({}, 1, 1);
      const page2 = await venueService.findVenues({}, 2, 1);

      expect(Array.isArray(page1)).toBe(true);
      expect(Array.isArray(page2)).toBe(true);
      expect(page1.length).toBe(1);
      expect(page2.length).toBe(1);
      expect((page1[0]._id as Types.ObjectId).toString()).not.toBe(
        (page2[0]._id as Types.ObjectId).toString()
      );
    });
  });

  describe("verifyVenue", () => {
    it("should verify a venue", async () => {
      const venue = await venueService.verifyVenue(
        (testVenue._id as Types.ObjectId).toString()
      );

      expect(venue.isVerified).toBe(true);
    });

    it("should throw error for non-existent venue ID", async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();

      await expect(venueService.verifyVenue(nonExistentId)).rejects.toThrow(
        "Venue not found"
      );
    });
  });
});
