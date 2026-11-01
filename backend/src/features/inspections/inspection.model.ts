import mongoose, { Schema, Document, Model } from 'mongoose';

export type InspectionPhase = 'CHECK_IN' | 'RETURN' | 'INITIAL_CHECKIN' | 'FINAL_RETURN';
export type ConditionRating = 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'DAMAGED';

export const CONDITION_SCORES: Record<ConditionRating, number> = {
  EXCELLENT: 4,
  GOOD: 3,
  FAIR: 2,
  POOR: 1,
  DAMAGED: 0,
};

export interface IChecklistResponse {
  itemId: string;
  itemText?: string;
  verified: boolean;
  note?: string;
  isCritical?: boolean;
}

export interface IPhotoUpload {
  photoUrl: string;
  sha256Hash: string;
  caption?: string;
  uploadedAt: Date;
}

export interface IDigitalSignature {
  signedBy: mongoose.Types.ObjectId | string;
  signerName?: string;
  signedAt: Date;
  signatureHash: string;
}

export interface IConditionDiff {
  initialRating: ConditionRating;
  finalRating: ConditionRating;
  ratingDelta: number; 
  meterDeltas: Map<string, number> | Record<string, number>;
  flaggedAnomaly: boolean;
  anomalyDetails?: string;
  incidentCreated?: boolean;
  incidentId?: mongoose.Types.ObjectId;
}

export interface IInspection {
  bookingId: mongoose.Types.ObjectId;
  resourceId: mongoose.Types.ObjectId;
  inspectorId: mongoose.Types.ObjectId;
  inspectorRole: string;
  type: InspectionPhase;
  phase: InspectionPhase;
  conditionRating: ConditionRating;
  checklistResponses: IChecklistResponse[];
  meterReadings: Map<string, number> | Record<string, number>;
  photos: IPhotoUpload[];
  photoUploads?: IPhotoUpload[]; 
  digitalSignature: IDigitalSignature;
  notes?: string;
  preExistingDamageNotes?: string;
  conditionDiff?: IConditionDiff;
  createdAt: Date;
  updatedAt: Date;
}

export type IInspectionDocument = IInspection & Document;

export interface InspectionModel extends Model<IInspectionDocument> {
  findByBooking(bookingId: string | mongoose.Types.ObjectId): Promise<IInspectionDocument[]>;
  findCheckIn(bookingId: string | mongoose.Types.ObjectId): Promise<IInspectionDocument | null>;
  findReturn(bookingId: string | mongoose.Types.ObjectId): Promise<IInspectionDocument | null>;
}

const checklistResponseSchema = new Schema<IChecklistResponse>(
  {
    itemId: { type: String, required: true },
    itemText: { type: String },
    verified: { type: Boolean, required: true },
    note: { type: String, trim: true },
    isCritical: { type: Boolean, default: false },
  },
  { _id: false }
);

