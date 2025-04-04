import request from "supertest";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { Express } from "express";
import { createApp } from "../../app/createApp";
import { initializeDatabase, closeDatabase } from "../../app/config/database";
import User, { UserRole } from "../../app/models/User";
import Artist, { MusicGenre } from "../../app/models/Artist";
import {
  createTestUser,
  createToken,
  testArtistUserData,
  testUserData,
} from "../helpers";
import "dotenv/config";

describe("Artist Controller", () => {
  let app: Express;
  let testUser: any;
  let testArtist: any;
  let userToken: string;
  let artistToken: string;

  beforeAll(async () => {
    await initializeDatabase();
    app = await createApp();
  });

  afterAll(async () => {
    await User.deleteMany({ email: /@artisttest.com/ });
    await Artist.deleteMany({});
    await closeDatabase();
  });

  beforeEach(async () => {
    // Create a regular test user
    testUser = await createTestUser(testUserData);

    // Create a user with artist role
    const artistUser = await createTestUser(testArtistUserData);

    // Create an artist profile for the artist user
    testArtist = await Artist.create({
      user: artistUser._id,
      artistName: "Test Artist",
      genres: [MusicGenre.POP, MusicGenre.ROCK],
      bio: "This is a test artist bio",
      location: "Test City",
      rate: {
        amount: 150,
        currency: "USD",
        per: "hour",
      },
      rating: 4.5,
    });

    // Generate tokens for both users
    userToken = createToken(testUser);
    artistToken = createToken(artistUser);
  });

  afterEach(async () => {
    await User.deleteMany({ email: /@artisttest.com/ });
    await Artist.deleteMany({});
  });

  describe("POST /artists/profile", () => {
    it("should create an artist profile when authenticated", async () => {
      const artistData = {
        artistName: "New Artist Profile",
        genres: [MusicGenre.JAZZ, MusicGenre.BLUES],
        bio: "New artist bio for testing",
        location: "Test Location",
        rate: {
          amount: 200,
          currency: "USD",
          per: "hour",
        },
      };

      try {
        testUser = await createTestUser(testUserData);
        userToken = createToken(testUser);
      } catch (error) {}

      const response = await request(app)
        .post("/v1/artists/profile")
        .set("Authorization", `Bearer ${userToken}`)
        .send(artistData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty(
        "artistName",
        artistData.artistName
      );
    });

    it("should return 401 when not authenticated", async () => {
      const artistData = {
        artistName: "New Artist Profile",
        genres: [MusicGenre.JAZZ],
        bio: "Bio text",
        location: "Location",
        rate: {
          amount: 100,
          currency: "USD",
          per: "hour",
        },
      };

      const response = await request(app)
        .post("/v1/artists/profile")
        .send(artistData);

      expect(response.status).toBe(401);
    });

    it("should return 400 when validation fails", async () => {
      // Missing required fields
      const invalidData = {
        artistName: "New Artist",
        // Missing other required fields
      };


      try {
        testArtist = await createTestUser(testArtistUserData);
        artistToken = createToken(testArtist);
      }
      catch (error) {}

      const response = await request(app)
        .post("/v1/artists/profile")
        .set("Authorization", `Bearer ${artistToken}`)
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("status", "error");
    });
  });

  describe("GET /artists/profile", () => {
    it("should get artist profile for authenticated artist user", async () => {
      const response = await request(app)
        .get("/v1/artists/profile")
        .set("Authorization", `Bearer ${artistToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty("artistName");
    });

    it("should return 404 when user has no artist profile", async () => {
      const response = await request(app)
        .get("/v1/artists/profile")
        .set("Authorization", `Bearer ${userToken}`);

      expect(response.status).toBe(404);
    });

    it("should return 401 when not authenticated", async () => {
      const response = await request(app).get("/v1/artists/profile");

      expect(response.status).toBe(401);
    });
  });

  describe("PUT /artists/profile", () => {
    it("should update artist profile when authenticated as artist", async () => {
      const updateData = {
        artistName: "Updated Artist Name",
        bio: "Updated artist bio",
      };

      const response = await request(app)
        .put("/v1/artists/profile")
        .set("Authorization", `Bearer ${artistToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Artist profile updated successfully");
      expect(response.body.data).toHaveProperty(
        "artistName",
        updateData.artistName
      );
      expect(response.body.data).toHaveProperty("bio", updateData.bio);
    });

    it("should return 403 when not authenticated as artist", async () => {
      const updateData = {
        artistName: "Updated Artist Name",
      };

      const response = await request(app)
        .put("/v1/artists/profile")
        .set("Authorization", `Bearer ${userToken}`)
        .send(updateData);

      expect(response.status).toBe(403);
    });
  });

  describe("GET /artists", () => {
    beforeEach(async () => {
      // Create additional artists for testing search/filters
      const artists = [
        {
          user: new mongoose.Types.ObjectId(),
          artistName: "Pop Star",
          genres: [MusicGenre.POP],
          bio: "Pop artist bio",
          location: "Los Angeles",
          rate: {
            amount: 500,
            currency: "USD",
            per: "performance",
          },
          rating: 4.5,
        },
        {
          user: new mongoose.Types.ObjectId(),
          artistName: "Rock Band",
          genres: [MusicGenre.ROCK],
          bio: "Rock band bio",
          location: "Seattle",
          rate: {
            amount: 800,
            currency: "USD",
            per: "performance",
          },
          rating: 4.8,
        },
      ];

      await Artist.insertMany(artists);
    });

    it("should return a list of artists", async () => {
      const response = await request(app).get("/v1/artists").send();

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it("should filter artists by genre", async () => {
      const response = await request(app)
        .get("/v1/artists")
        .query({ genres: MusicGenre.ROCK })
        .send();

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // All returned artists should have the rock genre
      const allHaveRockGenre = response.body.data.every((artist: any) =>
        artist.genres.includes(MusicGenre.ROCK)
      );
      expect(allHaveRockGenre).toBe(true);
    });

    it("should filter artists by location", async () => {
      const response = await request(app)
        .get("/v1/artists")
        .query({ location: "Seattle" })
        .send();

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // All returned artists should have Seattle in their location
      const allInSeattle = response.body.data.every((artist: any) =>
        artist.location.includes("Seattle")
      );
      expect(allInSeattle).toBe(true);
    });

    it("should filter artists by rate range", async () => {
      const response = await request(app)
        .get("/v1/artists")
        .query({ minRate: 600, maxRate: 900 })
        .send();

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // All returned artists should have rates within range
      const allInRateRange = response.body.data.every(
        (artist: any) => artist.rate.amount >= 600 && artist.rate.amount <= 900
      );
      expect(allInRateRange).toBe(true);
    });

    it("should paginate results correctly", async () => {
      // Get first page with 1 item per page
      const page1Response = await request(app)
        .get("/v1/artists")
        .query({ page: 1, limit: 1 })
        .send();

      expect(page1Response.status).toBe(200);
      expect(page1Response.body.data.length).toBe(1);

      // Get second page with 1 item per page
      const page2Response = await request(app)
        .get("/v1/artists")
        .query({ page: 2, limit: 1 })
        .send();

      expect(page2Response.status).toBe(200);
      expect(page2Response.body.data.length).toBe(1);

      // Should be different artists
      expect(page1Response.body.data[0]._id).not.toBe(
        page2Response.body.data[0]._id
      );
    });
  });

  describe("GET /artists/:id", () => {
    it("should get an artist by ID", async () => {
      const response = await request(app)
        .get(`/v1/artists/${testArtist._id}`)
        .send();

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty(
        "_id",
        testArtist._id.toString()
      );
      expect(response.body.data).toHaveProperty(
        "artistName",
        testArtist.artistName
      );
    });

    it("should return 404 for non-existent artist ID", async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const response = await request(app)
        .get(`/v1/artists/${nonExistentId}`)
        .send();

      expect(response.status).toBe(404);
    });

    it("should return 400 for invalid artist ID format", async () => {
      const response = await request(app)
        .get("/v1/artists/invalid-id-format")
        .send();

      expect(response.status).toBe(400);
    });
  });
});
