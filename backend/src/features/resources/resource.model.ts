import mongoose, { Schema, Document, Model } from 'mongoose';
import { UserRole } from '../auth/user.model';

export type ResourceCategory =
  | 'LAB_BENCH'
  | 'TESTING_INSTRUMENT'
  | 'MAKERSPACE_TOOL'
  | 'CLEANROOM_BAY'
  | 'COMPUTING_CLUSTER'
  | 'MICROSCOPES'
  | 'CLEANROOMS'
  | 'MAKERSPACE_3D_PRINTERS'
  | 'SPECTROMETERS'
  | 'CNC_MACHINING'
  | 'GENERAL_LAB';

export type ResourceStatus = 'AVAILABLE' | 'MAINTENANCE' | 'DECOMMISSIONED' | 'OFFLINE';

export type SafetyLevel = 'LEVEL_1_GENERAL' | 'LEVEL_2_SUPERVISED' | 'LEVEL_3_RESTRICTED';

export type ApprovalMode = 'AUTOMATIC' | 'MANUAL_REVIEW';

export type AccessControlMethod = 'DIGITAL_PIN' | 'RFID_BADGE' | 'KEYBOX_CODE' | 'STAFF_HANDOVER';

export interface IResourceOperatingHours {
  dailyStartTime: string; 
  dailyEndTime: string;   
  allowedDays: number[];  
}

export interface IResourceCalendar extends IResourceOperatingHours {
  slotGranularityMinutes: number; 
  minDurationMinutes: number;     
  maxDurationMinutes: number;     
  bufferTimeMinutes: number;      
  advanceBookingDaysMax: number;  
  leadTimeMinutesMin: number;     
}

export interface IChecklistItem {
  itemId: string;
  itemText: string;
  isCritical: boolean;
}

export interface ICustomChecklists {
  preUse: Array<{ id: string; text: string; isCritical: boolean }>;
  postUse: Array<{ id: string; text: string; isCritical: boolean }>;
}

export interface IMeterConfig {
  meterKey: string;
  label: string;
  unit: string;
  meterType: 'INCREMENTAL_COUNTER' | 'GAUGE_VALUE' | 'CYCLE_COUNT';
  warningDeltaThreshold?: number;
}

export interface IInspectionConfig {
  checklistItems: IChecklistItem[];
  meters: IMeterConfig[];
  requirePhotos: boolean;
  maxPhotos: number;
}

export interface IRequiredCertification {
  certCode: string;
  name: string;
  validityPeriodDays?: number;
}

export interface IResourcePrerequisites {
  minRole: UserRole;
  requiredCertifications: IRequiredCertification[];
  requiredSafetyTrainings: string[];
  supervisorEndorsementRequired: boolean;
  projectGrantCodeRequired: boolean;
  requiresInduction: boolean;
  safetyAgreementRequired: boolean;
}

export interface IMaintenanceWindow {
  windowId: string;
  title: string;
  startTime: Date;
  endTime: Date;
  recurrence: 'NONE' | 'WEEKLY' | 'MONTHLY';
  blocksBookings: boolean;
}

export interface IResourceAccessControl {
  method: AccessControlMethod;
  pinSecretHash?: string;
}

export interface IResource {
  title: string;
  name: string;
  code: string;
  category: ResourceCategory;
  department: string;
  labLocation: string;
  labId?: mongoose.Types.ObjectId;
  ownerId: mongoose.Types.ObjectId;
  delegates: mongoose.Types.ObjectId[];
  description: string;
  specs: Record<string, any>;
  specifications: Record<string, any>;
  status: ResourceStatus;
  approvalMode: ApprovalMode;
  hourlyRate: number;
  safetyLevel: SafetyLevel;
  capacity: number;
  leadTimeHours: number;
  bufferMinutes: number;
  cooldownMinutes: number;
  operatingHours: IResourceOperatingHours;
  calendar: IResourceCalendar;
  customChecklists: ICustomChecklists;
  inspectionChecklist: IChecklistItem[];
  inspectionConfig: IInspectionConfig;
  requiredCertifications: IRequiredCertification[];
  prerequisites: IResourcePrerequisites;
  maintenanceWindows: IMaintenanceWindow[];
  accessControl: IResourceAccessControl;
  createdAt: Date;
  updatedAt: Date;
}

