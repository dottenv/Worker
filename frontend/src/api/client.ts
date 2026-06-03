import { cacheGet, cacheSet, cacheClear } from './cache';

const BASE_URL = '/api';

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const key = `GET ${endpoint}`;
  const isGet = !options.method || options.method === 'GET';

  if (isGet) {
    const cached = cacheGet(key);
    if (cached) return cached as T;
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Network error' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  const data = await res.json();
  if (isGet) cacheSet(key, data);
  return data as T;
}

function invalidate(...patterns: string[]) {
  patterns.forEach((p) => cacheClear(p));
}

export function formatLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export const api = {
  get: <T = any>(endpoint: string) => request<T>(endpoint),
  del: <T = any>(endpoint: string) => request<T>(endpoint, { method: 'DELETE' }),
  post: <T = any>(endpoint: string, body?: any) =>
    request<T>(endpoint, { method: 'POST', ...(body ? { body: JSON.stringify(body) } : {}) }),
  put: <T = any>(endpoint: string, body?: any) =>
    request<T>(endpoint, { method: 'PUT', ...(body ? { body: JSON.stringify(body) } : {}) }),
  invalidate: invalidate,
  auth: {
    register: (data: { email: string; password: string; full_name: string }) =>
      request<{ token: string; user: any }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    login: (data: { email: string; password: string }) =>
      request<{ token: string; user: any }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    me: () => request<any>('/auth/me'),
    role: () => request<{ is_owner: boolean; is_admin: boolean }>('/auth/role'),
    navConfig: {
      get: () => request<{ pinned: string[] }>('/auth/nav-config'),
      update: (pinned: string[]) =>
        request<{ pinned: string[] }>('/auth/nav-config', {
          method: 'PUT',
          body: JSON.stringify({ pinned }),
        }),
    },
  },
  serviceCenters: {
    list: () => request<any[]>('/service-centers'),
    other: () => request<any[]>('/service-centers/other'),
    get: (id: number) => request<any>(`/service-centers/${id}`),
    create: (data: { name: string; description?: string }) =>
      request<any>('/service-centers', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: number, data: { name?: string; description?: string; address?: string; phone?: string }) =>
      request<any>(`/service-centers/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: number) =>
      request<any>(`/service-centers/${id}`, { method: 'DELETE' }),
  },
  members: {
    list: (scId: number) => request<any[]>(`/service-centers/${scId}/members`),
    add: (scId: number, data: { email: string; role?: string; hourly_rate?: number }) =>
      request<any>(`/service-centers/${scId}/members`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (scId: number, memberId: number, data: any) =>
      request<any>(`/service-centers/${scId}/members/${memberId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    get: (scId: number, memberId: number) =>
      request<any>(`/service-centers/${scId}/members/${memberId}`),
    updateSettings: (scId: number, memberId: number, data: any) =>
      request<any>(`/service-centers/${scId}/members/${memberId}/settings`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    remove: (scId: number, memberId: number) =>
      request<any>(`/service-centers/${scId}/members/${memberId}`, {
        method: 'DELETE',
      }),
  },
  shifts: {
    list: (scId: number) => request<any[]>(`/service-centers/${scId}/shifts`),
    create: (scId: number, data: any) =>
      request<any>(`/service-centers/${scId}/shifts`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (scId: number, shiftId: number, data: any) =>
      request<any>(`/service-centers/${scId}/shifts/${shiftId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (scId: number, shiftId: number) =>
      request<any>(`/service-centers/${scId}/shifts/${shiftId}`, {
        method: 'DELETE',
      }),
  },
  swaps: {
    list: () => request<any[]>('/swaps'),
    admin: () => request<any[]>('/swaps/admin'),
    get: (id: number) => request<any>(`/swaps/${id}`),
    create: (data: {
      service_center_id: number; source_entry_id?: number; source_date: string;
      source_user_id: number; target_entry_id?: number; target_user_id?: number;
      target_center_id?: number; target_date?: string; swap_type: 'swap' | 'give' | 'force' | 'substitution'; notes?: string;
    }) =>
      request<any>('/swaps', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    accept: (id: number) =>
      request<any>(`/swaps/${id}/accept`, { method: 'PUT' }),
    reject: (id: number) =>
      request<any>(`/swaps/${id}/reject`, { method: 'PUT' }),
    cancel: (id: number) =>
      request<any>(`/swaps/${id}/cancel`, { method: 'PUT' }),
    force: (id: number) =>
      request<any>(`/swaps/${id}/force`, { method: 'PUT' }),
  },
  push: {
    subscribe: (data: { endpoint: string; keys: { p256dh: string; auth: string } }) =>
      request<any>('/push/subscribe', { method: 'POST', body: JSON.stringify(data) }),
    unsubscribe: (endpoint: string) =>
      request<any>('/push/unsubscribe', { method: 'DELETE', body: JSON.stringify({ endpoint }) }),
  },
  schedule: {
    get: (scId: number, weekOffset: number) =>
      request<any>(`/schedule?service_center_id=${scId}&week_offset=${weekOffset}`),
    availableDates: (userId: number, from: string, to: string) =>
      request<string[]>(`/schedule/available-dates?user_id=${userId}&from=${from}&to=${to}`),
    admin: (params?: { from?: string; to?: string; service_center_id?: number }) => {
      const q = new URLSearchParams();
      if (params?.from) q.set('from', params.from);
      if (params?.to) q.set('to', params.to);
      if (params?.service_center_id) q.set('service_center_id', String(params.service_center_id));
      const s = q.toString();
      return request<any[]>(`/schedule/admin${s ? '?' + s : ''}`);
    },
    create: (data: {
      user_id: number; service_center_id: number; date: string;
      type: 'full_day' | 'hourly'; start_time?: string; end_time?: string;
      hourly_rate?: number; notes?: string; shift_id?: number;
    }) =>
      request<any>('/schedule', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (entryId: number, data: any) =>
      request<any>(`/schedule/${entryId}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (entryId: number) =>
      request<any>(`/schedule/${entryId}`, { method: 'DELETE' }),
    my: (params?: { service_center_id?: number; from?: string; to?: string }) => {
      const q = new URLSearchParams();
      if (params?.service_center_id) q.set('service_center_id', String(params.service_center_id));
      if (params?.from) q.set('from', params.from);
      if (params?.to) q.set('to', params.to);
      return request<any[]>(`/schedule/my${q.toString() ? '?' + q.toString() : ''}`);
    },
    history: () => request<{ swaps: any[]; entries: any[] }>('/schedule/history'),
    copy: (data: {
      source_from: string; source_to: string;
      target_from: string; target_to: string;
      service_center_id: number;
    }) =>
      request<{ created: number; updated: number }>('/schedule/copy', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    myGrouped: (scId: number, params?: { from?: string; to?: string }) => {
      const q = new URLSearchParams({ service_center_id: String(scId) });
      if (params?.from) q.set('from', params.from);
      if (params?.to) q.set('to', params.to);
      return request<Record<string, any[]>>(`/schedule/my/grouped?${q.toString()}`);
    },
  },
  finance: {
    list: (params?: { type?: string; from?: string; to?: string }) => {
      const q = new URLSearchParams();
      if (params?.type) q.set('type', params.type);
      if (params?.from) q.set('from', params.from);
      if (params?.to) q.set('to', params.to);
      const s = q.toString();
      return request<any>(`/finance${s ? '?' + s : ''}`);
    },
    admin: (params?: { user_id?: number; type?: string; from?: string; to?: string }) => {
      const q = new URLSearchParams();
      if (params?.user_id) q.set('user_id', String(params.user_id));
      if (params?.type) q.set('type', params.type);
      if (params?.from) q.set('from', params.from);
      if (params?.to) q.set('to', params.to);
      return request<any>(`/finance/admin${q.toString() ? '?' + q.toString() : ''}`);
    },
    employees: () => request<any[]>('/finance/employees'),
    create: (data: { user_id: number; type: string; amount: number; description?: string; operation_date: string }) =>
      request<any>('/finance', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: any) =>
      request<any>(`/finance/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) =>
      request<any>(`/finance/${id}`, { method: 'DELETE' }),
    toggle: (enabled: boolean) =>
      request<{ finance_enabled: boolean }>('/finance/toggle', { method: 'PUT', body: JSON.stringify({ enabled }) }),
  },
  timeEntries: {
    create: (service_center_id: number, data: { clock_in: string; clock_out?: string; break_minutes?: number; notes?: string }) =>
      request<any>('/time-entries', { method: 'POST', body: JSON.stringify({ service_center_id, ...data }) }),
    clockIn: (service_center_id: number, notes?: string) =>
      request<any>('/time-entries/clock-in', { method: 'POST', body: JSON.stringify({ service_center_id, notes }) }),
    clockOut: (data?: { service_center_id?: number; break_minutes?: number; notes?: string }) =>
      request<any>('/time-entries/clock-out', { method: 'POST', body: JSON.stringify(data || {}) }),
    active: () => request<any>('/time-entries/active'),
    my: () => request<any[]>('/time-entries/my'),
    pending: (sc_id?: number) =>
      request<any[]>(`/time-entries/pending${sc_id ? `?service_center_id=${sc_id}` : ''}`),
    approve: (id: number, data?: { type?: string; start_time?: string; end_time?: string; hourly_rate?: number; shift_id?: number }) =>
      request<any>(`/time-entries/${id}/approve`, { method: 'PUT', body: JSON.stringify(data || {}) }),
    reject: (id: number) =>
      request<any>(`/time-entries/${id}/reject`, { method: 'PUT' }),
    center: (sc_id: number, params?: { from?: string; to?: string }) => {
      const q = new URLSearchParams();
      if (params?.from) q.set('from', params.from);
      if (params?.to) q.set('to', params.to);
      const s = q.toString();
      return request<any[]>(`/time-entries/center/${sc_id}${s ? '?' + s : ''}`);
    },
    update: (entryId: number, data: any) =>
      request<any>(`/time-entries/${entryId}`, { method: 'PUT', body: JSON.stringify(data) }),
    withDocuments: () => request<any[]>(`/time-entries/with-documents`),
    delete: (entryId: number) =>
      request<any>(`/time-entries/${entryId}`, { method: 'DELETE' }),
  },
  customFields: {
    list: (scId: number) => request<any[]>(`/service-centers/${scId}/custom-fields`),
    create: (scId: number, data: any) =>
      request<any>(`/service-centers/${scId}/custom-fields`, { method: 'POST', body: JSON.stringify(data) }),
    update: (scId: number, fieldId: number, data: any) =>
      request<any>(`/service-centers/${scId}/custom-fields/${fieldId}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (scId: number, fieldId: number) =>
      request<any>(`/service-centers/${scId}/custom-fields/${fieldId}`, { method: 'DELETE' }),
    getValues: (scId: number, entryId: number) =>
      request<any[]>(`/service-centers/${scId}/custom-fields/values/${entryId}`),
    updateValues: (scId: number, entryId: number, values: { custom_field_id: number; value: string }[]) =>
      request<any[]>(`/service-centers/${scId}/custom-fields/values/${entryId}`, {
        method: 'PUT', body: JSON.stringify({ values }),
      }),
    carryOver: (scId: number, excludeEntryId?: number) =>
      request<Record<number, string>>(`/service-centers/${scId}/custom-fields/carry-over${excludeEntryId ? `?exclude_entry_id=${excludeEntryId}` : ''}`),
  },
  shiftDocuments: {
    list: (entryId: number) => request<any[]>(`/shift-documents/by-entry/${entryId}`),
    upload: (entryId: number, file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('time_entry_id', String(entryId));
      const token = localStorage.getItem('token');
      return fetch('/api/shift-documents/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      }).then(async res => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'Upload failed' }));
          throw new Error(err.error || 'Upload failed');
        }
        return res.json();
      });
    },
    delete: (docId: number) =>
      request<any>(`/shift-documents/${docId}`, { method: 'DELETE' }),
  },
};
