import mongoose, { Schema, Document, Model } from 'mongoose';

export type IncidentCategory =
  | 'LATE_RETURN'
  | 'PHYSICAL_DAMAGE'
  | 'UNAUTHORIZED_ACCESS'
  | 'MISSING_PARTS'
  | 'SAFETY_BREACH'
  | 'EQUIPMENT_DAMAGE'
  | 'MISSING_ACCESSORY'
  | 'SAFETY_VIOLATION'
  | 'ENVIRONMENTAL_SPILL';

export type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type IncidentStatus =
  | 'OPEN'
  | 'INVESTIGATING'
  | 'UNDER_REVIEW'
  | 'RESOLVED'
  | 'ESCALATED'
  | 'ADJUDICATED'
  | 'DISMISSED';

export type AdjudicationDecision =
  | 'USER_LIABLE'
  | 'PREEXISTING_FATIGUE'
  | 'SHARED_LIABILITY'
  | 'DISMISSED';

export interface IEvidencePhoto {
  photoUrl: string;
  sha256Hash: string;
  caption?: string;
  uploadedAt?: Date;
}

export interface IAdjudication {
  adjudicatedBy: mongoose.Types.ObjectId;
  adjudicatedAt: Date;
  decision: AdjudicationDecision;
  penaltyPointsAssigned: number;
  penaltyHours?: number;
  billingChargeAmount?: number;
  grantCodeCharged?: string;
  actionItemsRequired: string[];
  findingsSummary: string;
}

export interface IIncident {
  incidentNumber: string; 
  bookingId: mongoose.Types.ObjectId;
  resourceId: mongoose.Types.ObjectId;
  reportedBy: mongoose.Types.ObjectId;
  accusedParty?: mongoose.Types.ObjectId;
  category: IncidentCategory;
  severity: IncidentSeverity;
  status: IncidentStatus;
  description: string;
  penaltyHours: number;
  repairCostEstimate: number;
  evidencePhotos: IEvidencePhoto[];
  disputeDetails?: string;
  disputeStatement?: string; 
  disputedAt?: Date;
  managerNotes?: string;
  resolutionOutcome?: string;
  adjudication?: IAdjudication;
  createdAt: Date;
  updatedAt: Date;
}

export type IIncidentDocument = IIncident & Document;

export interface IncidentModel extends Model<IIncidentDocument> {
  findByIncidentNumber(incidentNumber: string): Promise<IIncidentDocument | null>;
  findOpenByBooking(bookingId: string | mongoose.Types.ObjectId): Promise<IIncidentDocument[]>;
  generateIncidentNumber(): Promise<string>;
}