export interface IResourceMethods {
  isOperationalAt(date: Date): boolean;
  hasMaintenanceCollision(startTime: Date, endTime: Date): boolean;
}

export type IResourceDocument = IResource & Document & IResourceMethods;

export interface ResourceModel extends Model<IResourceDocument> {
  findByCode(code: string): Promise<IResourceDocument | null>;
}

const checklistItemSchema = new Schema<IChecklistItem>(
  {
    itemId: { type: String, required: true, trim: true },
    itemText: { type: String, required: true, trim: true },
    isCritical: { type: Boolean, default: false },
  },
  { _id: false }
);

const meterConfigSchema = new Schema<IMeterConfig>(
  {
    meterKey: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    unit: { type: String, required: true, trim: true },
    meterType: {
      type: String,
      required: true,
      enum: ['INCREMENTAL_COUNTER', 'GAUGE_VALUE', 'CYCLE_COUNT'],
      default: 'INCREMENTAL_COUNTER',
    },
    warningDeltaThreshold: { type: Number },
  },
  { _id: false }
);

const maintenanceWindowSchema = new Schema<IMaintenanceWindow>(
  {
    windowId: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    recurrence: {
      type: String,
      enum: ['NONE', 'WEEKLY', 'MONTHLY'],
      default: 'NONE',
    },
    blocksBookings: { type: Boolean, default: true },
  },
  { _id: false }
);

const requiredCertSchema = new Schema<IRequiredCertification>(
  {
    certCode: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    validityPeriodDays: { type: Number, default: 365 },
  },
  { _id: false }
);

