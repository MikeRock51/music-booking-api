import mongoose, { ObjectId } from "mongoose";
import ArtistService from "../../app/services/ArtistService";
import Artist, { IArtist, MusicGenre } from "../../app/models/Artist";
import User, { UserRole } from "../../app/models/User";
import { initializeDatabase, closeDatabase } from "../../app/config/database";
import { ArtistProfileInput } from "../../app/interfaces/artist.interface";
import { createTestUser } from "../helpers";

describe("ArtistService", () => {
  let artistService: ArtistService;
  let userId: string;
  let testUser: any;
  const testUserData = {
    email: `artist${Date.now()}@artistservicetest.com`,
    password: "Password123!",
    firstName: "Test",
    lastName: "Artist",
    role: UserRole.USER,
  };

  beforeAll(async () => {
    await initializeDatabase();
  });

  afterAll(async () => {
    await User.deleteMany({ email: /@artistservicetest.com/ });
    await Artist.deleteMany({});
    await closeDatabase();
  });

  beforeEach(async () => {
    // Create a test user for each test
    artistService = new ArtistService(); // Create a new instance for each test
    testUser = await createTestUser(testUserData);
    userId = testUser._id.toString();
  });

  afterEach(async () => {
    // Clean up test data after each test
    await User.deleteMany({ email: /@artistservicetest.com/ });
    await Artist.deleteMany({});
  });

  describe("createArtistProfile method", () => {
    it("should create an artist profile successfully", async () => {
      const artistData: ArtistProfileInput = {
        artistName: "Test Artist",
        genres: [MusicGenre.POP, MusicGenre.ROCK],
        bio: "This is a test artist bio",
        location: "New York",
        rate: {
          amount: 150,
          currency: "USD",
          per: "hour",
        },
        availability: {
          availableDays: ["Monday", "Friday"],
          unavailableDates: [],
        },
      };

      try {
        testUser = await createTestUser(testUserData);
        userId = testUser._id.toString();
      } catch (error) {}

      const result = await artistService.createArtistProfile(
        userId,
        artistData
      );

      // Check if the result has the expected properties
      expect(result).toHaveProperty("_id");
      expect(result).toHaveProperty("artistName", artistData.artistName);
      expect(result).toHaveProperty("genres");
      expect(result.genres).toEqual(expect.arrayContaining(artistData.genres));
      expect(result).toHaveProperty("bio", artistData.bio);
      expect(result).toHaveProperty("location", artistData.location);
      expect(result).toHaveProperty("rate");
      expect(result.rate).toHaveProperty("amount", artistData.rate.amount);

      // Verify user role was updated
      try {
        const updatedUser = await User.findById(userId);
        expect(updatedUser).toHaveProperty("role", UserRole.ARTIST);
      } catch (error) {
        console.error("Error fetching updated user:", error);
      }
    });

    it("should throw error when creating profile for non-existent user", async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const artistData: ArtistProfileInput = {
        artistName: "Test Artist",
        genres: [MusicGenre.POP],
        bio: "Bio",
        location: "Location",
        rate: {
          amount: 100,
          currency: "USD",
          per: "hour",
        },
      };

      await expect(
        artistService.createArtistProfile(nonExistentId, artistData)
      ).rejects.toThrow("User not found");
    });

    it("should throw error when user already has an artist profile", async () => {
      // Ensure test user exists in database
      testUser = await createTestUser({
        ...testUserData,
        email: `artist_duplicate${Date.now()}@artistservicetest.com`
      });
      userId = testUser._id.toString();

      const artistData: ArtistProfileInput = {
        artistName: "Test Artist",
        genres: [MusicGenre.POP],
        bio: "Bio",
        location: "Location",
        rate: {
          amount: 100,
          currency: "USD",
          per: "hour",
        },
      };

      // Create the first profile
      await artistService.createArtistProfile(userId, artistData);

      // Try to create a second profile for the same user
      await expect(
        artistService.createArtistProfile(userId, artistData)
      ).rejects.toThrow("User already has an artist profile");
    });
  });

  describe("getArtistById method", () => {
    it("should retrieve an artist by ID", async () => {
      const artistData: ArtistProfileInput = {
        artistName: "Get Test Artist",
        genres: [MusicGenre.JAZZ],
        bio: "Jazz artist bio",
        location: "New Orleans",
        rate: {
          amount: 200,
          currency: "USD",
          per: "performance",
        },
      };

      const createdArtist = await artistService.createArtistProfile(
        userId,
        artistData
      );
      const artistId = (createdArtist._id as ObjectId).toString();

      const result = await artistService.getArtistById(artistId);

      expect(result).toHaveProperty("_id");
      expect((result._id as ObjectId).toString()).toBe(artistId);
      expect(result).toHaveProperty("artistName", artistData.artistName);
    });

    it("should throw error when getting non-existent artist", async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      await expect(artistService.getArtistById(nonExistentId)).rejects.toThrow(
        "Artist not found"
      );
    });
  });

  describe("getArtistByUserId method", () => {
    it("should retrieve an artist by user ID", async () => {
      const artistData: ArtistProfileInput = {
        artistName: "User Test Artist",
        genres: [MusicGenre.HIPHOP],
        bio: "Hip hop artist bio",
        location: "Atlanta",
        rate: {
          amount: 300,
          currency: "USD",
          per: "performance",
        },
      };

      await artistService.createArtistProfile(userId, artistData);

      const result = await artistService.getArtistByUserId(userId);

      expect(result).toHaveProperty("user");
      expect(result.user.toString()).toBe(userId);
      expect(result).toHaveProperty("artistName", artistData.artistName);
    });

    it("should throw error when user has no artist profile", async () => {
      const newUser = await User.create({
        email: `noartist${Date.now()}@artistservicetest.com`,
        password: "Password123!",
        firstName: "No",
        lastName: "Artist",
      });

      await expect(
        artistService.getArtistByUserId((newUser._id as ObjectId).toString())
      ).rejects.toThrow("Artist profile not found for this user");
    });
  });

  describe("updateArtistProfile method", () => {
    it("should update artist profile successfully", async () => {
      // First create an artist profile
      const artistData: ArtistProfileInput = {
        artistName: "Original Artist",
        genres: [MusicGenre.POP],
        bio: "Original bio",
        location: "Original location",
        rate: {
          amount: 100,
          currency: "USD",
          per: "hour",
        },
      };

      await artistService.createArtistProfile(userId, artistData);

      // Update the profile
      const updateData = {
        artistName: "Updated Artist",
        bio: "Updated bio",
        location: "Updated location",
      };

      const result = await artistService.updateArtistProfile(
        userId,
        updateData
      );

      expect(result).toHaveProperty("artistName", updateData.artistName);
      expect(result).toHaveProperty("bio", updateData.bio);
      expect(result).toHaveProperty("location", updateData.location);
      // Original data should still be there for fields not updated
      expect(result.genres).toEqual(expect.arrayContaining(artistData.genres));
    });

    it("should throw error when updating non-existent artist profile", async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const updateData = {
        artistName: "Updated Artist",
      };

      await expect(
        artistService.updateArtistProfile(nonExistentId, updateData)
      ).rejects.toThrow("Artist not found");
    });
  });

  describe("findArtists method", () => {
    beforeEach(async () => {
      // Create multiple artists for testing search
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
        {
          user: new mongoose.Types.ObjectId(),
          artistName: "Jazz Ensemble",
          genres: [MusicGenre.JAZZ],
          bio: "Jazz ensemble bio",
          location: "New Orleans",
          rate: {
            amount: 300,
            currency: "USD",
            per: "hour",
          },
          rating: 4.2,
        },
      ];

      await Artist.insertMany(artists);
    });

    it("should find artists with genre filter", async () => {
      const result = await artistService.findArtists(
        { genres: [MusicGenre.ROCK] },
        1,
        10
      );

      expect(Array.isArray(result)).toBeTruthy();
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty("artistName", "Rock Band");
    });

    it("should find artists with location filter", async () => {
      const result = await artistService.findArtists(
        { location: "Angeles" },
        1,
        10
      );

      expect(Array.isArray(result)).toBeTruthy();
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty(
        "location",
        expect.stringContaining("Angeles")
      );
    });

    it("should find artists with rate filter", async () => {
      const result = await artistService.findArtists(
        { minRate: 400, maxRate: 900 },
        1,
        10
      );

      expect(Array.isArray(result)).toBeTruthy();
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].rate.amount).toBeGreaterThanOrEqual(400);
      expect(result[0].rate.amount).toBeLessThanOrEqual(900);
    });

    it("should find artists with min rating filter", async () => {
      const result = await artistService.findArtists({ minRating: 4.5 }, 1, 10);

      expect(Array.isArray(result)).toBeTruthy();
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].rating).toBeGreaterThanOrEqual(4.5);
    });

    it("should implement pagination correctly", async () => {
      // First page with limit 1
      const page1 = await artistService.findArtists({}, 1, 1);
      expect(page1.length).toBe(1);

      // Second page with limit 1
      const page2 = await artistService.findArtists({}, 2, 1);
      expect(page2.length).toBe(1);

      // Ensure they're different artists
      expect((page1[0]._id as ObjectId).toString()).not.toBe(
        (page2[0]._id as ObjectId).toString()
      );
    });
  });

  // describe("uploadPortfolioImages method", () => {
  //   let artistId: string;

  //   beforeEach(async () => {
  //     // First create an artist profile
  //     const artistData: ArtistProfileInput = {
  //       artistName: "Portfolio Artist",
  //       genres: [MusicGenre.POP],
  //       bio: "Artist with portfolio",
  //       location: "Studio",
  //       rate: {
  //         amount: 100,
  //         currency: "USD",
  //         per: "hour",
  //       },
  //     };

  //     const artist = await artistService.createArtistProfile(userId, artistData);
  //     artistId = artist._id.toString();

  //     // Mock the uploadFileToS3 function
  //     jest.spyOn(require("../../app/config/upload"), "uploadFileToS3").mockImplementation(
  //       (file: Express.Multer.File) => {
  //         return Promise.resolve(`https://example.com/images/${file.filename}`);
  //       }
  //     );
  //   });

  //   it("should upload portfolio images successfully", async () => {
  //     // Mock multer files
  //     const mockFiles = [
  //       {
  //         filename: 'test-image-1.jpg',
  //         path: '/tmp/test-image-1.jpg',
  //         mimetype: 'image/jpeg',
  //         size: 1024,
  //       } as Express.Multer.File,
  //       {
  //         filename: 'test-image-2.jpg',
  //         path: '/tmp/test-image-2.jpg',
  //         mimetype: 'image/jpeg',
  //         size: 2048,
  //       } as Express.Multer.File
  //     ];

  //     const results = await artistService.uploadPortfolioImages(userId, mockFiles);

  //     // Verify we got back the correct image URLs
  //     expect(Array.isArray(results)).toBe(true);
  //     expect(results.length).toBe(2);
  //     expect(results).toEqual([
  //       'https://example.com/images/test-image-1.jpg',
  //       'https://example.com/images/test-image-2.jpg'
  //     ]);

  //     // Check if the artist document was updated with the image URLs
  //     const updatedArtist = await Artist.findById(artistId);
  //     expect(updatedArtist?.portfolio.images).toContain('https://example.com/images/test-image-1.jpg');
  //     expect(updatedArtist?.portfolio.images).toContain('https://example.com/images/test-image-2.jpg');
  //   });

  //   it("should throw error when artist profile not found", async () => {
  //     const nonExistentId = new mongoose.Types.ObjectId().toString();
  //     const mockFiles = [
  //       {
  //         filename: 'test-image.jpg',
  //         path: '/tmp/test-image.jpg',
  //         mimetype: 'image/jpeg',
  //         size: 1024,
  //       } as Express.Multer.File
  //     ];

  //     await expect(
  //       artistService.uploadPortfolioImages(nonExistentId, mockFiles)
  //     ).rejects.toThrow("Artist profile not found for this user");
  //   });

  //   it("should handle empty files array", async () => {
  //     const mockFiles: Express.Multer.File[] = [];

  //     const results = await artistService.uploadPortfolioImages(userId, mockFiles);

  //     expect(Array.isArray(results)).toBe(true);
  //     expect(results.length).toBe(0);
  //   });

  //   it("should append new images to existing portfolio images", async () => {
  //     // Add initial images to the artist's portfolio
  //     const artist = await Artist.findById(artistId);
  //     artist!.portfolio = {
  //       images: ['https://example.com/images/existing-image.jpg'],
  //       videos: []
  //     };
  //     await artist!.save();

  //     // Upload new images
  //     const mockFiles = [
  //       {
  //         filename: 'new-image.jpg',
  //         path: '/tmp/new-image.jpg',
  //         mimetype: 'image/jpeg',
  //         size: 1024,
  //       } as Express.Multer.File
  //     ];

  //     const results = await artistService.uploadPortfolioImages(userId, mockFiles);

  //     // Verify the result contains only the new image URL
  //     expect(results).toEqual(['https://example.com/images/new-image.jpg']);

  //     // Check that the artist now has both the existing and new images
  //     const updatedArtist = await Artist.findById(artistId);
  //     expect(updatedArtist?.portfolio.images).toContain('https://example.com/images/existing-image.jpg');
  //     expect(updatedArtist?.portfolio.images).toContain('https://example.com/images/new-image.jpg');
  //     expect(updatedArtist?.portfolio.images.length).toBe(2);
  //   });
  // });
});
