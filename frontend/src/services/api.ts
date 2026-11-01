import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import {
  IUser,
  IResource,
  IBooking,
  IInspection,
  IIncident,
  IAuditLog,
  IChainVerificationResult,
  IEligibilityResult,
  IWaitlistEntry,
  IProblemDetails,
  IApiResponse,
  UserRole,
} from '../types';

const metaEnv = typeof import.meta !== 'undefined' ? (import.meta as any).env : undefined;

export const API_BASE_URL: string =
  metaEnv?.VITE_API_URL ||
  (typeof window !== 'undefined' && window.location.origin
    ? `${window.location.origin}/api/v1`
    : 'http://localhost:5000/api/v1');

export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<IProblemDetails | any>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.data) {
      const data = error.response.data;
      const detailMsg =
        data.detail ||
        (Array.isArray(data.errors) && data.errors.length > 0
          ? data.errors.map((e: any) => `${e.field}: ${e.message}`).join(', ')
          : null) ||
        data.message ||
        data.title;

      if (detailMsg) {
        error.message = detailMsg;
      }
    }

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/refresh-token')
    ) {
      const storedRefreshToken = localStorage.getItem('refreshToken');

      if (!storedRefreshToken) {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        window.dispatchEvent(new CustomEvent('auth:logout'));
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((newToken) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
            }
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshResponse = await axios.post(
          `${API_BASE_URL}/auth/refresh-token`,
          { refreshToken: storedRefreshToken },
          { withCredentials: true }
        );

        const newAccessToken =
          refreshResponse.data?.accessToken || refreshResponse.data?.data?.accessToken;
        const newRefreshToken =
          refreshResponse.data?.refreshToken || refreshResponse.data?.data?.refreshToken;

        if (newAccessToken) {
          localStorage.setItem('token', newAccessToken);
          if (newRefreshToken) {
            localStorage.setItem('refreshToken', newRefreshToken);
          }

          api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
          processQueue(null, newAccessToken);

          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          }
          return api(originalRequest);
        } else {
          throw new Error('Missing token in refresh response');
        }
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        window.dispatchEvent(new CustomEvent('auth:logout'));
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);


export const authApi = {
  login: async (credentials: { email: string; password: string }) => {
    const res = await api.post('/auth/login', credentials);
    return res.data;
  },
  register: async (userData: any) => {
    const res = await api.post('/auth/register', userData);
    return res.data;
  },
  logout: async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    try {
      await api.post('/auth/logout', { refreshToken });
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      window.dispatchEvent(new CustomEvent('auth:logout'));
    }
  },
  getMe: async (): Promise<{ success: boolean; user: IUser }> => {
    const res = await api.get('/auth/me');
    return res.data;
  },
  getDemoTokens: async (): Promise<{
    success: boolean;
    personas: Record<UserRole, { user: IUser; accessToken: string; refreshToken: string }>;
    tokens: Record<UserRole, { accessToken: string; refreshToken: string }>;
  }> => {
    const res = await api.get('/auth/demo-tokens');
    return res.data;
  },
};

