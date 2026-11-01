import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IRefreshToken extends Document {
  tokenId: string;
  tokenHash: string;
  userId: mongoose.Types.ObjectId;
  family: string;
  isRevoked: boolean;
  revokedReason?: string;
  replacedByTokenId?: string;
  expiresAt: Date;
  createdAt: Date;
}

export const refreshTokenSchema = new Schema<IRefreshToken>(
  {
    tokenId: { type: String, required: true, unique: true },
    tokenHash: { type: String, required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    family: { type: String, required: true, index: true },
    isRevoked: { type: Boolean, default: false },
    revokedReason: { type: String },
    replacedByTokenId: { type: String },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RefreshToken: Model<IRefreshToken> =
  mongoose.models.RefreshToken || mongoose.model<IRefreshToken>('RefreshToken', refreshTokenSchema, 'refresh_tokens');
