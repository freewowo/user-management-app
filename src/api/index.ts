const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:3000/api'
  : `http://${window.location.hostname}:3000/api`;

// 将snake_case转换为camelCase
const snakeToCamel = (str: string) => {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
};

// 转换对象的所有key
const convertKeysToCamel = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(item => convertKeysToCamel(item));
  }
  if (obj !== null && typeof obj === 'object' && !(obj instanceof Date)) {
    return Object.keys(obj).reduce((acc: any, key) => {
      acc[snakeToCamel(key)] = convertKeysToCamel(obj[key]);
      return acc;
    }, {});
  }
  return obj;
};

const request = async (url: string, options?: RequestInit) => {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });
  const data = await response.json();
  if (!data.success) {
    throw new Error(data.message || '请求失败');
  }
  return convertKeysToCamel(data.data);
};

// 用户API
export const userApi = {
  getList: (params?: { keyword?: string; source?: string }) => {
    const query = new URLSearchParams();
    if (params?.keyword) query.append('keyword', params.keyword);
    if (params?.source) query.append('source', params.source);
    const qs = query.toString();
    return request(`/users${qs ? '?' + qs : ''}`);
  },

  getById: (id: number) => request(`/users/${id}`),

  create: (data: any) =>
    request('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: number, data: any) =>
    request(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    request(`/users/${id}`, {
      method: 'DELETE',
    }),
};

// 订单API
export const orderApi = {
  getList: (params?: any) => {
    const query = new URLSearchParams();
    if (params?.keyword) query.append('keyword', params.keyword);
    if (params?.phone) query.append('phone', params.phone);
    if (params?.orderNo) query.append('orderNo', params.orderNo);
    if (params?.status) query.append('status', params.status);
    if (params?.startDate) query.append('startDate', params.startDate);
    if (params?.endDate) query.append('endDate', params.endDate);
    if (params?.minAmount !== undefined) query.append('minAmount', String(params.minAmount));
    if (params?.maxAmount !== undefined) query.append('maxAmount', String(params.maxAmount));
    const qs = query.toString();
    return request(`/orders${qs ? '?' + qs : ''}`);
  },

  getById: (id: number) => request(`/orders/${id}`),

  create: (data: any) =>
    request('/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: number, data: any) =>
    request(`/orders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    request(`/orders/${id}`, {
      method: 'DELETE',
    }),

  batchImport: (orders: any[]) =>
    request('/orders/batch', {
      method: 'POST',
      body: JSON.stringify({ orders }),
    }),
};

// 设置API
export const settingApi = {
  get: () => request('/settings'),

  update: (data: any) =>
    request('/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

// 字段配置API
export const fieldApi = {
  getList: (targetType?: string) => {
    const query = targetType ? `?targetType=${targetType}` : '';
    return request(`/fields${query}`);
  },

  create: (data: any) =>
    request('/fields', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: number, data: any) =>
    request(`/fields/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    request(`/fields/${id}`, {
      method: 'DELETE',
    }),

  updateSort: (items: { id: number; sortOrder: number }[]) =>
    request('/fields/sort', {
      method: 'POST',
      body: JSON.stringify({ items }),
    }),
};

// 系统管理API
export const systemApi = {
  getSettings: () => request('/system/settings'),

  updateSettings: (data: any) =>
    request('/system/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  getStats: () => request('/system/stats'),

  backup: () =>
    request('/system/backup', {
      method: 'POST',
    }),

  getBackups: () => request('/system/backups'),

  restore: (filename: string) =>
    request('/system/restore', {
      method: 'POST',
      body: JSON.stringify({ filename }),
    }),

  deleteBackup: (filename: string) =>
    request(`/system/backups/${filename}`, {
      method: 'DELETE',
    }),
};

// 认证API
export const authApi = {
  getCaptcha: () => request('/auth/captcha'),

  login: (data: { username: string; password: string; captchaId: string; captchaAnswer: number }) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  changePassword: (data: { username: string; oldPassword: string; newPassword: string }) =>
    request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// 日志API
export const logApi = {
  getList: (params?: any) => {
    const query = new URLSearchParams();
    if (params?.username) query.append('username', params.username);
    if (params?.module) query.append('module', params.module);
    if (params?.action) query.append('action', params.action);
    if (params?.startDate) query.append('startDate', params.startDate);
    if (params?.endDate) query.append('endDate', params.endDate);
    if (params?.keyword) query.append('keyword', params.keyword);
    if (params?.page) query.append('page', String(params.page));
    if (params?.pageSize) query.append('pageSize', String(params.pageSize));
    const qs = query.toString();
    return request(`/logs${qs ? '?' + qs : ''}`);
  },

  getStats: () => request('/logs/stats'),

  clear: (beforeDate?: string) => {
    const query = beforeDate ? `?beforeDate=${beforeDate}` : '';
    return request(`/logs/clear${query}`, {
      method: 'DELETE',
    });
  },
};
