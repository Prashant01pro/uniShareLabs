import mongoose, { Schema, Document, Model } from 'mongoose';
import bcryptjs from 'bcryptjs';

export type UserRole = 'STUDENT' | 'RESEARCHER' | 'RESOURCE_OWNER' | 'LAB_MANAGER' | 'ADMIN';

export interface ICertification {
  certCode: string;
  name: string;
  issuedAt: Date;
  expiresAt: Date;
}

export interface IUser {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  department: string;
  labGroupId?: string;
  certifications: ICertification[];
  safetyTrainingsCompleted: string[];
  inductionsCompleted: mongoose.Types.ObjectId[];
  trustScore: number;
  reputationPoints: number;
  reputationScore?: number; 
  weeklyQuotaLimitHours: number;
  weeklyQuotaUsedHours: number;
  activePenaltyPoints: number;
  lastActiveAt: Date;
  isActive: boolean;
  isSuspended: boolean;
  suspensionReason?: string;
  weeklyQuotaOverrides?: Map<string, number>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserMethods {
  comparePassword(candidatePassword: string): Promise<boolean>;
  hasRole(...roles: UserRole[]): boolean;
  hasValidCertification(certCode: string, atDate?: Date): boolean;
  getRemainingWeeklyQuota(): number;
}

export type IUserDocument = IUser & Document & IUserMethods;

export interface UserModel extends Model<IUserDocument> {
  findByEmail(email: string): Promise<IUserDocument | null>;
  getDefaultQuotaForRole(role: UserRole): number;
}

const certificationSchema = new Schema<ICertification>(
  {
    certCode: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    issuedAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
  },
  { _id: false }
);

const userSchema = new Schema<IUserDocument, UserModel>(
  {
    name: {
      type: String,
      required: [true, 'User name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name must not exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email address is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email address'],
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      select: false, 
    },
    role: {
      type: String,
      required: true,
      enum: ['STUDENT', 'RESEARCHER', 'RESOURCE_OWNER', 'LAB_MANAGER', 'ADMIN'],
      default: 'STUDENT',
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      trim: true,
    },
    labGroupId: {
      type: String,
      trim: true,
    },
    certifications: {
      type: [certificationSchema],
      default: [],
    },
    safetyTrainingsCompleted: {
      type: [String],
      default: [],
    },
    inductionsCompleted: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Resource',
      },
    ],
    trustScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 85,
    },
    reputationPoints: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 80,
    },
    weeklyQuotaLimitHours: {
      type: Number,
      required: true,
      min: 0,
      default: function (this: IUserDocument) {
        if (!this.role) return 10;
        switch (this.role) {
          case 'STUDENT':
            return 10;
          case 'RESEARCHER':
            return 25;
          case 'RESOURCE_OWNER':
          case 'LAB_MANAGER':
            return 40;
          case 'ADMIN':
            return 100;
          default:
            return 10;
        }
      },
    },
    weeklyQuotaUsedHours: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    activePenaltyPoints: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    lastActiveAt: {
      type: Date,
      default: Date.now,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isSuspended: {
      type: Boolean,
      default: false,
    },
    suspensionReason: {
      type: String,
      trim: true,
    },
    weeklyQuotaOverrides: {
      type: Map,
      of: Number,
      default: {},
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: any) => {
        delete ret.passwordHash;
        delete ret.__v;
        ret.id = ret._id.toString();
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (_doc, ret: any) => {
        delete ret.passwordHash;
        delete ret.__v;
        ret.id = ret._id.toString();
        return ret;
      },
    },
  }
);

userSchema
  .virtual('reputationScore')
  .get(function (this: IUserDocument) {
    return this.reputationPoints;
  })
  .set(function (this: IUserDocument, val: number) {
    this.reputationPoints = val;
  });

userSchema.index({ role: 1, department: 1 });
userSchema.index({ trustScore: -1 });
userSchema.index({ department: 1, isActive: 1 });

userSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) {
    return next();
  }

  if (/^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(this.passwordHash)) {
    return next();
  }

  try {
    const salt = await bcryptjs.genSalt(10);
    this.passwordHash = await bcryptjs.hash(this.passwordHash, salt);
    next();
  } catch (err: any) {
    next(err);
  }
});

userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  if (!this.passwordHash) {
    return false;
  }
  return bcryptjs.compare(candidatePassword, this.passwordHash);
};

userSchema.methods.hasRole = function (...roles: UserRole[]): boolean {
  return roles.includes(this.role);
};

userSchema.methods.hasValidCertification = function (certCode: string, atDate: Date = new Date()): boolean {
  if (!this.certifications || this.certifications.length === 0) {
    return false;
  }
  return this.certifications.some(
    (c: ICertification) =>
      c.certCode === certCode && new Date(c.issuedAt) <= atDate && new Date(c.expiresAt) > atDate
  );
};

userSchema.methods.getRemainingWeeklyQuota = function (): number {
  return Math.max(0, this.weeklyQuotaLimitHours - this.weeklyQuotaUsedHours);
};

userSchema.statics.findByEmail = function (email: string) {
  return this.findOne({ email: email.toLowerCase().trim() });
};

userSchema.statics.getDefaultQuotaForRole = function (role: UserRole): number {
  switch (role) {
    case 'STUDENT':
      return 10;
    case 'RESEARCHER':
      return 25;
    case 'RESOURCE_OWNER':
    case 'LAB_MANAGER':
      return 40;
    case 'ADMIN':
      return 100;
    default:
      return 10;
  }
};

export const User: UserModel =
  (mongoose.models.User as UserModel) || mongoose.model<IUserDocument, UserModel>('User', userSchema);
