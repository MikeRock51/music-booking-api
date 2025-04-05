import { Request, Response, NextFunction } from 'express';
import VenueService from '../services/VenueService';
import { CreateVenueInput, UpdateVenueInput } from '../interfaces/venue.interface';
import { AppError } from '../middleware/errorHandler';

class VenueControllerClass {
  /**
   * Create a new venue
   */
  async createVenue(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user._id;
      const venueData: CreateVenueInput = req.body;

      const venue = await VenueService.createVenue(userId, venueData);

      res.status(201).json({
        success: true,
        message: 'Venue created successfully',
        data: venue
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get venue by ID
   */
  async getVenueById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const venue = await VenueService.getVenueById(id);

      res.status(200).json({
        success: true,
        data: venue
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get venues owned by the logged-in user
   */
  async getMyVenues(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user._id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const venues = await VenueService.getUserVenues(userId, page, limit);

      res.status(200).json({
        success: true,
        data: venues,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update a venue
   */
  async updateVenue(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user._id;
      const venueData: UpdateVenueInput = req.body;

      const venue = await VenueService.updateVenue(id, userId, venueData);

      res.status(200).json({
        success: true,
        message: 'Venue updated successfully',
        data: venue
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a venue
   */
  async deleteVenue(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user._id;

      await VenueService.deleteVenue(id, userId);

      res.status(200).json({
        success: true,
        message: 'Venue deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Search venues with filters
   */
  async findVenues(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        name,
        city,
        state,
        country,
        venueType,
        minCapacity,
        maxCapacity,
        isVerified,
        page = 1,
        limit = 10
      } = req.query;

      const filters: any = {};
      if (name) filters.name = name;
      if (city) filters.city = city;
      if (state) filters.state = state;
      if (country) filters.country = country;
      if (venueType) filters.venueType = venueType;
      if (minCapacity) filters.minCapacity = parseInt(minCapacity as string);
      if (maxCapacity) filters.maxCapacity = parseInt(maxCapacity as string);
      if (isVerified !== undefined) filters.isVerified = isVerified === 'true';

      const result = await VenueService.findVenues(
        filters,
        parseInt(page as string),
        parseInt(limit as string)
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Upload venue images
   */
  async uploadVenueImages(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user._id;

      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        throw new AppError('No images uploaded', 400);
      }

      const imageUrls = await VenueService.uploadVenueImages(id, userId, req.files);

      res.status(200).json({
        success: true,
        message: `${imageUrls.length} images uploaded successfully`,
        data: { imageUrls }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verify a venue (admin only)
   */
  async verifyVenue(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const venue = await VenueService.verifyVenue(id);

      res.status(200).json({
        success: true,
        message: 'Venue verified successfully',
        data: venue
      });
    } catch (error) {
      next(error);
    }
  }
}

export const VenueController = new VenueControllerClass();