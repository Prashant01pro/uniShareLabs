import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IOperationalHours {
  dailyStartTime: string; 
  dailyEndTime: string;   
  allowedDays: number[];  
}

export interface ILab {
  name: string;
  code: string;
  institution: string;
  department: string;
  building: string;
  room: string;
  safetyOfficerId?: mongoose.Types.ObjectId | null;
  contactEmail: string;
  operationalHours: IOperationalHours;
  certificationsSupported: string[];
  description?: string;
  capacity?: number;
  safetyLevel?: 'LEVEL_1_GENERAL' | 'LEVEL_2_SUPERVISED' | 'LEVEL_3_RESTRICTED';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ILabMethods {
  isOpenAt(date: Date): boolean;
}

export type ILabDocument = ILab & Document & ILabMethods;

export interface LabModel extends Model<ILabDocument> {
  findByCode(code: string): Promise<ILabDocument | null>;
}

const operationalHoursSchema = new Schema<IOperationalHours>(
  {
    dailyStartTime: {
      type: String,
      required: [true, 'Daily start time is required'],
      default: '08:00',
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Daily start time must be in HH:mm 24-hour format'],
    },
    dailyEndTime: {
      type: String,
      required: [true, 'Daily end time is required'],
      default: '20:00',
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Daily end time must be in HH:mm 24-hour format'],
    },
    allowedDays: {
      type: [Number],
      required: true,
      default: [1, 2, 3, 4, 5], 
      validate: {
        validator: (days: number[]) => days.every((d) => Number.isInteger(d) && d >= 1 && d <= 7),
        message: 'Allowed days must be integers between 1 (Monday) and 7 (Sunday)',
      },
    },
  },
  { _id: false }
);

const labSchema = new Schema<ILabDocument, LabModel>(
  {
    name: {
      type: String,
      required: [true, 'Laboratory name is required'],
      trim: true,
      minlength: [2, 'Laboratory name must be at least 2 characters'],
      maxlength: [150, 'Laboratory name cannot exceed 150 characters'],
    },
    code: {
      type: String,
      required: [true, 'Laboratory code is required'],
      unique: true,
      uppercase: true,
      trim: true,
      minlength: [2, 'Laboratory code must be at least 2 characters'],
      maxlength: [50, 'Laboratory code cannot exceed 50 characters'],
    },
    institution: {
      type: String,
      required: [true, 'Institution name is required'],
      trim: true,
      default: 'University Institute of Technology & Research',
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      trim: true,
    },
    building: {
      type: String,
      required: [true, 'Building is required'],
      trim: true,
    },
    room: {
      type: String,
      required: [true, 'Room number/code is required'],
      trim: true,
    },
    safetyOfficerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    contactEmail: {
      type: String,
      required: [true, 'Contact email is required'],
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid contact email address'],
    },
    operationalHours: {
      type: operationalHoursSchema,
      required: true,
      default: () => ({
        dailyStartTime: '08:00',
        dailyEndTime: '20:00',
        allowedDays: [1, 2, 3, 4, 5],
      }),
    },
    certificationsSupported: {
      type: [String],
      default: [],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    capacity: {
      type: Number,
      min: 1,
      default: 20,
    },
    safetyLevel: {
      type: String,
      enum: ['LEVEL_1_GENERAL', 'LEVEL_2_SUPERVISED', 'LEVEL_3_RESTRICTED'],
      default: 'LEVEL_1_GENERAL',
    },
    isActive: {
      type: Boolean,
      default: true,
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

labSchema.index({ department: 1, isActive: 1 });
labSchema.index({ building: 1, room: 1 });
labSchema.index({ safetyOfficerId: 1 });

labSchema.methods.isOpenAt = function (date: Date): boolean {
  if (!this.isActive) return false;

  const jsDay = date.getUTCDay();
  const isoDay = jsDay === 0 ? 7 : jsDay;

  if (!this.operationalHours.allowedDays.includes(isoDay)) {
    return false;
  }

  const hours = date.getUTCHours();
  const minutes = date.getUTCMinutes();
  const currentTimeMins = hours * 60 + minutes;

  const [startH, startM] = this.operationalHours.dailyStartTime.split(':').map(Number);
  const [endH, endM] = this.operationalHours.dailyEndTime.split(':').map(Number);

  const startMins = startH * 60 + startM;
  const endMins = endH * 60 + endM;

  return currentTimeMins >= startMins && currentTimeMins < endMins;
};

labSchema.statics.findByCode = function (code: string) {
  return this.findOne({ code: code.toUpperCase().trim() });
};

export const Lab: LabModel =
  (mongoose.models.Lab as LabModel) || mongoose.model<ILabDocument, LabModel>('Lab', labSchema);
