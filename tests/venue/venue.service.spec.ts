import mongoose from "mongoose";
import { initializeDatabase, closeDatabase } from "../../app/config/database";
import VenueService from "../../app/services/VenueService";
import User, { UserRole } from "../../app/models/User";
import Venue, { VenueType, IVenue } from "../../app/models/Venue";
import { AppError } from "../../app/middleware/errorHandler";
import { createTestUser } from "../helpers";

describe("Venue Service", () => {
  let testUser: any;
  let organizerUser: any;
  let adminUser: any;
  let testVenue: IVenue;

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
        longitude: -74.0060,
      }
    },
    capacity: 1000,
    venueType: VenueType.CONCERT_HALL,
    amenities: ["Parking", "Sound System", "Lighting"],
    description: "A test venue for unit testing",
    contactInfo: {
      email: "venue@testmail.com",
      phone: "+1234567890",
      website: "https://testvenue.com"
    }
  };

  beforeAll(async () => {
    await initializeDatabase();
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Venue.deleteMany({});
    await closeDatabase();
  });

  beforeEach(async () => {
    // Create test users with different roles
    testUser = await createTestUser({
      email: `user${Date.now()}@venueservice.test`,
      password: "Password123!",
      firstName: "Test",
      lastName: "User",
      role: UserRole.USER
    });

    organizerUser = await createTestUser({
      email: `organizer${Date.now()}@venueservice.test`,
      password: "Password123!",
      firstName: "Test",
      lastName: "Organizer",
      role: UserRole.ORGANIZER
    });

    adminUser = await createTestUser({
      email: `admin${Date.now()}@venueservice.test`,
      password: "Password123!",
      firstName: "Test",
      lastName: "Admin",
      role: UserRole.ADMIN
    });

    // Create a test venue
    testVenue = await Venue.create({
      ...testVenueData,
      owner: organizerUser._id
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
        name: "New Service Test Venue"
      };

      const venue = await VenueService.createVenue(organizerUser._id.toString(), venueData);

      expect(venue).toBeDefined();
      expect(venue.name).toBe(venueData.name);
      expect(venue.owner.toString()).toBe(organizerUser._id.toString());
      expect(venue.isVerified).toBe(false);
    });

    it("should throw an error if user does not exist", async () => {
      const nonExistentUserId = new mongoose.Types.ObjectId().toString();

      await expect(VenueService.createVenue(nonExistentUserId, testVenueData))
        .rejects
        .toThrow("User not found");
    });
  });

  describe("getVenueById", () => {
    it("should retrieve a venue by ID", async () => {
      const venue = await VenueService.getVenueById(testVenue._id.toString());

      expect(venue).toBeDefined();
      expect(venue._id.toString()).toBe(testVenue._id.toString());
      expect(venue.name).toBe(testVenue.name);
    });

    it("should throw an error if venue does not exist", async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();

      await expect(VenueService.getVenueById(nonExistentId))
        .rejects
        .toThrow("Venue not found");
    });
  });

  describe("getUserVenues", () => {
    beforeEach(async () => {
      // Create multiple venues for the organizer
      await Venue.create([
        {
          ...testVenueData,
          name: "Organizer Venue 1",
          owner: organizerUser._id
        },
        {
          ...testVenueData,
          name: "Organizer Venue 2",
          owner: organizerUser._id
        }
      ]);
    });

    it("should return venues owned by a user", async () => {
      const result = await VenueService.getUserVenues(organizerUser._id.toString());

      expect(result.venues).toBeDefined();
      expect(Array.isArray(result.venues)).toBe(true);
      expect(result.venues.length).toBeGreaterThan(0);

      // All venues should be owned by the organizer
      result.venues.forEach(venue => {
        expect(venue.owner.toString()).toBe(organizerUser._id.toString());
      });
    });

    it("should return pagination information", async () => {
      const result = await VenueService.getUserVenues(organizerUser._id.toString(), 1, 2);

      expect(result).toHaveProperty("total");
      expect(result).toHaveProperty("page", 1);
      expect(result).toHaveProperty("pages");
      expect(result.venues.length).toBeLessThanOrEqual(2);
    });

    it("should return empty array if user has no venues", async () => {
      const result = await VenueService.getUserVenues(testUser._id.toString());

      expect(result.venues).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe("updateVenue", () => {
    it("should update a venue when owner is updating", async () => {
      const updateData = {
        name: "Updated Service Venue",
        description: "Updated description",
        capacity: 1500
      };

      const updatedVenue = await VenueService.updateVenue(
        testVenue._id.toString(),
        organizerUser._id.toString(),
        updateData
      );

      expect(updatedVenue.name).toBe(updateData.name);
      expect(updatedVenue.description).toBe(updateData.description);
      expect(updatedVenue.capacity).toBe(updateData.capacity);
    });

    it("should update a venue when admin is updating", async () => {
      const updateData = {
        name: "Admin Updated Venue",
        isVerified: true
      };

      const updatedVenue = await VenueService.updateVenue(
        testVenue._id.toString(),
        adminUser._id.toString(),
        updateData
      );

      expect(updatedVenue.name).toBe(updateData.name);
      expect(updatedVenue.isVerified).toBe(true);
    });

    it("should throw error when non-owner/non-admin tries to update", async () => {
      const updateData = {
        name: "Unauthorized Update"
      };

      await expect(
        VenueService.updateVenue(
          testVenue._id.toString(),
          testUser._id.toString(),
          updateData
        )
      ).rejects.toThrow("You are not authorized to update this venue");
    });

    it("should throw error when non-admin tries to update isVerified", async () => {
      const updateData = {
        name: "Valid Update",
        isVerified: true
      };

      await expect(
        VenueService.updateVenue(
          testVenue._id.toString(),
          organizerUser._id.toString(),
          updateData
        )
      ).rejects.toThrow("Only administrators can verify venues");
    });
  });

  describe("deleteVenue", () => {
    it("should delete a venue when owner is deleting", async () => {
      await VenueService.deleteVenue(
        testVenue._id.toString(),
        organizerUser._id.toString()
      );

      // Verify venue is deleted
      const venueCheck = await Venue.findById(testVenue._id);
      expect(venueCheck).toBeNull();
    });

    it("should delete a venue when admin is deleting", async () => {
      await VenueService.deleteVenue(
        testVenue._id.toString(),
        adminUser._id.toString()
      );

      // Verify venue is deleted
      const venueCheck = await Venue.findById(testVenue._id);
      expect(venueCheck).toBeNull();
    });

    it("should throw error when non-owner/non-admin tries to delete", async () => {
      await expect(
        VenueService.deleteVenue(
          testVenue._id.toString(),
          testUser._id.toString()
        )
      ).rejects.toThrow("You are not authorized to delete this venue");
    });

    it("should throw error for non-existent venue ID", async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();

      await expect(
        VenueService.deleteVenue(
          nonExistentId,
          adminUser._id.toString()
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
            zipCode: "54321"
          },
          capacity: 10000,
          venueType: VenueType.STADIUM,
          description: "A large stadium for events",
          contactInfo: {
            email: "stadium@test.com",
            phone: "1234567890"
          },
          owner: organizerUser._id,
          isVerified: true
        },
        {
          name: "Small Club",
          location: {
            address: "789 Club Lane",
            city: "Small Town",
            state: "Old State",
            country: "USA",
            zipCode: "98765"
          },
          capacity: 200,
          venueType: VenueType.CLUB,
          description: "A cozy club for intimate performances",
          contactInfo: {
            email: "club@test.com",
            phone: "0987654321"
          },
          owner: organizerUser._id
        },
        {
          name: "Medium Venue",
          location: {
            address: "101 Mid Avenue",
            city: "Mid City",
            state: "Mid State",
            country: "Canada",
            zipCode: "M1D123"
          },
          capacity: 500,
          venueType: VenueType.CONCERT_HALL,
          description: "A medium-sized concert hall",
          contactInfo: {
            email: "mid@test.com",
            phone: "5555555555"
          },
          owner: testUser._id,
          isVerified: false
        }
      ]);
    });

    it("should find all venues without filters", async () => {
      const result = await VenueService.findVenues();

      expect(result.venues).toBeDefined();
      expect(result.total).toBeGreaterThan(0);
      expect(result.venues.length).toBeGreaterThan(0);
    });

    it("should filter venues by name", async () => {
      const result = await VenueService.findVenues({ name: "Club" });

      result.venues.forEach(venue => {
        expect(venue.name.toLowerCase()).toContain("club");
      });
    });

    it("should filter venues by city", async () => {
      const result = await VenueService.findVenues({ city: "Small Town" });

      result.venues.forEach(venue => {
        expect(venue.location.city).toBe("Small Town");
      });
    });

    it("should filter venues by venue type", async () => {
      const result = await VenueService.findVenues({ venueType: VenueType.STADIUM });

      result.venues.forEach(venue => {
        expect(venue.venueType).toBe(VenueType.STADIUM);
      });
    });

    it("should filter venues by capacity range", async () => {
      const result = await VenueService.findVenues({
        minCapacity: 5000,
        maxCapacity: 15000
      });

      result.venues.forEach(venue => {
        expect(venue.capacity).toBeGreaterThanOrEqual(5000);
        expect(venue.capacity).toBeLessThanOrEqual(15000);
      });
    });

    it("should filter venues by verified status", async () => {
      const result = await VenueService.findVenues({ isVerified: true });

      result.venues.forEach(venue => {
        expect(venue.isVerified).toBe(true);
      });
    });

    it("should filter venues by owner", async () => {
      const result = await VenueService.findVenues({
        owner: testUser._id.toString()
      });

      result.venues.forEach(venue => {
        expect(venue.owner.toString()).toBe(testUser._id.toString());
      });
    });

    it("should handle pagination", async () => {
      const page1 = await VenueService.findVenues({}, 1, 1);
      const page2 = await VenueService.findVenues({}, 2, 1);

      expect(page1.venues.length).toBe(1);
      expect(page2.venues.length).toBe(1);
      expect(page1.venues[0]._id.toString()).not.toBe(page2.venues[0]._id.toString());
    });
  });

  describe("verifyVenue", () => {
    it("should verify a venue", async () => {
      const venue = await VenueService.verifyVenue(testVenue._id.toString());

      expect(venue.isVerified).toBe(true);
    });

    it("should throw error for non-existent venue ID", async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();

      await expect(VenueService.verifyVenue(nonExistentId))
        .rejects
        .toThrow("Venue not found");
    });
  });

  // For uploadVenueImages, we would need to mock the S3 upload functionality
  // This is a more complex test that requires mocking external dependencies
  describe("uploadVenueImages", () => {
    it("should throw error when user is not authorized", async () => {
      const mockFiles: Express.Multer.File[] = [
        {
          fieldname: "images",
          originalname: "test.jpg",
          encoding: "7bit",
          mimetype: "image/jpeg",
          buffer: Buffer.from("test"),
          size: 4,
          destination: "",
          filename: "test.jpg",
          path: "/tmp/test.jpg",
          stream: undefined as any
        }
      ];

      await expect(
        VenueService.uploadVenueImages(
          testVenue._id.toString(),
          testUser._id.toString(),
          mockFiles
        )
      ).rejects.toThrow("You are not authorized to upload images for this venue");
    });

    // Additional tests for uploadVenueImages would require mocking S3 interactions
  });
});