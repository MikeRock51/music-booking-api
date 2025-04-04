import mongoose, { ObjectId } from 'mongoose';
import ArtistService from '../../app/services/ArtistService';
import Artist, { IArtist, MusicGenre } from '../../app/models/Artist';
import User, { UserRole } from '../../app/models/User';
import { initializeDatabase, closeDatabase } from '../../app/config/database';
import { ArtistProfileInput } from '../../app/interfaces/artist.interface';

describe('ArtistService', () => {
  let userId: string;
  let testUser: any;

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
    testUser = await User.create({
      email: `artist${Date.now()}@artistservicetest.com`,
      password: 'Password123!',
      firstName: 'Test',
      lastName: 'Artist',
      role: UserRole.USER
    });
    userId = testUser._id.toString();
  });

  afterEach(async () => {
    // Clean up test data after each test
    await User.deleteMany({ email: /@artistservicetest.com/ });
    await Artist.deleteMany({});
  });

  describe('createArtistProfile method', () => {
    it('should create an artist profile successfully', async () => {
      const artistData: ArtistProfileInput = {
        artistName: 'Test Artist',
        genres: [MusicGenre.POP, MusicGenre.ROCK],
        bio: 'This is a test artist bio',
        location: 'New York',
        rate: {
          amount: 150,
          currency: 'USD',
          per: 'hour'
        },
        availability: {
          availableDays: ['Monday', 'Friday'],
          unavailableDates: []
        }
      };

      const result = await ArtistService.createArtistProfile(userId, artistData);

      // Check if the result has the expected properties
      expect(result).toHaveProperty('_id');
      expect(result).toHaveProperty('artistName', artistData.artistName);
      expect(result).toHaveProperty('genres');
      expect(result.genres).toEqual(expect.arrayContaining(artistData.genres));
      expect(result).toHaveProperty('bio', artistData.bio);
      expect(result).toHaveProperty('location', artistData.location);
      expect(result).toHaveProperty('rate');
      expect(result.rate).toHaveProperty('amount', artistData.rate.amount);

      // Verify user role was updated
      try {
      const updatedUser = await User.findById(userId);
      // console.log(updatedUser?.role);
      expect(updatedUser).toHaveProperty('role', UserRole.ARTIST);
      } catch (error) {
        console.error('Error fetching updated user:', error);
      }
    });

    it('should throw error when creating profile for non-existent user', async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const artistData: ArtistProfileInput = {
        artistName: 'Test Artist',
        genres: [MusicGenre.POP],
        bio: 'Bio',
        location: 'Location',
        rate: {
          amount: 100,
          currency: 'USD',
          per: 'hour'
        }
      };

      await expect(ArtistService.createArtistProfile(nonExistentId, artistData))
        .rejects.toThrow('User not found');
    });

    it('should throw error when user already has an artist profile', async () => {
      const artistData: ArtistProfileInput = {
        artistName: 'Test Artist',
        genres: [MusicGenre.POP],
        bio: 'Bio',
        location: 'Location',
        rate: {
          amount: 100,
          currency: 'USD',
          per: 'hour'
        }
      };

      // Create the first profile
      await ArtistService.createArtistProfile(userId, artistData);

      // Try to create a second profile for the same user
      await expect(ArtistService.createArtistProfile(userId, artistData))
        .rejects.toThrow('User already has an artist profile');
    });
  });

  describe('getArtistById method', () => {
    it('should retrieve an artist by ID', async () => {
      const artistData: ArtistProfileInput = {
        artistName: 'Get Test Artist',
        genres: [MusicGenre.JAZZ],
        bio: 'Jazz artist bio',
        location: 'New Orleans',
        rate: {
          amount: 200,
          currency: 'USD',
          per: 'performance'
        }
      };

      const createdArtist = await ArtistService.createArtistProfile(userId, artistData);
      const artistId = (createdArtist._id as ObjectId).toString();

      const result = await ArtistService.getArtistById(artistId);

      expect(result).toHaveProperty('_id');
      expect((result._id as ObjectId).toString()).toBe(artistId);
      expect(result).toHaveProperty('artistName', artistData.artistName);
    });

    it('should throw error when getting non-existent artist', async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      await expect(ArtistService.getArtistById(nonExistentId))
        .rejects.toThrow('Artist not found');
    });
  });

  describe('getArtistByUserId method', () => {
    it('should retrieve an artist by user ID', async () => {
      const artistData: ArtistProfileInput = {
        artistName: 'User Test Artist',
        genres: [MusicGenre.HIPHOP],
        bio: 'Hip hop artist bio',
        location: 'Atlanta',
        rate: {
          amount: 300,
          currency: 'USD',
          per: 'performance'
        }
      };

      await ArtistService.createArtistProfile(userId, artistData);

      const result = await ArtistService.getArtistByUserId(userId);

      expect(result).toHaveProperty('user');
      expect(result.user.toString()).toBe(userId);
      expect(result).toHaveProperty('artistName', artistData.artistName);
    });

    it('should throw error when user has no artist profile', async () => {
      const newUser = await User.create({
        email: `noartist${Date.now()}@artistservicetest.com`,
        password: 'Password123!',
        firstName: 'No',
        lastName: 'Artist'
      });

      await expect(ArtistService.getArtistByUserId((newUser._id as ObjectId).toString()))
        .rejects.toThrow('Artist profile not found for this user');
    });
  });

  describe('updateArtistProfile method', () => {
    it('should update artist profile successfully', async () => {
      // First create an artist profile
      const artistData: ArtistProfileInput = {
        artistName: 'Original Artist',
        genres: [MusicGenre.POP],
        bio: 'Original bio',
        location: 'Original location',
        rate: {
          amount: 100,
          currency: 'USD',
          per: 'hour'
        }
      };

      await ArtistService.createArtistProfile(userId, artistData);

      // Update the profile
      const updateData = {
        artistName: 'Updated Artist',
        bio: 'Updated bio',
        location: 'Updated location'
      };

      const result = await ArtistService.updateArtistProfile(userId, updateData);

      expect(result).toHaveProperty('artistName', updateData.artistName);
      expect(result).toHaveProperty('bio', updateData.bio);
      expect(result).toHaveProperty('location', updateData.location);
      // Original data should still be there for fields not updated
      expect(result.genres).toEqual(expect.arrayContaining(artistData.genres));
    });

    it('should throw error when updating non-existent artist profile', async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const updateData = {
        artistName: 'Updated Artist',
      };

      await expect(ArtistService.updateArtistProfile(nonExistentId, updateData))
        .rejects.toThrow('Artist not found');
    });
  });

  describe('findArtists method', () => {
    beforeEach(async () => {
      // Create multiple artists for testing search
      const artists = [
        {
          user: new mongoose.Types.ObjectId(),
          artistName: 'Pop Star',
          genres: [MusicGenre.POP],
          bio: 'Pop artist bio',
          location: 'Los Angeles',
          rate: {
            amount: 500,
            currency: 'USD',
            per: 'performance'
          },
          rating: 4.5
        },
        {
          user: new mongoose.Types.ObjectId(),
          artistName: 'Rock Band',
          genres: [MusicGenre.ROCK],
          bio: 'Rock band bio',
          location: 'Seattle',
          rate: {
            amount: 800,
            currency: 'USD',
            per: 'performance'
          },
          rating: 4.8
        },
        {
          user: new mongoose.Types.ObjectId(),
          artistName: 'Jazz Ensemble',
          genres: [MusicGenre.JAZZ],
          bio: 'Jazz ensemble bio',
          location: 'New Orleans',
          rate: {
            amount: 300,
            currency: 'USD',
            per: 'hour'
          },
          rating: 4.2
        }
      ];

      await Artist.insertMany(artists);
    });

    it('should find artists with genre filter', async () => {
      const result = await ArtistService.findArtists({ genres: [MusicGenre.ROCK] }, 1, 10);

      expect(Array.isArray(result)).toBeTruthy();
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('artistName', 'Rock Band');
    });

    it('should find artists with location filter', async () => {
      const result = await ArtistService.findArtists({ location: 'Angeles' }, 1, 10);

      expect(Array.isArray(result)).toBeTruthy();
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('location', expect.stringContaining('Angeles'));
    });

    it('should find artists with rate filter', async () => {
      const result = await ArtistService.findArtists({ minRate: 400, maxRate: 900 }, 1, 10);

      expect(Array.isArray(result)).toBeTruthy();
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].rate.amount).toBeGreaterThanOrEqual(400);
      expect(result[0].rate.amount).toBeLessThanOrEqual(900);
    });

    it('should find artists with min rating filter', async () => {
      const result = await ArtistService.findArtists({ minRating: 4.5 }, 1, 10);

      expect(Array.isArray(result)).toBeTruthy();
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].rating).toBeGreaterThanOrEqual(4.5);
    });

    it('should implement pagination correctly', async () => {
      // First page with limit 1
      const page1 = await ArtistService.findArtists({}, 1, 1);
      expect(page1.length).toBe(1);

      // Second page with limit 1
      const page2 = await ArtistService.findArtists({}, 2, 1);
      expect(page2.length).toBe(1);

      // Ensure they're different artists
      expect((page1[0]._id as ObjectId).toString()).not.toBe((page2[0]._id as ObjectId).toString());
    });
  });
});