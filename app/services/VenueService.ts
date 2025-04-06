import Venue, { IVenue } from '../models/Venue';
import User, { UserRole } from '../models/User';
import { AppError } from '../middleware/errorHandler';
import { CreateVenueInput, UpdateVenueInput, VenueFilters } from '../interfaces/venue.interface';
import mongoose from 'mongoose';
import { uploadFileToS3 } from '../config/upload';

class VenueService {
  /**
   * Create a new venue
   * @param userId - User ID creating the venue
   * @param venueData - Venue details
   */
  async createVenue(userId: string, venueData: CreateVenueInput): Promise<IVenue> {
    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Create the venue
    const venue = await Venue.create({
      ...venueData,
      owner: userId
    });

    return venue;
  }

  /**
   * Get venue by ID
   * @param venueId - Venue ID
   */
  async getVenueById(venueId: string): Promise<IVenue> {
    const venue = await Venue.findById(venueId).populate('owner', 'firstName lastName email');

    if (!venue) {
      throw new AppError('Venue not found', 404);
    }

    return venue;
  }

  /**
   * Get venues owned by a user
   * @param userId - Owner's user ID
   * @param page - Page number for pagination
   * @param limit - Number of results per page
   */
  async getUserVenues(userId: string, page = 1, limit = 10): Promise<IVenue[]> {
    const skip = (page - 1) * limit;

    const venues = await Venue.find({ owner: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return venues;
  }

  /**
   * Update a venue
   * @param venueId - Venue ID
   * @param userId - User ID making the update (for authorization)
   * @param venueData - Updated venue data
   */
  async updateVenue(venueId: string, userId: string, venueData: UpdateVenueInput): Promise<IVenue> {
    const venue = await this.getVenueById(venueId);

    // Check authorization: only the owner or an admin can update
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const isAdmin = user.role === UserRole.ADMIN;
    const isOwner = venue.owner._id.toString() === userId.toString();

    if (!isOwner && !isAdmin) {
      throw new AppError('You are not authorized to update this venue', 403);
    }

    // Special handling for admin-only fields
    if (venueData.isVerified !== undefined && !isAdmin) {
      throw new AppError('Only administrators can verify venues', 403);
    }

    // Update the venue
    Object.assign(venue, venueData);
    await venue.save();

    return venue.populate('owner', 'firstName lastName email');
  }

  /**
   * Delete a venue
   * @param venueId - Venue ID
   * @param userId - User ID making the deletion (for authorization)
   */
  async deleteVenue(venueId: string, userId: string): Promise<void> {
    const venue = await this.getVenueById(venueId);

    // Check authorization: only the owner or an admin can delete
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // console.log(venue.owner, "OWNWE!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");

    const isAdmin = user.role === UserRole.ADMIN;
    const isOwner = venue.owner?._id?.toString() === userId.toString();

    if (!isOwner && !isAdmin) {
      throw new AppError('You are not authorized to delete this venue', 403);
    }

    await Venue.deleteOne({ _id: venueId });
  }

  /**
   * Search venues with filters
   * @param filters - Search filters
   * @param page - Page number for pagination
   * @param limit - Number of results per page
   */
  async findVenues(filters: VenueFilters = {}, page = 1, limit = 10): Promise<IVenue[]> {
    const query: any = {};

    // Apply filters
    if (filters.name) {
      query.name = { $regex: new RegExp(filters.name, 'i') };
    }

    if (filters.city) {
      query['location.city'] = { $regex: new RegExp(filters.city, 'i') };
    }

    if (filters.state) {
      query['location.state'] = { $regex: new RegExp(filters.state, 'i') };
    }

    if (filters.country) {
      query['location.country'] = { $regex: new RegExp(filters.country, 'i') };
    }

    if (filters.venueType) {
      if (Array.isArray(filters.venueType)) {
        query.venueType = { $in: filters.venueType };
      } else {
        query.venueType = filters.venueType;
      }
    }

    if (filters.minCapacity !== undefined) {
      query.capacity = { $gte: filters.minCapacity };
    }

    if (filters.maxCapacity !== undefined) {
      if (query.capacity) {
        query.capacity.$lte = filters.maxCapacity;
      } else {
        query.capacity = { $lte: filters.maxCapacity };
      }
    }

    if (filters.isVerified !== undefined) {
      query.isVerified = filters.isVerified;
    }

    if (filters.owner) {
      query.owner = filters.owner;
    }

    const skip = (page - 1) * limit;

    // Ensure consistent and reliable pagination by sorting by _id as a secondary sort
    const venues = await Venue.find(query)
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .populate('owner', 'firstName lastName');

    return venues;
  }

  /**
   * Upload venue images
   * @param venueId - Venue ID
   * @param userId - User ID uploading images (for authorization)
   * @param files - Image files to upload
   */
  async uploadVenueImages(venueId: string, userId: string, files: Express.Multer.File[]): Promise<string[]> {
    const venue = await this.getVenueById(venueId);

    // Check authorization: only the owner or an admin can upload images
    const isAdmin = (await User.findById(userId))?.role === UserRole.ADMIN;
    const isOwner = venue.owner._id.toString() === userId.toString();

    if (!isOwner && !isAdmin) {
      throw new AppError('You are not authorized to upload images for this venue', 403);
    }

    // Upload images to S3
    const imageUrls = await Promise.all(
      files.map(async (file) => {
        const uploadPath = `venues/${venueId}/images`;
        console.log('upload started');
        const imageUrl = await uploadFileToS3(file, uploadPath);
        console.log('upload completed', imageUrl);
        return imageUrl; // Return the URL instead of pushing to array
      })
    );

    // Update venue with new images
    venue.images = [...venue.images, ...imageUrls];
    await venue.save();

    return imageUrls;
  }

  /**
   * Verify a venue (admin only)
   * @param venueId - Venue ID to verify
   */
  async verifyVenue(venueId: string): Promise<IVenue> {
    const venue = await this.getVenueById(venueId);

    venue.isVerified = true;
    await venue.save();

    return venue;
  }
}

export default VenueService;