const photoUploadSchema = new Schema<IPhotoUpload>(
  {
    photoUrl: { type: String, required: true, trim: true },
    sha256Hash: { type: String, required: true, trim: true },
    caption: { type: String, trim: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const digitalSignatureSchema = new Schema<IDigitalSignature>(
  {
    signedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    signerName: { type: String, trim: true },
    signedAt: { type: Date, required: true, default: Date.now },
    signatureHash: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const conditionDiffSchema = new Schema<IConditionDiff>(
  {
    initialRating: {
      type: String,
      enum: ['EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'DAMAGED'],
      required: true,
    },
    finalRating: {
      type: String,
      enum: ['EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'DAMAGED'],
      required: true,
    },
    ratingDelta: { type: Number, required: true },
    meterDeltas: { type: Map, of: Number, default: {} },
    flaggedAnomaly: { type: Boolean, default: false },
    anomalyDetails: { type: String },
    incidentCreated: { type: Boolean, default: false },
    incidentId: { type: Schema.Types.ObjectId, ref: 'Incident' },
  },
  { _id: false }
);

const inspectionSchema = new Schema<IInspectionDocument, InspectionModel>(
  {
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
      required: [true, 'Booking ID is required'],
      index: true,
    },
    resourceId: {
      type: Schema.Types.ObjectId,
      ref: 'Resource',
      required: [true, 'Resource ID is required'],
      index: true,
    },
    inspectorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Inspector ID is required'],
      index: true,
    },
    inspectorRole: {
      type: String,
      required: [true, 'Inspector role is required'],
      enum: ['STUDENT', 'RESEARCHER', 'RESOURCE_OWNER', 'LAB_MANAGER', 'ADMIN', 'LAB_TECH'],
      default: 'STUDENT',
    },
    type: {
      type: String,
      required: true,
      enum: ['CHECK_IN', 'RETURN', 'INITIAL_CHECKIN', 'FINAL_RETURN'],
      set: (val: string) => {
        if (val === 'INITIAL_CHECKIN') return 'CHECK_IN';
        if (val === 'FINAL_RETURN') return 'RETURN';
        return val;
      },
    },
    phase: {
      type: String,
      enum: ['CHECK_IN', 'RETURN', 'INITIAL_CHECKIN', 'FINAL_RETURN'],
      default: function (this: IInspectionDocument) {
        return this.type;
      },
    },
    conditionRating: {
      type: String,
      required: [true, 'Condition rating is required'],
      enum: ['EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'DAMAGED'],
    },
    checklistResponses: {
      type: [checklistResponseSchema],
      default: [],
    },
    meterReadings: {
      type: Map,
      of: Number,
      required: true,
      default: {},
    },
    photos: {
      type: [photoUploadSchema],
      default: [],
    },
    photoUploads: {
      type: [photoUploadSchema],
      default: [],
    },
    digitalSignature: {
      type: digitalSignatureSchema,
      required: [true, 'Digital signature is required'],
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [2000, 'Notes cannot exceed 2000 characters'],
    },
    preExistingDamageNotes: {
      type: String,
      trim: true,
      maxlength: [2000, 'Pre-existing damage notes cannot exceed 2000 characters'],
    },
    conditionDiff: {
      type: conditionDiffSchema,
      default: undefined,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: any) => {
        delete ret.__v;
        ret.id = ret._id.toString();
        if (!ret.photoUploads || ret.photoUploads.length === 0) {
          ret.photoUploads = ret.photos;
        }
        if (!ret.photos || ret.photos.length === 0) {
          ret.photos = ret.photoUploads;
        }
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

inspectionSchema.index({ bookingId: 1, type: 1 }, { unique: true });
inspectionSchema.index({ resourceId: 1, createdAt: -1 });
inspectionSchema.index({ inspectorId: 1, createdAt: -1 });

inspectionSchema.pre('save', function (next) {
  if (this.photos && this.photos.length > 0 && (!this.photoUploads || this.photoUploads.length === 0)) {
    this.photoUploads = this.photos;
  } else if (this.photoUploads && this.photoUploads.length > 0 && (!this.photos || this.photos.length === 0)) {
    this.photos = this.photoUploads;
  }
  if (!this.phase) {
    this.phase = this.type;
  }
  next();
});

inspectionSchema.statics.findByBooking = function (bookingId: string | mongoose.Types.ObjectId) {
  return this.find({ bookingId }).sort({ createdAt: 1 });
};

inspectionSchema.statics.findCheckIn = function (bookingId: string | mongoose.Types.ObjectId) {
  return this.findOne({ bookingId, type: { $in: ['CHECK_IN', 'INITIAL_CHECKIN'] } });
};

inspectionSchema.statics.findReturn = function (bookingId: string | mongoose.Types.ObjectId) {
  return this.findOne({ bookingId, type: { $in: ['RETURN', 'FINAL_RETURN'] } });
};

export const Inspection: InspectionModel =
  (mongoose.models.Inspection as InspectionModel) ||
  mongoose.model<IInspectionDocument, InspectionModel>('Inspection', inspectionSchema);
