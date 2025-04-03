import { MusicGenre } from "../models/Artist";
import { Document, Types } from "mongoose";

export interface SocialMediaLink {
  platform: string;
  url: string;
}

export interface ArtistRate {
  amount: number;
  currency: string;
  per: "hour" | "performance" | "day";
}

export interface ArtistPortfolio {
  images: string[];
  videos: string[];
  socialMedia: SocialMediaLink[];
  website?: string;
}

export interface ArtistAvailability {
  availableDays: ("Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday")[];
  unavailableDates?: Date[];
}

export interface ArtistProfileInput {
  artistName: string;
  genres: MusicGenre[];
  bio: string;
  location: string;
  rate: ArtistRate;
  portfolio?: ArtistPortfolio;
  availability?: ArtistAvailability;
}

export interface IArtistProfile extends Document {
  user: Types.ObjectId;
  artistName: string;
  genres: MusicGenre[];
  bio: string;
  location: string;
  rate: {
    amount: number;
    currency: string;
    per: string;
  };
  portfolio: {
    images: string[];
    videos: string[];
    socialMedia: {
      platform: string;
      url: string;
    }[];
    website?: string;
  };
  availability: {
    availableDays: string[];
    unavailableDates: Date[];
  };
  rating: number;
  reviewCount: number;
  createdAt: Date;
  updatedAt: Date;
}