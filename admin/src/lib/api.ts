import axios, { type InternalAxiosRequestConfig } from "axios";
import { toast } from "sonner";

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1",
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

let isRefreshing = false;
let failedQueue: { resolve: (v: unknown) => void; reject: (e: unknown) => void }[] = [];

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  failedQueue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post(
          `${api.defaults.baseURL}/auth/refresh`,
          {},
          { withCredentials: true }
        );
        setAccessToken(data.access_token);
        processQueue(null, data.access_token);
        originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        setAccessToken(null);
        if (typeof document !== "undefined") {
          document.cookie = "admin_auth=; path=/; max-age=0";
        }
        if (typeof window !== "undefined") {
          window.location.href = "/admin/login";
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    const status = error.response?.status;
    const errorCode = error.response?.data?.error?.code;
    const serverMessage = error.response?.data?.error?.message;

    if (status === 401) {
      return Promise.reject(error);
    }

    if (errorCode === "REJECTION_COMMENT_REQUIRED") {
      return Promise.reject(error);
    }

    if (status === 403 && errorCode === "ACCOUNT_DEACTIVATED") {
      toast.error("Аккаунт деактивирован. Обратитесь к администратору.");
      setAccessToken(null);
      if (typeof document !== "undefined") {
        document.cookie = "admin_auth=; path=/; max-age=0";
      }
      if (typeof window !== "undefined") {
        window.location.href = "/admin/login";
      }
    } else if (status === 403) {
      toast.error(serverMessage || "Нет доступа");
    } else if (status === 404) {
      toast.error(serverMessage || "Ресурс не найден");
    } else if (status === 409) {
      toast.error(serverMessage || "Конфликт данных");
    } else if (status === 422) {
      toast.error(serverMessage || "Ошибка валидации");
    } else if (status === 429) {
      toast.error("Слишком много запросов. Подождите немного.");
    } else if (status && status >= 500) {
      toast.error("Внутренняя ошибка сервера. Попробуйте позже.");
    } else if (status) {
      toast.error(serverMessage || "Ошибка запроса");
    } else {
      toast.error("Ошибка соединения. Проверьте подключение к интернету.");
    }

    return Promise.reject(error);
  }
);

export default api;
