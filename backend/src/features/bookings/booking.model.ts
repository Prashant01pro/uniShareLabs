import mongoose, { Schema, Document, Model } from 'mongoose';

export type BookingStatus =
  | 'DRAFT'
  | 'PENDING_VERIFICATION'
  | 'AWAITING_APPROVAL'
  | 'PENDING_REVIEW' 
  | 'APPROVED'
  | 'WAITLISTED'
  | 'OFFERED'
  | 'CHECKED_IN'
  | 'IN_USE'
  | 'RETURNED'
  | 'COMPLETED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'DISPUTED'
  | 'NO_SHOW'
  | 'RESOLVED';

export interface IBooking {
  resourceId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  startTime: Date; 
  endTime: Date;   
  durationMinutes: number;
  status: BookingStatus;
  projectGrantCode?: string;
  supervisorEmail?: string;
  supervisorEndorsed: boolean;
  safetyAcknowledgement: boolean;
  intendedPurpose: string;
  idempotencyKey?: string;
  allowWaitlist: boolean;
  bufferMinutes: number;

  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  reviewNotes?: string;
  rejectionReasonCode?: string;
  rejectionMessage?: string;
  assignedDelegate?: mongoose.Types.ObjectId;

  fairnessScore?: number;
  waitlistPriority?: number;
  offerExpiresAt?: Date;

  accessPin?: string;
  checkInTime?: Date;
  returnTime?: Date;

  cancellationReason?: string;
  cancelledAt?: Date;
  cancelledBy?: mongoose.Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

export interface IBookingMethods {
  canTransitionTo(nextState: BookingStatus): boolean;
  transitionTo(nextState: BookingStatus, actorId?: string, reason?: string): Promise<IBookingDocument>;
  overlapsWith(start: Date, end: Date, bufferMins?: number): boolean;
}

export type IBookingDocument = IBooking & Document & IBookingMethods;

export interface BookingModel extends Model<IBookingDocument> {
  findConflictingBookings(
    resourceId: string | mongoose.Types.ObjectId,
    startTime: Date,
    endTime: Date,
    bufferMinutes?: number,
    excludeBookingId?: string | mongoose.Types.ObjectId
  ): Promise<IBookingDocument[]>;
  findPendingReviews(ownerOrDelegateId?: string | mongoose.Types.ObjectId): Promise<IBookingDocument[]>;
}

export const VALID_BOOKING_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  DRAFT: ['PENDING_VERIFICATION', 'AWAITING_APPROVAL', 'PENDING_REVIEW', 'CANCELLED'],
  PENDING_VERIFICATION: [
    'AWAITING_APPROVAL',
    'PENDING_REVIEW',
    'APPROVED',
    'WAITLISTED',
    'REJECTED',
    'CANCELLED',
  ],
  AWAITING_APPROVAL: ['APPROVED', 'REJECTED', 'CANCELLED', 'WAITLISTED'],
  PENDING_REVIEW: ['APPROVED', 'REJECTED', 'CANCELLED', 'WAITLISTED'],
  APPROVED: ['CHECKED_IN', 'IN_USE', 'CANCELLED', 'NO_SHOW'],
  WAITLISTED: ['OFFERED', 'APPROVED', 'CANCELLED'],
  OFFERED: ['APPROVED', 'WAITLISTED', 'CANCELLED'],
  CHECKED_IN: ['IN_USE', 'RETURNED', 'COMPLETED', 'DISPUTED'],
  IN_USE: ['RETURNED', 'COMPLETED', 'DISPUTED'],
  RETURNED: ['COMPLETED', 'DISPUTED'],
  COMPLETED: ['DISPUTED'],
  REJECTED: [],
  CANCELLED: [],
  DISPUTED: ['RESOLVED', 'COMPLETED'],
  NO_SHOW: ['DISPUTED'],
  RESOLVED: [],
};

const bookingSchema = new Schema<IBookingDocument, BookingModel>(
  {
    resourceId: {
      type: Schema.Types.ObjectId,
      ref: 'Resource',
      required: [true, 'resourceId is required'],
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'userId is required'],
      index: true,
    },
    startTime: {
      type: Date,
      required: [true, 'startTime is required'],
    },
    endTime: {
      type: Date,
      required: [true, 'endTime is required'],
    },
    durationMinutes: {
      type: Number,
      required: true,
      min: [15, 'Minimum booking duration is 15 minutes'],
    },
    status: {
      type: String,
      required: true,
      enum: [
        'DRAFT',
        'PENDING_VERIFICATION',
        'AWAITING_APPROVAL',
        'PENDING_REVIEW',
        'APPROVED',
        'WAITLISTED',
        'OFFERED',
        'CHECKED_IN',
        'IN_USE',
        'RETURNED',
        'COMPLETED',
        'REJECTED',
        'CANCELLED',
        'DISPUTED',
        'NO_SHOW',
        'RESOLVED',
      ],
      default: 'AWAITING_APPROVAL',
    },
    projectGrantCode: {
      type: String,
      trim: true,
    },
    supervisorEmail: {
      type: String,
      lowercase: true,
      trim: true,
    },
    supervisorEndorsed: {
      type: Boolean,
      default: false,
    },
    safetyAcknowledgement: {
      type: Boolean,
      required: [true, 'Safety acknowledgement is mandatory'],
    },
    intendedPurpose: {
      type: String,
      required: [true, 'Intended purpose is required'],
      trim: true,
      minlength: [10, 'Intended purpose must be at least 10 characters'],
    },
    idempotencyKey: {
      type: String,
      sparse: true,
      trim: true,
    },
    allowWaitlist: {
      type: Boolean,
      default: false,
    },
    bufferMinutes: {
      type: Number,
      default: 0,
      min: 0,
    },

    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: {
      type: Date,
    },
    reviewNotes: {
      type: String,
      trim: true,
    },
    rejectionReasonCode: {
      type: String,
      trim: true,
    },
    rejectionMessage: {
      type: String,
      trim: true,
    },
    assignedDelegate: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },

    fairnessScore: {
      type: Number,
      min: 0,
      max: 100,
    },
    waitlistPriority: {
      type: Number,
    },
    offerExpiresAt: {
      type: Date,
    },

    accessPin: {
      type: String,
      trim: true,
    },
    checkInTime: {
      type: Date,
    },
    returnTime: {
      type: Date,
    },

    cancellationReason: {
      type: String,
      trim: true,
    },
    cancelledAt: {
      type: Date,
    },
    cancelledBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: any) => {
        delete ret.__v;
        ret.id = ret._id.toString();
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (_doc, ret: any) => {
        delete ret.__v;
        ret.id = ret._id.toString();
        return ret;
      },
    },
  }
);