const resourceSchema = new Schema<IResourceDocument, ResourceModel>(
  {
    title: {
      type: String,
      required: [true, 'Resource title/name is required'],
      trim: true,
      minlength: [2, 'Resource title must be at least 2 characters'],
      maxlength: [150, 'Resource title cannot exceed 150 characters'],
    },
    name: {
      type: String,
      trim: true,
    },
    code: {
      type: String,
      required: [true, 'Resource code is required'],
      unique: true,
      uppercase: true,
      trim: true,
      minlength: [2, 'Resource code must be at least 2 characters'],
      maxlength: [50, 'Resource code cannot exceed 50 characters'],
    },
    category: {
      type: String,
      required: [true, 'Resource category is required'],
      enum: [
        'LAB_BENCH',
        'TESTING_INSTRUMENT',
        'MAKERSPACE_TOOL',
        'CLEANROOM_BAY',
        'COMPUTING_CLUSTER',
        'MICROSCOPES',
        'CLEANROOMS',
        'MAKERSPACE_3D_PRINTERS',
        'SPECTROMETERS',
        'CNC_MACHINING',
        'GENERAL_LAB',
      ],
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      trim: true,
    },
    labLocation: {
      type: String,
      required: [true, 'Lab location description is required'],
      trim: true,
    },
    labId: {
      type: Schema.Types.ObjectId,
      ref: 'Lab',
      default: null,
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Resource ownerId is required'],
    },
    delegates: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: [4000, 'Description cannot exceed 4000 characters'],
    },
    specs: {
      type: Schema.Types.Mixed,
      default: {},
    },
    specifications: {
      type: Schema.Types.Mixed,
      default: {},
    },
    status: {
      type: String,
      required: true,
      enum: ['AVAILABLE', 'MAINTENANCE', 'DECOMMISSIONED', 'OFFLINE'],
      default: 'AVAILABLE',
    },
    approvalMode: {
      type: String,
      required: true,
      enum: ['AUTOMATIC', 'MANUAL_REVIEW'],
      default: 'MANUAL_REVIEW',
    },
    hourlyRate: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    safetyLevel: {
      type: String,
      required: true,
      enum: ['LEVEL_1_GENERAL', 'LEVEL_2_SUPERVISED', 'LEVEL_3_RESTRICTED'],
      default: 'LEVEL_1_GENERAL',
    },
    capacity: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    leadTimeHours: {
      type: Number,
      required: true,
      min: 0,
      default: 1,
    },
    bufferMinutes: {
      type: Number,
      required: true,
      min: 0,
      default: 15,
    },
    cooldownMinutes: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    operatingHours: {
      allowedDays: {
        type: [Number],
        default: [1, 2, 3, 4, 5],
      },
      dailyStartTime: {
        type: String,
        default: '08:00',
      },
      dailyEndTime: {
        type: String,
        default: '20:00',
      },
    },
    calendar: {
      allowedDays: {
        type: [Number],
        default: [1, 2, 3, 4, 5],
      },
      dailyStartTime: {
        type: String,
        default: '08:00',
      },
      dailyEndTime: {
        type: String,
        default: '20:00',
      },
      slotGranularityMinutes: {
        type: Number,
        default: 30,
      },
      minDurationMinutes: {
        type: Number,
        default: 30,
      },
      maxDurationMinutes: {
        type: Number,
        default: 240,
      },
      bufferTimeMinutes: {
        type: Number,
        default: 15,
      },
      advanceBookingDaysMax: {
        type: Number,
        default: 14,
      },
      leadTimeMinutesMin: {
        type: Number,
        default: 60,
      },
    },
    customChecklists: {
      preUse: [
        {
          id: { type: String, required: true },
          text: { type: String, required: true },
          isCritical: { type: Boolean, default: false },
        },
      ],
      postUse: [
        {
          id: { type: String, required: true },
          text: { type: String, required: true },
          isCritical: { type: Boolean, default: false },
        },
      ],
    },
    inspectionChecklist: [checklistItemSchema],
    inspectionConfig: {
      checklistItems: [checklistItemSchema],
      meters: [meterConfigSchema],
      requirePhotos: {
        type: Boolean,
        default: true,
      },
      maxPhotos: {
        type: Number,
        default: 4,
      },
    },
    requiredCertifications: [requiredCertSchema],
    prerequisites: {
      minRole: {
        type: String,
        enum: ['STUDENT', 'RESEARCHER', 'RESOURCE_OWNER', 'LAB_MANAGER', 'ADMIN'],
        default: 'STUDENT',
      },
      requiredCertifications: [requiredCertSchema],
      requiredSafetyTrainings: {
        type: [String],
        default: [],
      },
      supervisorEndorsementRequired: {
        type: Boolean,
        default: false,
      },
      projectGrantCodeRequired: {
        type: Boolean,
        default: false,
      },
      requiresInduction: {
        type: Boolean,
        default: false,
      },
      safetyAgreementRequired: {
        type: Boolean,
        default: true,
      },
    },
    maintenanceWindows: [maintenanceWindowSchema],
    accessControl: {
      method: {
        type: String,
        enum: ['DIGITAL_PIN', 'RFID_BADGE', 'KEYBOX_CODE', 'STAFF_HANDOVER'],
        default: 'DIGITAL_PIN',
      },
      pinSecretHash: {
        type: String,
      },
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: any) => {
        delete ret.__v;
        if (ret.accessControl?.pinSecretHash) {
          delete ret.accessControl.pinSecretHash;
        }
        ret.id = ret._id.toString();
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (_doc, ret: any) => {
        delete ret.__v;
        if (ret.accessControl?.pinSecretHash) {
          delete ret.accessControl.pinSecretHash;
        }
        ret.id = ret._id.toString();
        return ret;
      },
    },
  }
);

resourceSchema.index({ category: 1, status: 1 });
resourceSchema.index({ department: 1, status: 1 });
resourceSchema.index({ labId: 1, status: 1 });
resourceSchema.index({ ownerId: 1 });
resourceSchema.index({ safetyLevel: 1 });

