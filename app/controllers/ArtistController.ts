import { Request, Response, NextFunction } from "express";
import ArtistService from "../services/ArtistService";
import { ArtistProfileInput } from "../interfaces/artist.interface";
import { AppError } from "../middleware/errorHandler";

class ArtistControllerClass {
  /**
   * Create artist profile for the logged-in user
   */
  async createProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user._id;
      const artistData: ArtistProfileInput = req.body;

      const artist = await ArtistService.createArtistProfile(
        userId,
        artistData
      );

      res.status(201).json({
        success: true,
        message: "Artist profile created successfully",
        data: artist,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get artist profile by ID
   */
  async getArtistById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const artist = await ArtistService.getArtistById(id);

      res.status(200).json({
        success: true,
        data: artist,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get artist profile for the logged-in user
   */
  async getMyArtistProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user._id;

      const artist = await ArtistService.getArtistByUserId(userId);

      res.status(200).json({
        success: true,
        data: artist,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update artist profile for the logged-in user
   */
  async updateMyProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user._id;
      const updateData = req.body;

      const updatedArtist = await ArtistService.updateArtistProfile(
        userId,
        updateData
      );

      res.status(200).json({
        success: true,
        message: "Artist profile updated successfully",
        data: updatedArtist,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Search artists with filters
   */
  async findArtists(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        genres,
        location,
        minRate,
        maxRate,
        minRating,
        page = 1,
        limit = 10,
      } = req.query;

      const filters: any = {};

      if (genres) {
        filters.genres = Array.isArray(genres) ? genres : [genres];
      }

      if (location) filters.location = location;
      if (minRate) filters.minRate = Number(minRate);
      if (maxRate) filters.maxRate = Number(maxRate);
      if (minRating) filters.minRating = Number(minRating);

      const result = await ArtistService.findArtists(
        filters,
        Number(page),
        Number(limit)
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
   * Upload portfolio images for the artist
   */
  async uploadPortfolioImages(req: Request, res: Response, next: NextFunction) {
    console.log("Uploading portfolio images...");
    try {
      if (req.headers['content-type'] && !req.headers['content-type'].includes('boundary')) {
        throw new AppError("Multipart: Boundary not found", 400);
      }

      const userId = req.user._id;
      // The files are accessible via req.files, thanks to multer middleware
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        throw new AppError("No images uploaded", 400);
      }

      const imageUrls = await ArtistService.uploadPortfolioImages(
        userId,
        files
      );

      res.status(200).json({
        success: true,
        message: "Portfolio images uploaded successfully",
        data: {
          imageUrls,
        },
      });
    } catch (error: any) {
      next(error);
    }
  }
}

export const ArtistController = new ArtistControllerClass();
