import mongoose, { Document, Schema } from "mongoose";

export enum VenueType {
  CLUB = "club",
  CONCERT_HALL = "concert_hall",
  STADIUM = "stadium",
  BAR = "bar",
  RESTAURANT = "restaurant",
  OUTDOOR = "outdoor",
  PRIVATE = "private",
  OTHER = "other"
}

export interface IVenue extends Document {
  name: string;
  location: {
    address: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    }
  };
  capacity: number;
  venueType: VenueType;
  amenities: string[];
  images: string[];
  description: string;
  contactInfo: {
    email: string;
    phone: string;
    website?: string;
  };
  owner: mongoose.Types.ObjectId;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const VenueSchema = new Schema<IVenue>(
  {
    name: {
      type: String,
      required: [true, "Venue name is required"],
      trim: true
    },
    location: {
      address: {
        type: String,
        required: [true, "Address is required"]
      },
      city: {
        type: String,
        required: [true, "City is required"]
      },
      state: {
        type: String,
        required: [true, "State is required"]
      },
      country: {
        type: String,
        required: [true, "Country is required"]
      },
      zipCode: {
        type: String,
        required: [true, "ZIP code is required"]
      },
      coordinates: {
        latitude: Number,
        longitude: Number
      }
    },
    capacity: {
      type: Number,
      required: [true, "Capacity is required"]
    },
    venueType: {
      type: String,
      enum: Object.values(VenueType),
      required: [true, "Venue type is required"]
    },
    amenities: {
      type: [String]
    },
    images: {
      type: [String]
    },
    description: {
      type: String,
      required: [true, "Description is required"]
    },
    contactInfo: {
      email: {
        type: String,
        required: [true, "Contact email is required"]
      },
      phone: {
        type: String,
        required: [true, "Contact phone is required"]
      },
      website: String
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    isVerified: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model<IVenue>("Venue", VenueSchema);