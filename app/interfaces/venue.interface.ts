import { Types } from 'mongoose';
import { VenueType } from '../models/Venue';

export interface VenueLocationInput {
  address: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export interface VenueContactInfoInput {
  email: string;
  phone: string;
  website?: string;
}

export interface CreateVenueInput {
  name: string;
  location: VenueLocationInput;
  capacity: number;
  venueType: VenueType;
  amenities?: string[];
  images?: string[];
  description: string;
  contactInfo: VenueContactInfoInput;
}

export interface UpdateVenueInput {
  name?: string;
  location?: Partial<VenueLocationInput>;
  capacity?: number;
  venueType?: VenueType;
  amenities?: string[];
  images?: string[];
  description?: string;
  contactInfo?: Partial<VenueContactInfoInput>;
  isVerified?: boolean;
}

export interface VenueFilters {
  name?: string;
  city?: string;
  state?: string;
  country?: string;
  venueType?: VenueType | VenueType[];
  minCapacity?: number;
  maxCapacity?: number;
  isVerified?: boolean;
  owner?: Types.ObjectId | string;
}