import { Types } from 'mongoose';
import { BookingStatus, PaymentStatus } from '../models/Booking';

export interface BookingDetailsInput {
  startTime: Date | string;
  endTime: Date | string;
  setDuration: number;
  specialRequirements?: string;
}

export interface PaymentInput {
  amount: number;
  currency?: string;
  status?: PaymentStatus;
  depositAmount?: number;
  depositPaid?: boolean;
}

export interface ContractInput {
  url?: string;
  signedByArtist?: boolean;
  signedByOrganizer?: boolean;
}

export interface CreateBookingInput {
  artist: Types.ObjectId | string;
  event: Types.ObjectId | string;
  bookedBy?: Types.ObjectId | string;
  bookingDetails: BookingDetailsInput;
  payment: PaymentInput;
  status?: BookingStatus;
  contract?: ContractInput;
  notes?: string;
}

export interface UpdateBookingInput {
  artist?: Types.ObjectId | string;
  event?: Types.ObjectId | string;
  bookingDetails?: Partial<BookingDetailsInput>;
  payment?: Partial<PaymentInput>;
  status?: BookingStatus;
  contract?: Partial<ContractInput>;
  notes?: string;
}

export interface BookingFilters {
  artist?: Types.ObjectId | string;
  event?: Types.ObjectId | string;
  bookedBy?: Types.ObjectId | string;
  status?: BookingStatus | BookingStatus[];
  startDate?: Date | string;
  endDate?: Date | string;
  paymentStatus?: PaymentStatus | PaymentStatus[];
}