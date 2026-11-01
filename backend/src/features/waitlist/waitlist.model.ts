import mongoose, { Schema, Document, Model } from 'mongoose';

export type WaitlistStatus = 'QUEUED' | 'OFFERED' | 'ACCEPTED' | 'EXPIRED' | 'CANCELLED';

export interface IFairnessComponents {
  S_hist: number;
  S_can: number;
  S_rep: number;
  S_wait: number;
}

export interface IWaitlistEntry {
  resourceId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  bookingId: mongoose.Types.ObjectId; 
  requestedStart: Date;
  requestedEnd: Date;
  priorityScore: number; 
  status: WaitlistStatus;
  offerExpiresAt?: Date;
  fairnessComponents?: IFairnessComponents;
  notificationSentAt?: Date;
  acceptedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IWaitlistEntryMethods {
  isOfferExpired(): boolean;
}

export type IWaitlistEntryDocument = IWaitlistEntry & Document & IWaitlistEntryMethods;

export interface WaitlistModel extends Model<IWaitlistEntryDocument> {
  findHighestPriorityCandidate(
    resourceId: string | mongoose.Types.ObjectId,
    slotStart: Date,
    slotEnd: Date
  ): Promise<IWaitlistEntryDocument | null>;
}

const waitlistEntrySchema = new Schema<IWaitlistEntryDocument, WaitlistModel>(
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
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
      required: [true, 'bookingId is required'],
      index: true,
    },
    requestedStart: {
      type: Date,
      required: [true, 'requestedStart is required'],
    },
    requestedEnd: {
      type: Date,
      required: [true, 'requestedEnd is required'],
    },
    priorityScore: {
      type: Number,
      required: [true, 'priorityScore is required'],
      min: 0,
      max: 100,
    },
    status: {
      type: String,
      required: true,
      enum: ['QUEUED', 'OFFERED', 'ACCEPTED', 'EXPIRED', 'CANCELLED'],
      default: 'QUEUED',
    },
    offerExpiresAt: {
      type: Date,
    },
    fairnessComponents: {
      S_hist: { type: Number },
      S_can: { type: Number },
      S_rep: { type: Number },
      S_wait: { type: Number },
    },
    notificationSentAt: {
      type: Date,
    },
    acceptedAt: {
      type: Date,
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

waitlistEntrySchema.index(
  { resourceId: 1, status: 1, priorityScore: -1, createdAt: 1 },
  { name: 'idx_waitlist_priority_queue' }
);

waitlistEntrySchema.index(
  { userId: 1, status: 1 },
  { name: 'idx_user_waitlist_entries' }
);

waitlistEntrySchema.index(
  { bookingId: 1 },
  { name: 'idx_waitlist_booking' }
);

waitlistEntrySchema.methods.isOfferExpired = function (): boolean {
  if (this.status !== 'OFFERED' || !this.offerExpiresAt) {
    return false;
  }
  return new Date() > new Date(this.offerExpiresAt);
};

waitlistEntrySchema.statics.findHighestPriorityCandidate = async function (
  resourceId: string | mongoose.Types.ObjectId,
  slotStart: Date,
  slotEnd: Date
): Promise<IWaitlistEntryDocument | null> {
  const rId = new mongoose.Types.ObjectId(resourceId);

  const candidates: IWaitlistEntryDocument[] = await this.find({
    resourceId: rId,
    status: 'QUEUED',
    requestedStart: { $lt: slotEnd },
    requestedEnd: { $gt: slotStart },
  })
    .sort({ priorityScore: -1, createdAt: 1 })
    .populate('userId')
    .populate('bookingId');

  return candidates.length > 0 ? candidates[0] : null;
};

export const WaitlistEntry: WaitlistModel =
  (mongoose.models.WaitlistEntry as WaitlistModel) ||
  mongoose.model<IWaitlistEntryDocument, WaitlistModel>('WaitlistEntry', waitlistEntrySchema);

export default WaitlistEntry;
