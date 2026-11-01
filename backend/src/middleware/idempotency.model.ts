import mongoose, { Schema, Document, Model } from 'mongoose';

export type IdempotencyStatus = 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';

export interface IIdempotencyKey extends Document {
  key: string;
  userId?: mongoose.Types.ObjectId;
  route: string;
  requestHash: string;
  status: IdempotencyStatus;
  statusCode?: number;
  responseBody?: any;
  createdAt: Date;
}

export const idempotencyKeySchema = new Schema<IIdempotencyKey>(
  {
    key: { type: String, required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: false },
    route: { type: String, required: true },
    requestHash: { type: String, required: true },
    status: {
      type: String,
      required: true,
      enum: ['IN_PROGRESS', 'COMPLETED', 'FAILED'],
      default: 'IN_PROGRESS',
    },
    statusCode: { type: Number },
    responseBody: { type: Schema.Types.Mixed },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 86400, 
    },
  },
  { timestamps: false }
);

export const IdempotencyKey: Model<IIdempotencyKey> =
  mongoose.models.IdempotencyKey || mongoose.model<IIdempotencyKey>('IdempotencyKey', idempotencyKeySchema, 'idempotency_keys');
