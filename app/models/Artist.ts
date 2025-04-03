import mongoose, { Document, Schema } from "mongoose";

export enum MusicGenre {
  POP = "pop",
  ROCK = "rock",
  JAZZ = "jazz",
  HIPHOP = "hip-hop",
  ELECTRONIC = "electronic",
  CLASSICAL = "classical",
  FOLK = "folk",
  REGGAE = "reggae",
  RNB = "r&b",
  COUNTRY = "country",
  BLUES = "blues",
  OTHER = "other"
}

export interface IArtist extends Document {
  user: mongoose.Types.ObjectId;
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
    availableDays: string[]; // e.g., ["Monday", "Friday"]
    unavailableDates: Date[];
  };
  rating: number;
  reviewCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const ArtistSchema = new Schema<IArtist>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true
    },
    artistName: {
      type: String,
      required: [true, "Artist name is required"],
      trim: true
    },
    genres: {
      type: [String],
      enum: Object.values(MusicGenre),
      required: [true, "At least one genre is required"]
    },
    bio: {
      type: String,
      required: [true, "Bio is required"],
      maxlength: [1000, "Bio cannot be more than 1000 characters"]
    },
    location: {
      type: String,
      required: [true, "Location is required"]
    },
    rate: {
      amount: {
        type: Number,
        required: [true, "Rate amount is required"]
      },
      currency: {
        type: String,
        default: "USD"
      },
      per: {
        type: String,
        default: "hour",
        enum: ["hour", "performance", "day"]
      }
    },
    portfolio: {
      images: [String],
      videos: [String],
      socialMedia: [
        {
          platform: String,
          url: String
        }
      ],
      website: String
    },
    availability: {
      availableDays: [String],
      unavailableDates: [Date]
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    reviewCount: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model<IArtist>("Artist", ArtistSchema);