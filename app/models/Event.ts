import mongoose, { Document, Schema } from "mongoose";

export enum EventStatus {
  DRAFT = "draft",
  PUBLISHED = "published",
  CANCELED = "canceled",
  COMPLETED = "completed"
}

export enum EventType {
  CONCERT = "concert",
  FESTIVAL = "festival",
  PRIVATE_EVENT = "private_event",
  CORPORATE_EVENT = "corporate_event",
  WEDDING = "wedding",
  OTHER = "other"
}

export interface IEvent extends Document {
  name: string;
  description: string;
  eventType: EventType;
  date: {
    start: Date;
    end: Date;
  };
  venue: mongoose.Types.ObjectId;
  organizer: mongoose.Types.ObjectId;
  featuredArtists: mongoose.Types.ObjectId[];
  ticketInfo: {
    available: boolean;
    price: number;
    currency: string;
    totalTickets: number;
    soldTickets: number;
  };
  images: string[];
  status: EventStatus;
  isPrivate: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const EventSchema = new Schema<IEvent>(
  {
    name: {
      type: String,
      required: [true, "Event name is required"],
      trim: true
    },
    description: {
      type: String,
      required: [true, "Event description is required"]
    },
    eventType: {
      type: String,
      enum: Object.values(EventType),
      required: [true, "Event type is required"]
    },
    date: {
      start: {
        type: Date,
        required: [true, "Event start date is required"]
      },
      end: {
        type: Date,
        required: [true, "Event end date is required"]
      }
    },
    venue: {
      type: Schema.Types.ObjectId,
      ref: "Venue",
      required: [true, "Venue is required"]
    },
    organizer: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Organizer is required"]
    },
    featuredArtists: [{
      type: Schema.Types.ObjectId,
      ref: "Artist"
    }],
    ticketInfo: {
      available: {
        type: Boolean,
        default: true
      },
      price: {
        type: Number,
        required: [true, "Ticket price is required"]
      },
      currency: {
        type: String,
        default: "USD"
      },
      totalTickets: {
        type: Number,
        required: [true, "Total tickets count is required"]
      },
      soldTickets: {
        type: Number,
        default: 0
      }
    },
    images: [String],
    status: {
      type: String,
      enum: Object.values(EventStatus),
      default: EventStatus.DRAFT
    },
    isPrivate: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

// Create indexes for faster queries
EventSchema.index({ "date.start": 1 });
EventSchema.index({ venue: 1 });
EventSchema.index({ organizer: 1 });
EventSchema.index({ status: 1 });

export default mongoose.model<IEvent>("Event", EventSchema);