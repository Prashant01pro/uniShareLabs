declare global {
  interface ImportMetaEnv {
    readonly VITE_API_URL?: string;
    readonly VITE_SOCKET_URL?: string;
    readonly [key: string]: string | undefined;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

export type UserRole =
  | 'STUDENT'
  | 'RESEARCHER'
  | 'RESOURCE_OWNER'
  | 'LAB_MANAGER'
  | 'ADMIN';

export interface ICertification {
  certCode: string;
  name: string;
  issuedAt: string | Date;
  expiresAt: string | Date;
}

export interface IUser {
  _id: string;
  id?: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  labGroupId?: string;
  certifications: ICertification[];
  safetyTrainingsCompleted: string[];
  inductionsCompleted?: string[];
  trustScore: number; 
  reputationPoints?: number;
  reputationScore?: number;
  weeklyQuotaLimitHours: number;
  weeklyQuotaUsedHours: number;
  isActive: boolean;
  isSuspended?: boolean;
  suspensionReason?: string;
  weeklyQuotaOverrides?: Record<string, number>;
  lastActiveAt?: string | Date;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface IDemoPersona {
  role: UserRole;
  name: string;
  email: string;
  department: string;
  trustScore: number;
  quotaHours: number;
  avatar: string;
  badge: string;
  description: string;
}

export interface IOperationalHours {
  dailyStartTime: string; 
  dailyEndTime: string;   
  allowedDays: number[];  
}

export interface ILab {
  _id: string;
  name: string;
  code: string;
  institution: string;
  department: string;
  building: string;
  room: string;
  safetyOfficerId?: string | null;
  contactEmail: string;
  operationalHours: IOperationalHours;
  certificationsSupported: string[];
  description?: string;
  capacity?: number;
  safetyLevel?: SafetyLevel;
  isActive: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export type ResourceCategory =
  | 'MICROSCOPES'
  | 'CLEANROOMS'
  | 'MAKERSPACE_3D_PRINTERS'
  | 'SPECTROMETERS'
  | 'CNC_MACHINING'
  | 'GENERAL_LAB'
  | 'LAB_BENCH'
  | 'TESTING_INSTRUMENT'
  | 'MAKERSPACE_TOOL'
  | 'CLEANROOM_BAY'
  | 'COMPUTING_CLUSTER';

export type ResourceStatus =
  | 'AVAILABLE'
  | 'MAINTENANCE'
  | 'DECOMMISSIONED'
  | 'OFFLINE';

export type SafetyLevel =
  | 'LEVEL_1_GENERAL'
  | 'LEVEL_2_SUPERVISED'
  | 'LEVEL_3_RESTRICTED';

export type ApprovalMode = 'AUTOMATIC' | 'MANUAL_REVIEW';

export type AccessControlMethod =
  | 'DIGITAL_PIN'
  | 'RFID_BADGE'
  | 'KEYBOX_CODE'
  | 'STAFF_HANDOVER';

export interface IResourceCalendar extends IOperationalHours {
  slotGranularityMinutes: number; 
  minDurationMinutes: number;     
  maxDurationMinutes: number;     
  bufferTimeMinutes: number;      
  advanceBookingDaysMax: number;  
  leadTimeMinutesMin: number;     
}

export interface IMaintenanceWindow {
  windowId: string;
  title: string;
  startTime: string | Date;
  endTime: string | Date;
  recurrence: 'NONE' | 'WEEKLY' | 'MONTHLY';
  blocksBookings: boolean;
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
  safetyAgreementRequired?: boolean;
}

export interface IChecklistItem {
  itemId: string;
  itemText: string;
  isCritical: boolean;
}

export type MeterType = 'INCREMENTAL_COUNTER' | 'GAUGE_VALUE' | 'CYCLE_COUNT';

export interface IMeterConfig {
  meterKey: string;
  label: string;
  unit: string;
  meterType: MeterType;
  warningDeltaThreshold?: number;
}

export interface IInspectionConfig {
  checklistItems: IChecklistItem[];
  meters: IMeterConfig[];
  requirePhotos: boolean;
  maxPhotos: number;
}

export interface IResourceAccessControl {
  method: AccessControlMethod;
  pinSecretHash?: string;
}

export interface IResource {
  _id: string;
  name: string;
  title?: string;
  code: string;
  category: ResourceCategory;
  department: string;
  labLocation: string;
  labId?: string | ILab;
  ownerId: string | IUser;
  delegates?: (string | IUser)[];
  description: string;
  specifications?: Record<string, any>;
  specs?: Record<string, any>;
  status: ResourceStatus;
  approvalMode: ApprovalMode;
  cooldownMinutes: number;
  hourlyRate?: number;
  safetyLevel?: SafetyLevel;
  capacity?: number;
  leadTimeHours?: number;
  bufferMinutes?: number;
  calendar: IResourceCalendar;
  maintenanceWindows: IMaintenanceWindow[];
  prerequisites: IResourcePrerequisites;
  inspectionConfig: IInspectionConfig;
  accessControl: IResourceAccessControl;
  imageUrl?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface IEligibilityCheckItem {
  rule: string;
  passed: boolean;
  message: string;
  details?: any;
}

export interface IEligibilityResult {
  isEligible: boolean;
  eligibilityScore: number;
  checks: IEligibilityCheckItem[];
  blockingReasons: string[];
  recommendedRemediation: string[];
}

export type BookingStatus =
  | 'DRAFT'
  | 'PENDING_REVIEW'
  | 'APPROVED'
  | 'WAITLISTED'
  | 'OFFERED'
  | 'CHECKED_IN'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REJECTED'
  | 'NO_SHOW'
  | 'DISPUTED'
  | 'RESOLVED'
  | 'PENDING_VERIFICATION'
  | 'AWAITING_APPROVAL'
  | 'IN_USE'
  | 'RETURNED';

export interface IBooking {
  _id: string;
  resourceId: string | IResource;
  userId: string | IUser;
  startTime: string | Date; 
  endTime: string | Date;   
  durationMinutes: number;
  status: BookingStatus;
  projectGrantCode?: string;
  supervisorEmail?: string;
  supervisorEndorsed: boolean;
  safetyAcknowledgement: boolean;
  intendedPurpose: string;
  idempotencyKey?: string;
  allowWaitlist?: boolean;
  bufferMinutes?: number;

  reviewedBy?: string | IUser;
  reviewedAt?: string | Date;
  reviewNotes?: string;
  rejectionReasonCode?: string;
  rejectionMessage?: string;
  assignedDelegate?: string | IUser;

  fairnessScore?: number;
  waitlistPriority?: number;
  offerExpiresAt?: string | Date;

  accessPin?: string;
  checkInTime?: string | Date;
  returnTime?: string | Date;

  cancellationReason?: string;
  cancelledAt?: string | Date;
  cancelledBy?: string | IUser;

  resource?: IResource;
  user?: IUser;

  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export type InspectionType =
  | 'INITIAL_CHECKIN'
  | 'FINAL_RETURN'
  | 'CHECK_IN'
  | 'RETURN';

export type ConditionRating =
  | 'EXCELLENT'
  | 'GOOD'
  | 'FAIR'
  | 'POOR'
  | 'DAMAGED';

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
  uploadedAt?: string | Date;
}

export interface IConditionDiff {
  initialRating: ConditionRating;
  finalRating: ConditionRating;
  ratingDelta: number; 
  meterDeltas: Record<string, number>;
  flaggedAnomaly: boolean;
  anomalyDetails?: string;
  incidentCreated?: boolean;
  incidentId?: string;
}

export interface IInspection {
  _id: string;
  bookingId: string | IBooking;
  resourceId: string | IResource;
  inspectorId: string | IUser;
  inspectorRole?: string;
  type: InspectionType;
  phase?: InspectionType;
  conditionRating: ConditionRating;
  checklistResponses: IChecklistResponse[];
  meterReadings: Record<string, number>;
  photos?: IPhotoUpload[];
  photoUploads?: IPhotoUpload[];
  notes?: string;
  conditionDiff?: IConditionDiff;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export type IncidentCategory =
  | 'LATE_RETURN'
  | 'EQUIPMENT_DAMAGE'
  | 'MISSING_ACCESSORY'
  | 'SAFETY_VIOLATION'
  | 'ENVIRONMENTAL_SPILL'
  | 'PHYSICAL_DAMAGE'
  | 'UNAUTHORIZED_ACCESS'
  | 'MISSING_PARTS'
  | 'SAFETY_BREACH';

export type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type IncidentStatus =
  | 'OPEN'
  | 'UNDER_REVIEW'
  | 'ADJUDICATED'
  | 'DISMISSED'
  | 'INVESTIGATING'
  | 'RESOLVED'
  | 'ESCALATED';

export type AdjudicationDecision =
  | 'USER_LIABLE'
  | 'PREEXISTING_FATIGUE'
  | 'SHARED_LIABILITY'
  | 'DISMISSED';

export interface IAdjudication {
  adjudicatedBy: string | IUser;
  adjudicatedAt: string | Date;
  decision: AdjudicationDecision;
  penaltyPointsAssigned: number;
  penaltyHours?: number;
  billingChargeAmount?: number;
  grantCodeCharged?: string;
  actionItemsRequired: string[];
  findingsSummary: string;
}

export interface IIncident {
  _id: string;
  incidentNumber: string;
  bookingId: string | IBooking;
  resourceId: string | IResource;
  reportedBy: string | IUser;
  accusedParty?: string | IUser;
  category: IncidentCategory;
  severity: IncidentSeverity;
  status: IncidentStatus;
  description: string;
  evidencePhotos: IPhotoUpload[];
  disputeStatement?: string;
  penaltyHours?: number;
  adjudication?: IAdjudication;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface IAuditLog {
  _id: string;
  sequenceNumber: number;
  eventId: string;
  timestamp: string | Date;
  action: string;
  actorId: string;
  actorRole: string;
  entityType?: string;
  entityId?: string;
  bookingId?: string;
  resourceId?: string;
  fromState?: string;
  toState?: string;
  metadata: Record<string, any>;
  previousHash: string;
  hash: string;
  currentHash?: string;
  payloadHash?: string;
}

export interface IChainVerificationResult {
  verified: boolean;
  totalRecordsVerified: number;
  lastBlockHash?: string;
  tamperedSequence?: number;
  expectedHash?: string;
  foundHash?: string;
  verificationTimeMs?: number;
}

export interface IUtilizationAnalytics {
  resourceId: string;
  totalBookings: number;
  completedHours: number;
  utilizationRatePercentage: number;
  maintenanceDowntimeHours: number;
  incidentCount: number;
}

export type WaitlistStatus =
  | 'QUEUED'
  | 'OFFERED'
  | 'ACCEPTED'
  | 'EXPIRED'
  | 'CANCELLED';

export interface IWaitlistEntry {
  _id: string;
  resourceId: string | IResource;
  userId: string | IUser;
  bookingId: string | IBooking;
  requestedStart: string | Date;
  requestedEnd: string | Date;
  priorityScore: number;
  status: WaitlistStatus;
  offerExpiresAt?: string | Date;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface INotification {
  id: string;
  type: string;
  title: string;
  message: string;
  timestamp: string | Date;
  read: boolean;
  severity?: 'info' | 'success' | 'warning' | 'error';
  data?: Record<string, any>;
}

export interface ISocketHandshakeUser {
  id: string;
  email: string;
  role: UserRole;
  department: string;
  name?: string;
}

export interface IPagination {
  total: number;
  page: number;
  pages: number;
  limit?: number;
}

export interface IApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  pagination?: IPagination;
  [key: string]: any;
}

export interface IProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  code?: string;
  errors?: Array<{ field: string; message: string }>;
  timestamp?: string;
}