export const resourcesApi = {
  getAll: async (params?: {
    category?: string;
    department?: string;
    search?: string;
    status?: string;
    eligibleOnly?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{ data: IResource[]; pagination: any }> => {
    const res = await api.get('/resources', { params });
    return res.data;
  },
  getById: async (id: string): Promise<{ data: IResource }> => {
    const res = await api.get(`/resources/${id}`);
    return res.data;
  },
  create: async (data: Partial<IResource>): Promise<{ data: IResource }> => {
    const res = await api.post('/resources', data);
    return res.data;
  },
  update: async (id: string, data: Partial<IResource>): Promise<{ data: IResource }> => {
    const res = await api.put(`/resources/${id}`, data);
    return res.data;
  },
  checkEligibility: async (
    id: string,
    params?: { startTime?: string; endTime?: string }
  ): Promise<IEligibilityResult> => {
    const res = await api.get(`/resources/${id}/eligibility`, { params });
    return res.data;
  },
  scheduleMaintenance: async (
    id: string,
    windowData: { title: string; startTime: string | Date; endTime: string | Date; blocksBookings?: boolean }
  ) => {
    const res = await api.post(`/resources/${id}/maintenance`, windowData);
    return res.data;
  },
};

export const bookingsApi = {
  create: async (
    bookingData: {
      resourceId: string;
      startTime: string | Date;
      endTime: string | Date;
      projectGrantCode?: string;
      supervisorEmail?: string;
      supervisorEndorsed?: boolean;
      safetyAcknowledgement: boolean;
      intendedPurpose: string;
      allowWaitlist?: boolean;
    },
    idempotencyKey?: string
  ): Promise<{ data: IBooking; conflict?: boolean; waitlistAvailable?: boolean }> => {
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers['X-Idempotency-Key'] = idempotencyKey;
    }
    const res = await api.post('/bookings', bookingData, { headers });
    return res.data;
  },
  getAll: async (params?: {
    status?: string;
    resourceId?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: IBooking[]; pagination: any }> => {
    const res = await api.get('/bookings', { params });
    return res.data;
  },
  getById: async (id: string): Promise<{ data: IBooking }> => {
    const res = await api.get(`/bookings/${id}`);
    return res.data;
  },
  cancel: async (id: string, cancellationReason: string): Promise<{ data: IBooking }> => {
    const res = await api.patch(`/bookings/${id}/cancel`, { cancellationReason });
    return res.data;
  },
  getReviewQueue: async (): Promise<{ data: IBooking[] }> => {
    const res = await api.get('/bookings/review-queue');
    return res.data;
  },
  approve: async (id: string, approvalNotes?: string): Promise<{ data: IBooking }> => {
    const res = await api.post(`/bookings/${id}/approve`, { approvalNotes });
    return res.data;
  },
  reject: async (
    id: string,
    reasonCode: string,
    rejectionMessage: string
  ): Promise<{ data: IBooking }> => {
    const res = await api.post(`/bookings/${id}/reject`, { reasonCode, rejectionMessage });
    return res.data;
  },
  delegate: async (
    id: string,
    delegateUserId: string,
    note?: string
  ): Promise<{ data: IBooking }> => {
    const res = await api.post(`/bookings/${id}/delegate`, { delegateUserId, note });
    return res.data;
  },
  acceptWaitlistOffer: async (id: string): Promise<{ data: IBooking }> => {
    const res = await api.post(`/bookings/${id}/accept-waitlist-offer`);
    return res.data;
  },
};

export const inspectionsApi = {
  checkIn: async (payload: {
    bookingId: string;
    checklistResponses: Array<{ itemId: string; verified: boolean; note?: string }>;
    initialConditionRating: string;
    preExistingDamageNotes?: string;
    meterReadings: Record<string, number>;
    photoUploads?: Array<{ photoUrl: string; sha256Hash: string; caption?: string }>;
  }): Promise<{ status: string; accessPin: string; sessionStartTime: string }> => {
    const res = await api.post('/inspections/check-in', payload);
    return res.data;
  },
  returnResource: async (payload: {
    bookingId: string;
    checklistResponses: Array<{ itemId: string; verified: boolean; note?: string }>;
    finalConditionRating: string;
    returnNotes?: string;
    finalMeterReadings: Record<string, number>;
    photoUploads?: Array<{ photoUrl: string; sha256Hash: string; caption?: string }>;
    signOffConfirmed: boolean;
  }): Promise<{
    status: string;
    conditionDiff: any;
    meterDelta: Record<string, number>;
    bookingStatus: string;
  }> => {
    const res = await api.post('/inspections/return', payload);
    return res.data;
  },
  getByBookingId: async (
    bookingId: string
  ): Promise<{
    initialInspection?: IInspection;
    finalInspection?: IInspection;
    diff?: any;
  }> => {
    const res = await api.get(`/inspections/booking/${bookingId}`);
    return res.data;
  },
};

export const incidentsApi = {
  create: async (data: {
    bookingId: string;
    category: string;
    severity: string;
    description: string;
    evidencePhotos?: Array<{ photoUrl: string; sha256Hash: string }>;
  }): Promise<{ data: IIncident }> => {
    const res = await api.post('/incidents', data);
    return res.data;
  },
  dispute: async (id: string, disputeStatement: string): Promise<{ data: IIncident }> => {
    const res = await api.post(`/incidents/${id}/dispute`, { disputeStatement });
    return res.data;
  },
  adjudicate: async (
    id: string,
    adjudicationData: {
      decision: string;
      penaltyPointsAssigned: number;
      billingChargeAmount?: number;
      grantCodeCharged?: string;
      actionItemsRequired: string[];
      findingsSummary: string;
    }
  ): Promise<{ data: IIncident }> => {
    const res = await api.post(`/incidents/${id}/adjudicate`, adjudicationData);
    return res.data;
  },
  getAll: async (params?: {
    status?: string;
    severity?: string;
    bookingId?: string;
  }): Promise<{ data: IIncident[] }> => {
    const res = await api.get('/incidents', { params });
    return res.data;
  },
};

export const waitlistApi = {
  getByResource: async (
    resourceId: string
  ): Promise<{ totalWaitlisted: number; myPosition: number | null; fairnessScore: number }> => {
    const res = await api.get(`/waitlist/resource/${resourceId}`);
    return res.data;
  },
  getMyWaitlists: async (): Promise<{ data: IWaitlistEntry[] }> => {
    const res = await api.get('/waitlist/my-waitlists');
    return res.data;
  },
  leaveWaitlist: async (id: string): Promise<{ success: boolean }> => {
    const res = await api.delete(`/waitlist/${id}`);
    return res.data;
  },
};

export const auditApi = {
  getLedger: async (params?: {
    entityType?: string;
    entityId?: string;
    page?: number;
    limit?: number;
  }): Promise<{ events: IAuditLog[]; pagination: any }> => {
    const res = await api.get('/audit/ledger', { params });
    return res.data;
  },
  verifyChain: async (): Promise<IChainVerificationResult> => {
    const res = await api.get('/audit/verify-chain');
    return res.data;
  },
  getUtilizationAnalytics: async (): Promise<{ data: any }> => {
    const res = await api.get('/audit/analytics/utilization');
    return res.data;
  },
  getChargebacks: async (): Promise<{ data: any }> => {
    const res = await api.get('/audit/analytics/chargebacks');
    return res.data;
  },
};

export default api;