const evidencePhotoSchema = new Schema<IEvidencePhoto>(
  {
    photoUrl: { type: String, required: true, trim: true },
    sha256Hash: { type: String, required: true, trim: true },
    caption: { type: String, trim: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const adjudicationSchema = new Schema<IAdjudication>(
  {
    adjudicatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    adjudicatedAt: { type: Date, required: true, default: Date.now },
    decision: {
      type: String,
      required: true,
      enum: ['USER_LIABLE', 'PREEXISTING_FATIGUE', 'SHARED_LIABILITY', 'DISMISSED'],
    },
    penaltyPointsAssigned: { type: Number, default: 0, min: 0 },
    penaltyHours: { type: Number, default: 0, min: 0 },
    billingChargeAmount: { type: Number, min: 0 },
    grantCodeCharged: { type: String, trim: true },
    actionItemsRequired: { type: [String], default: [] },
    findingsSummary: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const incidentSchema = new Schema<IIncidentDocument, IncidentModel>(
  {
    incidentNumber: {
      type: String,
      required: [true, 'Incident number is required'],
      uppercase: true,
      trim: true,
    },
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
      required: [true, 'Booking reference is required'],
      index: true,
    },
    resourceId: {
      type: Schema.Types.ObjectId,
      ref: 'Resource',
      required: [true, 'Resource reference is required'],
      index: true,
    },
    reportedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Reporter reference is required'],
      index: true,
    },
    accusedParty: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    category: {
      type: String,
      required: [true, 'Incident category is required'],
      enum: [
        'LATE_RETURN',
        'PHYSICAL_DAMAGE',
        'UNAUTHORIZED_ACCESS',
        'MISSING_PARTS',
        'SAFETY_BREACH',
        'EQUIPMENT_DAMAGE',
        'MISSING_ACCESSORY',
        'SAFETY_VIOLATION',
        'ENVIRONMENTAL_SPILL',
      ],
      set: (val: string) => {
        if (val === 'EQUIPMENT_DAMAGE') return 'PHYSICAL_DAMAGE';
        if (val === 'MISSING_ACCESSORY') return 'MISSING_PARTS';
        if (val === 'SAFETY_VIOLATION') return 'SAFETY_BREACH';
        return val;
      },
    },
    severity: {
      type: String,
      required: [true, 'Incident severity is required'],
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'MEDIUM',
    },
    status: {
      type: String,
      required: true,
      enum: ['OPEN', 'INVESTIGATING', 'UNDER_REVIEW', 'RESOLVED', 'ESCALATED', 'ADJUDICATED', 'DISMISSED'],
      default: 'OPEN',
      set: (val: string) => {
        if (val === 'UNDER_REVIEW') return 'INVESTIGATING';
        if (val === 'ADJUDICATED') return 'RESOLVED';
        return val;
      },
    },
    description: {
      type: String,
      required: [true, 'Incident description is required'],
      trim: true,
      minlength: [5, 'Description must be at least 5 characters'],
      maxlength: [4000, 'Description cannot exceed 4000 characters'],
    },
    penaltyHours: {
      type: Number,
      default: 0,
      min: 0,
    },
    repairCostEstimate: {
      type: Number,
      default: 0,
      min: 0,
    },
    evidencePhotos: {
      type: [evidencePhotoSchema],
      default: [],
    },
    disputeDetails: {
      type: String,
      trim: true,
      maxlength: [4000, 'Dispute details cannot exceed 4000 characters'],
    },
    disputeStatement: {
      type: String,
      trim: true,
      maxlength: [4000, 'Dispute statement cannot exceed 4000 characters'],
    },
    disputedAt: {
      type: Date,
    },
    managerNotes: {
      type: String,
      trim: true,
      maxlength: [4000, 'Manager notes cannot exceed 4000 characters'],
    },
    resolutionOutcome: {
      type: String,
      trim: true,
      maxlength: [2000, 'Resolution outcome cannot exceed 2000 characters'],
    },
    adjudication: {
      type: adjudicationSchema,
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
        if (!ret.disputeStatement && ret.disputeDetails) {
          ret.disputeStatement = ret.disputeDetails;
        }
        if (!ret.disputeDetails && ret.disputeStatement) {
          ret.disputeDetails = ret.disputeStatement;
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

incidentSchema.index({ incidentNumber: 1 }, { unique: true });
incidentSchema.index({ bookingId: 1, status: 1 });
incidentSchema.index({ resourceId: 1, status: 1 });
incidentSchema.index({ accusedParty: 1, status: 1 });
incidentSchema.index({ severity: 1, status: 1 });
incidentSchema.index({ createdAt: -1 });

incidentSchema.pre('save', function (next) {
  if (this.disputeDetails && !this.disputeStatement) {
    this.disputeStatement = this.disputeDetails;
  } else if (this.disputeStatement && !this.disputeDetails) {
    this.disputeDetails = this.disputeStatement;
  }
  next();
});

incidentSchema.statics.findByIncidentNumber = function (incidentNumber: string) {
  return this.findOne({ incidentNumber: incidentNumber.toUpperCase().trim() });
};

incidentSchema.statics.findOpenByBooking = function (bookingId: string | mongoose.Types.ObjectId) {
  return this.find({ bookingId, status: { $in: ['OPEN', 'INVESTIGATING', 'UNDER_REVIEW', 'ESCALATED'] } });
};

incidentSchema.statics.generateIncidentNumber = async function (): Promise<string> {
  const year = new Date().getUTCFullYear();
  const count = await this.countDocuments();
  const sequence = String(count + 1).padStart(4, '0');
  const randomSuffix = Math.floor(100 + Math.random() * 900);
  return `INC-${year}-${sequence}-${randomSuffix}`;
};

export const Incident: IncidentModel =
  (mongoose.models.Incident as IncidentModel) ||
  mongoose.model<IIncidentDocument, IncidentModel>('Incident', incidentSchema);
