/**
 * API Client
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// 토큰 저장/조회
export const getToken = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
};

export const setToken = (token: string) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('token', token);
};

export const removeToken = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('token');
};

// API 요청 헬퍼
async function fetchAPI(endpoint: string, options: RequestInit = {}) {
  const token = getToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'API 오류가 발생했습니다');
  }

  return data;
}

// Auth API
export const auth = {
  register: async (email: string, password: string, name?: string) => {
    const data = await fetchAPI('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
    if (data.token) {
      setToken(data.token);
    }
    return data;
  },

  login: async (email: string, password: string) => {
    const data = await fetchAPI('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (data.token) {
      setToken(data.token);
    }
    return data;
  },

  logout: () => {
    removeToken();
  },

  me: async () => {
    return await fetchAPI('/api/auth/me');
  },
};

// Projects API
export const projects = {
  list: async () => {
    return await fetchAPI('/api/projects');
  },

  create: async (title: string, idea: string, model?: string) => {
    return await fetchAPI('/api/projects', {
      method: 'POST',
      body: JSON.stringify({ title, idea, model }),
    });
  },

  get: async (id: string) => {
    return await fetchAPI(`/api/projects/${id}`);
  },

  delete: async (id: string) => {
    return await fetchAPI(`/api/projects/${id}`, {
      method: 'DELETE',
    });
  },
};

// Generate API
export const generate = {
  start: async (projectId: string) => {
    return await fetchAPI(`/api/generate/projects/${projectId}/generate`, {
      method: 'POST',
    });
  },

  getHtml: async (documentId: string) => {
    const token = getToken();
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(
      `${API_BASE_URL}/api/generate/documents/${documentId}/html`,
      { headers }
    );

    if (!response.ok) {
      throw new Error('문서를 불러올 수 없습니다');
    }

    return await response.text();
  },

  download: async (documentId: string) => {
    const token = getToken();
    const url = `${API_BASE_URL}/api/generate/documents/${documentId}/download`;
    
    const a = document.createElement('a');
    a.href = url;
    if (token) {
      a.href += `?token=${token}`;
    }
    a.download = 'document.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  },
};