bookingSchema.index(
  { resourceId: 1, status: 1, startTime: 1, endTime: 1 },
  { name: 'idx_booking_overlap_search' }
);

bookingSchema.index(
  { userId: 1, status: 1, startTime: 1, endTime: 1 },
  { name: 'idx_user_quota_lookup' }
);

bookingSchema.index(
  { status: 1, createdAt: 1 },
  { name: 'idx_review_queue' }
);

bookingSchema.index(
  { idempotencyKey: 1 },
  { unique: false, sparse: true, name: 'idx_booking_idempotency' }
);

bookingSchema.pre('validate', function (next) {
  if (this.startTime && this.endTime) {
    if (this.endTime <= this.startTime) {
      return next(new Error('Validation failed: endTime must be strictly greater than startTime'));
    }
    const diffMs = this.endTime.getTime() - this.startTime.getTime();
    this.durationMinutes = Math.round(diffMs / (60 * 1000));
  }
  next();
});

bookingSchema.methods.canTransitionTo = function (nextState: BookingStatus): boolean {
  const current = this.status as BookingStatus;
  if (current === nextState) return true;
  const allowed = VALID_BOOKING_TRANSITIONS[current] || [];
  return allowed.includes(nextState);
};

bookingSchema.methods.transitionTo = async function (
  nextState: BookingStatus,
  actorId?: string,
  reason?: string
): Promise<IBookingDocument> {
  if (!this.canTransitionTo(nextState)) {
    throw new Error(
      `Invalid FSM state transition: Cannot transition booking ${this._id} from '${this.status}' to '${nextState}'`
    );
  }

  const previousState = this.status;
  this.status = nextState;

  if (nextState === 'CANCELLED') {
    this.cancelledAt = new Date();
    if (actorId && mongoose.Types.ObjectId.isValid(actorId)) {
      this.cancelledBy = new mongoose.Types.ObjectId(actorId);
    }
    if (reason) {
      this.cancellationReason = reason;
    }
  } else if (nextState === 'APPROVED') {
    if (actorId && mongoose.Types.ObjectId.isValid(actorId)) {
      this.reviewedBy = new mongoose.Types.ObjectId(actorId);
    }
    this.reviewedAt = new Date();
    if (reason) {
      this.reviewNotes = reason;
    }
  } else if (nextState === 'REJECTED') {
    if (actorId && mongoose.Types.ObjectId.isValid(actorId)) {
      this.reviewedBy = new mongoose.Types.ObjectId(actorId);
    }
    this.reviewedAt = new Date();
    if (reason) {
      this.rejectionMessage = reason;
    }
  }

  return this.save();
};

bookingSchema.methods.overlapsWith = function (
  start: Date,
  end: Date,
  bufferMins: number = 0
): boolean {
  const effectiveBuffer = Math.max(this.bufferMinutes || 0, bufferMins);
  const effectiveEnd = new Date(this.endTime.getTime() + effectiveBuffer * 60 * 1000);
  const effectiveStart = new Date(this.startTime.getTime() - effectiveBuffer * 60 * 1000);

  return start < effectiveEnd && end > effectiveStart;
};

bookingSchema.statics.findConflictingBookings = async function (
  resourceId: string | mongoose.Types.ObjectId,
  startTime: Date,
  endTime: Date,
  bufferMinutes: number = 0,
  excludeBookingId?: string | mongoose.Types.ObjectId
): Promise<IBookingDocument[]> {
  const bufferMs = bufferMinutes * 60 * 1000;
  const effectiveStart = new Date(startTime.getTime() - bufferMs);
  const effectiveEnd = new Date(endTime.getTime() + bufferMs);

  const query: any = {
    resourceId: new mongoose.Types.ObjectId(resourceId),
    status: {
      $in: [
        'APPROVED',
        'CHECKED_IN',
        'IN_USE',
        'AWAITING_APPROVAL',
        'PENDING_REVIEW',
        'OFFERED',
      ],
    },
    startTime: { $lt: effectiveEnd },
    endTime: { $gt: effectiveStart },
  };

  if (excludeBookingId) {
    query._id = { $ne: new mongoose.Types.ObjectId(excludeBookingId) };
  }

  return this.find(query).sort({ startTime: 1 });
};

bookingSchema.statics.findPendingReviews = async function (
  _ownerOrDelegateId?: string | mongoose.Types.ObjectId
): Promise<IBookingDocument[]> {
  const query: any = {
    status: { $in: ['AWAITING_APPROVAL', 'PENDING_REVIEW'] },
  };
  return this.find(query).populate('resourceId').populate('userId').sort({ createdAt: 1 });
};

export const Booking: BookingModel =
  (mongoose.models.Booking as BookingModel) ||
  mongoose.model<IBookingDocument, BookingModel>('Booking', bookingSchema);

export default Booking;