resourceSchema.pre('save', function (next) {
  if (this.title && !this.name) {
    this.name = this.title;
  } else if (this.name && !this.title) {
    this.title = this.name;
  }

  if (this.specs && (!this.specifications || Object.keys(this.specifications).length === 0)) {
    this.specifications = this.specs;
  } else if (this.specifications && (!this.specs || Object.keys(this.specs).length === 0)) {
    this.specs = this.specifications;
  }

  if (this.operatingHours) {
    if (!this.calendar) {
      this.calendar = {
        allowedDays: this.operatingHours.allowedDays || [1, 2, 3, 4, 5],
        dailyStartTime: this.operatingHours.dailyStartTime || '08:00',
        dailyEndTime: this.operatingHours.dailyEndTime || '20:00',
        slotGranularityMinutes: 30,
        minDurationMinutes: 30,
        maxDurationMinutes: 240,
        bufferTimeMinutes: this.bufferMinutes || 15,
        advanceBookingDaysMax: 14,
        leadTimeMinutesMin: (this.leadTimeHours || 1) * 60,
      };
    } else {
      if (this.operatingHours.dailyStartTime) this.calendar.dailyStartTime = this.operatingHours.dailyStartTime;
      if (this.operatingHours.dailyEndTime) this.calendar.dailyEndTime = this.operatingHours.dailyEndTime;
      if (this.operatingHours.allowedDays) this.calendar.allowedDays = this.operatingHours.allowedDays;
    }
  }

  if (this.leadTimeHours !== undefined && this.calendar) {
    this.calendar.leadTimeMinutesMin = this.leadTimeHours * 60;
  }

  if (this.bufferMinutes !== undefined && this.calendar) {
    this.calendar.bufferTimeMinutes = this.bufferMinutes;
  }

  if (this.inspectionChecklist && this.inspectionChecklist.length > 0) {
    if (!this.inspectionConfig) {
      this.inspectionConfig = {
        checklistItems: this.inspectionChecklist,
        meters: [],
        requirePhotos: true,
        maxPhotos: 4,
      };
    } else if (!this.inspectionConfig.checklistItems || this.inspectionConfig.checklistItems.length === 0) {
      this.inspectionConfig.checklistItems = this.inspectionChecklist;
    }
  }

  if (this.requiredCertifications && this.requiredCertifications.length > 0) {
    if (!this.prerequisites) {
      this.prerequisites = {
        minRole: 'STUDENT',
        requiredCertifications: this.requiredCertifications,
        requiredSafetyTrainings: [],
        supervisorEndorsementRequired: false,
        projectGrantCodeRequired: false,
        requiresInduction: false,
        safetyAgreementRequired: true,
      };
    } else if (
      !this.prerequisites.requiredCertifications ||
      this.prerequisites.requiredCertifications.length === 0
    ) {
      this.prerequisites.requiredCertifications = this.requiredCertifications;
    }
  }

  next();
});

resourceSchema.methods.isOperationalAt = function (date: Date): boolean {
  if (this.status !== 'AVAILABLE') return false;

  const cal = this.calendar || this.operatingHours;
  if (!cal) return true;

  const jsDay = date.getUTCDay();
  const isoDay = jsDay === 0 ? 7 : jsDay;

  if (cal.allowedDays && !cal.allowedDays.includes(isoDay)) {
    return false;
  }

  const hours = date.getUTCHours();
  const minutes = date.getUTCMinutes();
  const currentTimeMins = hours * 60 + minutes;

  const [startH, startM] = (cal.dailyStartTime || '08:00').split(':').map(Number);
  const [endH, endM] = (cal.dailyEndTime || '20:00').split(':').map(Number);

  const startMins = startH * 60 + startM;
  const endMins = endH * 60 + endM;

  return currentTimeMins >= startMins && currentTimeMins < endMins;
};

resourceSchema.methods.hasMaintenanceCollision = function (startTime: Date, endTime: Date): boolean {
  if (!this.maintenanceWindows || this.maintenanceWindows.length === 0) {
    return false;
  }

  const s = startTime.getTime();
  const e = endTime.getTime();

  return this.maintenanceWindows.some((window: IMaintenanceWindow) => {
    if (!window.blocksBookings) return false;
    const ws = new Date(window.startTime).getTime();
    const we = new Date(window.endTime).getTime();
    return s < we && e > ws;
  });
};

resourceSchema.statics.findByCode = function (code: string) {
  return this.findOne({ code: code.toUpperCase().trim() });
};

export const Resource: ResourceModel =
  (mongoose.models.Resource as ResourceModel) ||
  mongoose.model<IResourceDocument, ResourceModel>('Resource', resourceSchema);
