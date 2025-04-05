import request from "supertest";
import mongoose, { ObjectId } from "mongoose";
import { Express } from "express";
import { createApp } from "../../app/createApp";
import { initializeDatabase, closeDatabase } from "../../app/config/database";
import User, { UserRole } from "../../app/models/User";
import Venue, { VenueType } from "../../app/models/Venue";
import { createTestUser, createToken, testUserData } from "../helpers";
import "dotenv/config";

describe("Venue Controller", () => {
  let app: Express;
  let testUser: any;
  let organizerUser: any;
  let adminUser: any;
  let testVenue: any;
  let userToken: string;
  let organizerToken: string;
  let adminToken: string;

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
    app = await createApp();
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Venue.deleteMany({});
    await closeDatabase();
  });

  beforeEach(async () => {
    // Create users with different roles
    testUser = await createTestUser({
      ...testUserData,
      email: `user${Date.now()}@venuecontrollertest.com`,
      role: UserRole.USER,
    });

    organizerUser = await createTestUser({
      ...testUserData,
      email: `organizer${Date.now()}@venuecontrollertest.com`,
      role: UserRole.ORGANIZER,
    });

    adminUser = await createTestUser({
      ...testUserData,
      email: `admin${Date.now()}@venuecontrollertest.com`,
      role: UserRole.ADMIN,
    });

    // Generate tokens
    userToken = createToken(testUser);
    organizerToken = createToken(organizerUser);
    adminToken = createToken(adminUser);

    // Create a test venue
    testVenue = await Venue.create({
      ...testVenueData,
      owner: organizerUser._id,
    });
  });

  afterEach(async () => {
    await User.deleteMany({ email: /@venuecontrollertest.com/ });
    await Venue.deleteMany({});
  });

  describe("POST /venues", () => {
    it("should create a venue when authenticated as organizer", async () => {
      const venueData = {
        ...testVenueData,
        name: "New Test Venue",
      };

      try {
        organizerUser = await createTestUser({
          ...testUserData,
          email: `neworganizer${Date.now()}@venuecontrollertest.com`,
          role: UserRole.ORGANIZER,
        });
        organizerToken = createToken(organizerUser);
      } catch (error) {}

      const response = await request(app)
        .post("/v1/venues")
        .set("Authorization", `Bearer ${organizerToken}`)
        .send(venueData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty("name", venueData.name);
      expect(response.body.data).toHaveProperty(
        "owner",
        organizerUser._id.toString()
      );
    });

    it("should create a venue when authenticated as admin", async () => {
      const venueData = {
        ...testVenueData,
        name: "Admin Created Venue",
      };

      const response = await request(app)
        .post("/v1/venues")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(venueData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty("name", venueData.name);
    });

    it("should return 403 when authenticated as regular user", async () => {
      try {
        testUser = await createTestUser(testUserData);
        userToken = createToken(testUser);
      } catch (error) {}

      const response = await request(app)
        .post("/v1/venues")
        .set("Authorization", `Bearer ${userToken}`)
        .send(testVenueData);

      expect(response.status).toBe(403);
    });

    it("should return 401 when not authenticated", async () => {
      const response = await request(app)
        .post("/v1/venues")
        .send(testVenueData);

      expect(response.status).toBe(401);
    });

    it("should return 400 when validation fails", async () => {
      // Create data with missing required fields
      const invalidData = {
        name: "Invalid Venue",
        // Missing other required fields
      };

      const response = await request(app)
        .post("/v1/venues")
        .set("Authorization", `Bearer ${organizerToken}`)
        .send(invalidData);

      expect(response.status).toBe(400);
    });
  });

  describe("GET /venues/:id", () => {
    it("should get a venue by ID", async () => {
      const response = await request(app)
        .get(`/v1/venues/${testVenue._id}`)
        .send();

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty(
        "_id",
        testVenue._id.toString()
      );
      expect(response.body.data).toHaveProperty("name", testVenue.name);
    });

    it("should return 404 for non-existent venue ID", async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();

      const response = await request(app)
        .get(`/v1/venues/${nonExistentId}`)
        .send();

      expect(response.status).toBe(404);
    });

    it("should return 400 for invalid venue ID format", async () => {
      const response = await request(app)
        .get("/v1/venues/invalid-id-format")
        .send();

      expect(response.status).toBe(400);
    });
  });

  describe("GET /venues", () => {
    beforeEach(async () => {
      // Create additional venues for testing search/filters
      const venues = [
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
      ];

      await Venue.insertMany(venues);
    });

    it("should return a list of venues", async () => {
      const response = await request(app).get("/v1/venues").send();

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it("should filter venues by name", async () => {
      const response = await request(app)
        .get("/v1/venues")
        .query({ name: "Club" })
        .send();

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0].name).toContain("Club");
    });

    it("should filter venues by city", async () => {
      const response = await request(app)
        .get("/v1/venues")
        .query({ city: "Small Town" })
        .send();

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // All venues should be in Small Town
      const allInCity = response.body.data.every(
        (venue: any) => venue.location.city === "Small Town"
      );
      expect(allInCity).toBe(true);
    });

    it("should filter venues by venue type", async () => {
      const response = await request(app)
        .get("/v1/venues")
        .query({ venueType: VenueType.STADIUM })
        .send();

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // All venues should be of type STADIUM
      const allStadiums = response.body.data.every(
        (venue: any) => venue.venueType === VenueType.STADIUM
      );
      expect(allStadiums).toBe(true);
    });

    it("should filter venues by capacity range", async () => {
      const response = await request(app)
        .get("/v1/venues")
        .query({ minCapacity: 5000, maxCapacity: 15000 })
        .send();

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // All venues should have capacity in range
      const allInCapacityRange = response.body.data.every(
        (venue: any) => venue.capacity >= 5000 && venue.capacity <= 15000
      );
      expect(allInCapacityRange).toBe(true);
    });

    it("should paginate results correctly", async () => {
      // We'll create venues with a more deterministic approach
      // First, clear all existing venues to have a clean slate
      await Venue.deleteMany({});

      // Create venues with guaranteed sequential creation dates
      // by adding delays between creations
      for (let i = 1; i <= 6; i++) {
        await Venue.create({
          name: `Pagination Venue ${i}`,
          location: {
            address: `${i} Pagination St`,
            city: `Test City ${i}`,
            state: "Test State",
            country: "Test Country",
            zipCode: "12345",
          },
          capacity: 1000 * i,
          venueType: VenueType.CONCERT_HALL,
          description: `Pagination test venue ${i}`,
          contactInfo: {
            email: `venue${i}@test.com`,
            phone: `12345${i}`,
          },
          owner: organizerUser._id,
        });

        // Add a small delay to ensure created timestamps are different
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      // Get first page with 2 items per page, sorted by creation date (newest first)
      const page1Response = await request(app)
        .get("/v1/venues")
        .query({ page: 1, limit: 2 })
        .send();

      expect(page1Response.status).toBe(200);
      expect(page1Response.body.data.length).toBe(2);

      // Get second page with 2 items per page
      const page2Response = await request(app)
        .get("/v1/venues")
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

      // Ensure no overlap between the two sets
      const hasOverlap = [...firstPageIds].some((id) => secondPageIds.has(id));
      expect(hasOverlap).toBe(false);
    });
  });

  describe("GET /venues/my-venues", () => {
    beforeEach(async () => {
      // Create additional venues for the organizer
      await Venue.create([
        {
          name: "Organizer's Venue 1",
          location: {
            address: "123 Organizer St",
            city: "My City",
            state: "My State",
            country: "My Country",
            zipCode: "12345",
          },
          capacity: 500,
          venueType: VenueType.CONCERT_HALL,
          description: "Organizer's first venue",
          contactInfo: {
            email: "venue1@organizer.com",
            phone: "1234567890",
          },
          owner: organizerUser._id,
        },
        {
          name: "Organizer's Venue 2",
          location: {
            address: "456 Organizer St",
            city: "My City",
            state: "My State",
            country: "My Country",
            zipCode: "12345",
          },
          capacity: 800,
          venueType: VenueType.CLUB,
          description: "Organizer's second venue",
          contactInfo: {
            email: "venue2@organizer.com",
            phone: "0987654321",
          },
          owner: organizerUser._id,
        },
      ]);
    });

    it("should return venues owned by the authenticated user", async () => {
      const response = await request(app)
        .get("/v1/venues/my-venues")
        .set("Authorization", `Bearer ${organizerToken}`)
        .send();

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);

      // All venues should be owned by the organizer
      const allOwnedByOrganizer = response.body.data.every(
        (venue: any) => venue.owner.toString() === organizerUser._id.toString()
      );
      expect(allOwnedByOrganizer).toBe(true);
    });

    it("should return 401 when not authenticated", async () => {
      const response = await request(app).get("/v1/venues/my-venues").send();

      expect(response.status).toBe(401);
    });

    it("should return empty array when user has no venues", async () => {
      const response = await request(app)
        .get("/v1/venues/my-venues")
        .set("Authorization", `Bearer ${userToken}`)
        .send();

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(0);
    });
  });

  describe("PUT /venues/:id", () => {
    it("should update a venue when authenticated as owner", async () => {
      const freshOrganizer = await createTestUser({
        ...testUserData,
        email: `freshorganizer${Date.now()}@venuecontrollertest.com`,
        role: UserRole.ORGANIZER,
      });

      const freshOrganizerToken = createToken(freshOrganizer);

      // Create a completely fresh venue specifically for this test
      const venueToUpdate = await Venue.create({
        name: "Update Test Venue",
        location: {
          address: "123 Update Street",
          city: "Update City",
          state: "Update State",
          country: "Update Country",
          zipCode: "12345",
        },
        capacity: 500,
        venueType: VenueType.CONCERT_HALL,
        description: "A venue to be updated",
        contactInfo: {
          email: "update@test.com",
          phone: "5551234567",
        },
        owner: freshOrganizer._id,
      });

      // Double check that the venue was created with the correct owner
      const savedVenue = await Venue.findById(venueToUpdate._id);
      expect(savedVenue?.owner.toString()).toBe(
        (freshOrganizer._id as ObjectId).toString()
      );

      const updateData = {
        name: "Updated Venue Name",
        description: "Updated venue description",
        capacity: 1200,
      };

      const response = await request(app)
        .put(`/v1/venues/${(venueToUpdate._id as ObjectId).toString()}`)
        .set("Authorization", `Bearer ${freshOrganizerToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty("name", updateData.name);
      expect(response.body.data).toHaveProperty(
        "description",
        updateData.description
      );
      expect(response.body.data).toHaveProperty(
        "capacity",
        updateData.capacity
      );
    });

    it("should update a venue when authenticated as admin", async () => {
      const updateData = {
        name: "Admin Updated Venue",
        isVerified: true,
      };

      const response = await request(app)
        .put(`/v1/venues/${testVenue._id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty("name", updateData.name);
      expect(response.body.data).toHaveProperty("isVerified", true);
    });

    it("should return 403 when trying to update someone else's venue", async () => {
      const updateData = {
        name: "Unauthorized Update",
      };

      const response = await request(app)
        .put(`/v1/venues/${testVenue._id}`)
        .set("Authorization", `Bearer ${userToken}`)
        .send(updateData);

      expect(response.status).toBe(403);
    });

    it("should return 401 when not authenticated", async () => {
      const updateData = {
        name: "Unauthenticated Update",
      };

      const response = await request(app)
        .put(`/v1/venues/${testVenue._id}`)
        .send(updateData);

      expect(response.status).toBe(401);
    });

    it("should return 400 when validation fails", async () => {
      const invalidData = {
        capacity: "not-a-number", // Should be a number
      };

      const response = await request(app)
        .put(`/v1/venues/${testVenue._id}`)
        .set("Authorization", `Bearer ${organizerToken}`)
        .send(invalidData);

      expect(response.status).toBe(400);
    });
  });

  describe("DELETE /venues/:id", () => {
    it("should delete a venue when authenticated as owner", async () => {
      // Create a fresh organizer for this specific test
      const deleteTestOrganizer = await createTestUser({
        ...testUserData,
        email: `deleteorganizer${Date.now()}@venuecontrollertest.com`,
        role: UserRole.ORGANIZER,
      });

      const deleteOrganizerToken = createToken(deleteTestOrganizer);

      // Create a venue owned by this specific organizer
      const venueToDelete = await Venue.create({
        name: "Delete Test Venue",
        location: {
          address: "123 Delete Street",
          city: "Delete City",
          state: "Delete State",
          country: "Delete Country",
          zipCode: "12345",
        },
        capacity: 300,
        venueType: VenueType.CLUB,
        description: "A venue to be deleted",
        contactInfo: {
          email: "delete@test.com",
          phone: "5559876543",
        },
        owner: deleteTestOrganizer._id,
      });

      // Verify the venue was created with the correct owner
      const savedVenue = await Venue.findById(venueToDelete._id);
      expect(savedVenue?.owner.toString()).toBe(
        (deleteTestOrganizer._id as ObjectId).toString()
      );

      const response = await request(app)
        .delete(`/v1/venues/${(venueToDelete._id as ObjectId).toString()}`)
        .set("Authorization", `Bearer ${deleteOrganizerToken}`)
        .send();

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify the venue was actually deleted
      const venueCheck = await Venue.findById(venueToDelete._id);
      expect(venueCheck).toBeNull();
    });

    it("should delete a venue when authenticated as admin", async () => {
      // Create a separate venue for admin deletion test
      const adminDeleteVenue = await Venue.create({
        name: "Admin Delete Test Venue",
        location: {
          address: "456 Admin Delete Street",
          city: "Admin City",
          state: "Admin State",
          country: "Admin Country",
          zipCode: "54321",
        },
        capacity: 1500,
        venueType: VenueType.STADIUM,
        description: "A venue to be deleted by admin",
        contactInfo: {
          email: "admindelete@test.com",
          phone: "5551112222",
        },
        owner: organizerUser._id,
      });

      const response = await request(app)
        .delete(`/v1/venues/${adminDeleteVenue._id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send();

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify the venue was actually deleted
      const venueCheck = await Venue.findById(adminDeleteVenue._id);
      expect(venueCheck).toBeNull();
    });

    it("should return 403 when trying to delete someone else's venue", async () => {
      const response = await request(app)
        .delete(`/v1/venues/${testVenue._id}`)
        .set("Authorization", `Bearer ${userToken}`)
        .send();

      expect(response.status).toBe(403);
    });

    it("should return 401 when not authenticated", async () => {
      const response = await request(app)
        .delete(`/v1/venues/${testVenue._id}`)
        .send();

      expect(response.status).toBe(401);
    });
  });

  describe("PATCH /venues/:id/verify", () => {
    it("should verify a venue when authenticated as admin", async () => {
      const response = await request(app)
        .patch(`/v1/venues/${testVenue._id}/verify`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send();

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty("isVerified", true);
    });

    it("should return 403 when trying to verify a venue as non-admin", async () => {
      const response = await request(app)
        .patch(`/v1/venues/${testVenue._id}/verify`)
        .set("Authorization", `Bearer ${organizerToken}`)
        .send();

      expect(response.status).toBe(403);
    });

    it("should return 401 when not authenticated", async () => {
      const response = await request(app)
        .patch(`/v1/venues/${testVenue._id}/verify`)
        .send();

      expect(response.status).toBe(401);
    });
  });

  // For file uploads, we'll mock the behavior since we don't want to interact with S3 in tests
  describe("POST /venues/:id/images", () => {
    it("should return 401 when not authenticated", async () => {
      const response = await request(app)
        .post(`/v1/venues/${testVenue._id}/images`)
        .set("Content-Type", "multipart/form-data")
        .send();

      expect(response.status).toBe(401);
    });

    it("should return 403 when trying to upload images to someone else's venue", async () => {
      // This test should verify authorization before checking for files
      // So we need to modify the test to simulate having files attached
      const freshVenue = await Venue.create({
        ...testVenueData,
        owner: organizerUser._id, // Create a venue owned by the organizer
      });

      // Mock file upload request but from unauthorized user
      const response = await request(app)
        .post(`/v1/venues/${freshVenue._id}/images`)
        .set("Authorization", `Bearer ${userToken}`) // Regular user, not the owner
        .set("Content-Type", "multipart/form-data")
        .attach("images", Buffer.from("test image content"), "test-image.jpg"); // Attach a test file

      expect(response.status).toBe(403);
    });

    it("should return 400 when no images are uploaded", async () => {
      const response = await request(app)
        .post(`/v1/venues/${testVenue._id}/images`)
        .set("Authorization", `Bearer ${organizerToken}`)
        .set("Content-Type", "multipart/form-data")
        .send();

      expect(response.status).toBe(400);
    });
  });
});
