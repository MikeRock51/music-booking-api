import Artist, { IArtist } from '../models/Artist';
import User, { UserRole } from '../models/User';
import { AppError } from '../middleware/errorHandler';
import mongoose from 'mongoose';
import { ArtistProfileInput } from '../interfaces/artist.interface';

class ArtistService {
  /**
   * Create a new artist profile
   * @param userId - User ID to associate with artist profile
   * @param artistData - Artist profile data
   */
  async createArtistProfile(userId: string, artistData: ArtistProfileInput): Promise<IArtist> {
    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Check if user already has an artist profile
    const existingArtist = await Artist.findOne({ user: userId });
    if (existingArtist) {
      throw new AppError('User already has an artist profile', 400);
    }

    // Update user role to artist
    user.role = UserRole.ARTIST;
    await user.save();

    // Create artist profile
    const artist = await Artist.create({
      user: userId,
      ...artistData
    });

    return artist;
  }

  /**
   * Get artist by ID
   * @param artistId - Artist ID
   */
  async getArtistById(artistId: string): Promise<IArtist> {
    const artist = await Artist.findById(artistId);
    if (!artist) {
      throw new AppError('Artist not found', 404);
    }
    return artist;
  }

  /**
   * Get artist by user ID
   * @param userId - User ID
   */
  async getArtistByUserId(userId: string): Promise<IArtist> {
    const artist = await Artist.findOne({ user: userId });
    if (!artist) {
      throw new AppError('Artist profile not found for this user', 404);
    }
    return artist;
  }

  /**
   * Update artist profile
   * @param artistId - Artist ID
   * @param updateData - Artist profile update data
   */
  async updateArtistProfile(artistId: string, updateData: any): Promise<IArtist> {
    const artist = await Artist.findByIdAndUpdate(
      artistId,
      { ...updateData },
      { new: true, runValidators: true }
    );

    if (!artist) {
      throw new AppError('Artist not found', 404);
    }

    return artist;
  }

  /**
   * Search artists by various filters
   * @param filters - Search filters (genres, location, rate range, etc.)
   * @param page - Page number for pagination
   * @param limit - Number of results per page
   */
  async searchArtists(filters: any, page = 1, limit = 10): Promise<{ artists: IArtist[], total: number, page: number, pages: number }> {
    const query: any = {};

    // Apply genre filter
    if (filters.genres && filters.genres.length > 0) {
      query.genres = { $in: filters.genres };
    }

    // Apply location filter
    if (filters.location) {
      query.location = { $regex: filters.location, $options: 'i' };
    }

    // Apply rate range filter
    if (filters.minRate || filters.maxRate) {
      query.rate = {};
      if (filters.minRate) {
        query.rate.amount = { $gte: filters.minRate };
      }
      if (filters.maxRate) {
        query.rate.amount = { ...query.rate.amount, $lte: filters.maxRate };
      }
    }

    // Apply rating filter
    if (filters.minRating) {
      query.rating = { $gte: filters.minRating };
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Execute query
    const artists = await Artist.find(query)
      .sort({ rating: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: 'user',
        select: 'firstName lastName email profileImage'
      });

    // Get total count
    const total = await Artist.countDocuments(query);

    return {
      artists,
      total,
      page,
      pages: Math.ceil(total / limit)
    };
  }
}

export default new ArtistService();