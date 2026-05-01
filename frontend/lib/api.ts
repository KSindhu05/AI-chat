/**
 * API Helper Library
 * 
 * Axios instance with JWT auth interceptor.
 * All API calls to the Express backend go through here.
 */

import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Handle 401 errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

// ===== Auth API =====

export const authApi = {
  register: (data: { email: string; password: string; name?: string }) =>
    api.post('/auth/register', data),

  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),

  getMe: () => api.get('/auth/me'),
};

// ===== Chat API =====

export const chatApi = {
  createChat: (mode: string = 'general', modelId: string = 'llama-3.1-8b-instant', customPrompt?: string) =>
    api.post('/chat', { mode, modelId, customPrompt }),

  getChats: () =>
    api.get('/chats'),

  getChatById: (id: string) =>
    api.get(`/chat/${id}`),

  deleteChat: (id: string) =>
    api.delete(`/chat/${id}`),

  renameChat: (id: string, title: string) =>
    api.patch(`/chat/${id}`, { title }),

  /**
   * Send a message and stream the AI response via SSE.
   * Returns an EventSource-like reader for processing tokens.
   */
  sendMessage: async (
    chatId: string,
    content: string,
    image: string | undefined,
    webSearch: boolean,
    onToken: (token: string) => void,
    onDone: (data: { messageId: string; suggestions: string[] }) => void,
    onError: (error: string) => void
  ) => {
    const token = localStorage.getItem('token');

    try {
      const response = await fetch(`${API_BASE}/chat/${chatId}/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content, image, webSearch }),
      });

      if (!response.ok) {
        const err = await response.json();
        onError(err.error || 'Failed to send message');
        return;
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        onError('Stream not available');
        return;
      }

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Parse SSE data lines
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.token) {
                onToken(data.token);
              }
              if (data.done) {
                onDone({
                  messageId: data.messageId,
                  suggestions: data.suggestions || [],
                });
              }
              if (data.error) {
                onError(data.error);
              }
            } catch {
              // Skip malformed JSON
            }
          }
        }
      }
    } catch (err) {
      onError('Network error. Please check your connection.');
    }
  },

  // Upload PDF for text extraction
  uploadPdf: async (file: File) => {
    const formData = new FormData();
    formData.append('pdf', file);
    
    // We don't use the standard `api` instance here because we need multipart/form-data
    // but the interceptor is still nice for auth, so let's just override the header
    const response = await api.post('/upload-pdf', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

export default api;
