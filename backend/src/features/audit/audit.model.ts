import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAuditLog {
  sequenceNumber: number; 
  eventId: string; 
  timestamp: Date;
  action: string;
  actorId: string; 
  actorRole: string;
  entityType: string; 
  entityId: string;
  bookingId?: mongoose.Types.ObjectId;
  resourceId?: mongoose.Types.ObjectId;
  fromState?: string;
  toState?: string;
  payloadHash: string; 
  previousHash: string; 
  currentHash: string; 
  hash?: string; 
  metadata: Record<string, any>;
}

export type IAuditLogDocument = IAuditLog & Document;

export interface AuditLogModel extends Model<IAuditLogDocument> {
  getLatest(): Promise<IAuditLogDocument | null>;
  getNextSequence(): Promise<number>;
}

const auditLogSchema = new Schema<IAuditLogDocument, AuditLogModel>(
  {
    sequenceNumber: {
      type: Number,
      required: [true, 'Sequence number is required'],
    },
    eventId: {
      type: String,
      required: [true, 'Event ID is required'],
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    action: {
      type: String,
      required: [true, 'Action is required'],
      index: true,
    },
    actorId: {
      type: String,
      required: [true, 'Actor ID is required'],
      index: true,
    },
    actorRole: {
      type: String,
      required: [true, 'Actor role is required'],
      default: 'SYSTEM',
    },
    entityType: {
      type: String,
      required: [true, 'Entity type is required'],
      index: true,
    },
    entityId: {
      type: String,
      required: [true, 'Entity ID is required'],
      index: true,
    },
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
      index: true,
    },
    resourceId: {
      type: Schema.Types.ObjectId,
      ref: 'Resource',
      index: true,
    },
    fromState: {
      type: String,
    },
    toState: {
      type: String,
    },
    payloadHash: {
      type: String,
      required: [true, 'Payload hash is required'],
    },
    previousHash: {
      type: String,
      required: [true, 'Previous hash is required'],
    },
    currentHash: {
      type: String,
      required: [true, 'Current hash is required'],
    },
    hash: {
      type: String,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: false, 
    versionKey: false,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: any) => {
        ret.id = ret._id.toString();
        delete ret._id;
        if (!ret.hash) ret.hash = ret.currentHash;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (_doc, ret: any) => {
        ret.id = ret._id.toString();
        delete ret._id;
        if (!ret.hash) ret.hash = ret.currentHash;
        return ret;
      },
    },
  }
);

auditLogSchema.index({ sequenceNumber: 1 }, { unique: true });
auditLogSchema.index({ entityType: 1, entityId: 1, timestamp: -1 });
auditLogSchema.index({ bookingId: 1, timestamp: -1 });
auditLogSchema.index({ resourceId: 1, timestamp: -1 });
auditLogSchema.index({ actorId: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });

auditLogSchema.pre('save', function (next) {
  if (!this.hash && this.currentHash) {
    this.hash = this.currentHash;
  } else if (!this.currentHash && this.hash) {
    this.currentHash = this.hash;
  }
  next();
});

const throwImmutableError = () => {
  throw new Error('AUDIT_LOG_IMMUTABLE: Audit logs are append-only and cannot be updated or deleted.');
};

auditLogSchema.pre('updateOne', throwImmutableError);
auditLogSchema.pre('updateMany', throwImmutableError);
auditLogSchema.pre('findOneAndUpdate', throwImmutableError);
auditLogSchema.pre('findOneAndReplace', throwImmutableError);
auditLogSchema.pre('replaceOne', throwImmutableError);
auditLogSchema.pre('deleteOne', throwImmutableError);
auditLogSchema.pre('deleteMany', throwImmutableError);
auditLogSchema.pre('findOneAndDelete', throwImmutableError);

auditLogSchema.statics.getLatest = function () {
  return this.findOne().sort({ sequenceNumber: -1 });
};

auditLogSchema.statics.getNextSequence = async function (): Promise<number> {
  const latest = await this.findOne().sort({ sequenceNumber: -1 }).select('sequenceNumber');
  return latest ? latest.sequenceNumber + 1 : 1;
};

export const AuditLog: AuditLogModel =
  (mongoose.models.AuditLog as AuditLogModel) ||
  mongoose.model<IAuditLogDocument, AuditLogModel>('AuditLog', auditLogSchema);
