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

    const isRefreshRequest = originalRequest.url?.includes("/auth/refresh");

    if (error.response?.status === 401 && !originalRequest._retry && !isRefreshRequest) {
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
        if (typeof window !== "undefined" && !window.location.pathname.startsWith("/admin/login")) {
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

/**
 * Sends multipart/form-data with a JSON body part that has Content-Type: application/json
 * but NO filename — required for FastAPI endpoints that declare `body: Model = Body(media_type="application/json")`.
 * Standard FormData always adds filename="blob" to Blob parts, which causes FastAPI to treat it as UploadFile.
 */
export async function postMultipartJsonBody(
  method: "POST" | "PATCH",
  url: string,
  jsonBody: Record<string, unknown>,
  files?: Record<string, File | null>,
): Promise<{ data: Record<string, unknown> }> {
  const baseURL =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
  const fullUrl = `${baseURL}${url}`;
  const boundary =
    "----FormBoundary" + Math.random().toString(36).slice(2);

  const parts: BlobPart[] = [
    `--${boundary}\r\nContent-Disposition: form-data; name="body"\r\nContent-Type: application/json\r\n\r\n`,
    JSON.stringify(jsonBody),
    "\r\n",
  ];

  if (files) {
    for (const [fieldName, file] of Object.entries(files)) {
      if (file) {
        parts.push(
          `--${boundary}\r\nContent-Disposition: form-data; name="${fieldName}"; filename="${file.name}"\r\nContent-Type: ${file.type || "application/octet-stream"}\r\n\r\n`,
          file,
          "\r\n",
        );
      }
    }
  }

  parts.push(`--${boundary}--\r\n`);

  const headers: Record<string, string> = {
    "Content-Type": `multipart/form-data; boundary=${boundary}`,
  };
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

  let response = await fetch(fullUrl, {
    method,
    headers,
    body: new Blob(parts),
    credentials: "include",
  });

  if (response.status === 401 && accessToken) {
    try {
      const refreshRes = await axios.post(
        `${baseURL}/auth/refresh`,
        {},
        { withCredentials: true },
      );
      setAccessToken(refreshRes.data.access_token);
      headers["Authorization"] = `Bearer ${refreshRes.data.access_token}`;
      response = await fetch(fullUrl, {
        method,
        headers,
        body: new Blob(parts),
        credentials: "include",
      });
    } catch {
      setAccessToken(null);
      throw new Error("Сессия истекла");
    }
  }

  const data = await response.json();
  if (!response.ok) {
    const err = new Error(data?.error?.message || "Ошибка запроса");
    (err as unknown as Record<string, unknown>).response = {
      status: response.status,
      data,
    };
    throw err;
  }
  return { data };
}

export default api;
