import mongoose, { Document, Schema } from "mongoose";

export enum BookingStatus {
  PENDING = "pending",
  CONFIRMED = "confirmed",
  CANCELED = "canceled",
  COMPLETED = "completed",
  REJECTED = "rejected"
}

export enum PaymentStatus {
  PENDING = "pending",
  PAID = "paid",
  PARTIALLY_PAID = "partially_paid",
  REFUNDED = "refunded",
  CANCELED = "canceled"
}

export interface IBooking extends Document {
  artist: mongoose.Types.ObjectId;
  event: mongoose.Types.ObjectId;
  bookedBy: mongoose.Types.ObjectId;
  bookingDetails: {
    startTime: Date;
    endTime: Date;
    setDuration: number; // in minutes
    specialRequirements?: string;
  };
  payment: {
    amount: number;
    currency: string;
    status: PaymentStatus;
    depositAmount?: number;
    depositPaid?: boolean;
  };
  status: BookingStatus;
  contract?: {
    url: string;
    signedByArtist: boolean;
    signedByOrganizer: boolean;
  };
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const BookingSchema = new Schema<IBooking>(
  {
    artist: {
      type: Schema.Types.ObjectId,
      ref: "Artist",
      required: [true, "Artist is required"]
    },
    event: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: [true, "Event is required"]
    },
    bookedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Booking organizer is required"]
    },
    bookingDetails: {
      startTime: {
        type: Date,
        required: [true, "Start time is required"]
      },
      endTime: {
        type: Date,
        required: [true, "End time is required"]
      },
      setDuration: {
        type: Number,
        required: [true, "Set duration is required"]
      },
      specialRequirements: String
    },
    payment: {
      amount: {
        type: Number,
        required: [true, "Payment amount is required"]
      },
      currency: {
        type: String,
        default: "USD"
      },
      status: {
        type: String,
        enum: Object.values(PaymentStatus),
        default: PaymentStatus.PENDING
      },
      depositAmount: Number,
      depositPaid: {
        type: Boolean,
        default: false
      }
    },
    status: {
      type: String,
      enum: Object.values(BookingStatus),
      default: BookingStatus.PENDING
    },
    contract: {
      url: String,
      signedByArtist: {
        type: Boolean,
        default: false
      },
      signedByOrganizer: {
        type: Boolean,
        default: false
      }
    },
    notes: String
  },
  {
    timestamps: true
  }
);

// Create indexes for faster queries
BookingSchema.index({ artist: 1, "bookingDetails.startTime": 1 });
BookingSchema.index({ event: 1 });
BookingSchema.index({ status: 1 });
BookingSchema.index({ bookedBy: 1 });

export default mongoose.model<IBooking>("Booking", BookingSchema);