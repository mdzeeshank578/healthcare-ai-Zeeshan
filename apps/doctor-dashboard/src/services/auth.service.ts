import { User } from '../types';
import { api } from './api';
import { authStorage } from './auth.storage';

type ApiRole = 'DOCTOR' | 'PHC_ADMIN';

interface ApiUser {
  id: string;
  email: string;
  role: ApiRole;
  status: string;
  isEmailVerified: boolean;
  name?: string;
  fullName?: string;
}

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

interface LoginData {
  user: ApiUser;
  accessToken: string;
  refreshToken: string;
}

const toDashboardUser = (user: ApiUser, resolvedName?: string): User => {
  if (user.role !== 'DOCTOR' && user.role !== 'PHC_ADMIN') {
    throw new Error('This account is not permitted to access the doctor dashboard.');
  }
  const defaultTitle = user.role === 'DOCTOR' ? 'Doctor' : 'PHC Administrator';
  const name = resolvedName || user.fullName || user.name || defaultTitle;
  return {
    id: user.id,
    email: user.email,
    name,
    role: user.role === 'DOCTOR' ? 'doctor' : 'admin',
  };
};

export const authService = {
  async requestOtp(email: string): Promise<string> {
    const response = await api.post<ApiEnvelope<null>>('/auth/request-otp', { email });
    return response.data.message;
  },

  async verifyOtp(email: string, otp: string): Promise<User> {
    const deviceId = this.getDeviceId();
    const response = await api.post<ApiEnvelope<LoginData>>('/auth/verify-otp', {
      email,
      otp,
      platform: 'DOCTOR_DASHBOARD',
      deviceId,
    });
    const { user: apiUser, accessToken, refreshToken } = response.data.data;
    authStorage.setTokens(accessToken, refreshToken);

    let resolvedName = apiUser.fullName || apiUser.name;
    if (!resolvedName && apiUser.role === 'DOCTOR') {
      try {
        const docRes = await api.get<ApiEnvelope<{ fullName?: string }>>('/doctors/me');
        if (docRes.data.data?.fullName) {
          resolvedName = docRes.data.data.fullName;
        }
      } catch {
        // fallback
      }
    }

    const user = toDashboardUser(apiUser, resolvedName);
    authStorage.setSession(accessToken, refreshToken, user);
    return user;
  },

  getCurrentUser(): User | null {
    const raw = authStorage.getUser();
    try {
      return raw ? (JSON.parse(raw) as User) : null;
    } catch {
      authStorage.clear();
      return null;
    }
  },

  async validateSession(): Promise<User | null> {
    if (!authStorage.getAccessToken() || !authStorage.getRefreshToken()) return null;
    const response = await api.get<ApiEnvelope<ApiUser>>('/auth/me');
    const apiUser = response.data.data;

    let resolvedName = apiUser.fullName || apiUser.name;
    if (!resolvedName && apiUser.role === 'DOCTOR') {
      try {
        const docRes = await api.get<ApiEnvelope<{ fullName?: string }>>('/doctors/me');
        if (docRes.data.data?.fullName) {
          resolvedName = docRes.data.data.fullName;
        }
      } catch {
        // fallback
      }
    }

    // Preserve existing non-generic name if present
    const existing = this.getCurrentUser();
    if (!resolvedName && existing?.name && existing.name !== 'Doctor') {
      resolvedName = existing.name;
    }

    const user = toDashboardUser(apiUser, resolvedName);
    const accessToken = authStorage.getAccessToken();
    const refreshToken = authStorage.getRefreshToken();
    if (accessToken && refreshToken) authStorage.setSession(accessToken, refreshToken, user);
    return user;
  },

  async logout(): Promise<void> {
    const refreshToken = authStorage.getRefreshToken();
    authStorage.clear();
    if (!refreshToken) return;
    try {
      await api.post('/auth/logout', { refreshToken });
    } catch {
      // The local session is already cleared; a revoked/expired token needs no further action.
    }
  },

  getDeviceId(): string {
    const key = 'healthai_device_id';
    let deviceId = localStorage.getItem(key);
    if (!deviceId) {
      if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        deviceId = crypto.randomUUID();
      } else {
        deviceId = 'dev_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 15);
      }
      localStorage.setItem(key, deviceId);
    }
    return deviceId;
  }
};
