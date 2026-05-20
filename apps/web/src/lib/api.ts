import type {
  CreateDocumentResponse,
  GetDocumentResponse,
  ListDocumentsResponse,
  PatchDocumentRequest,
  PatchDocumentResponse,
} from "@aajia/shared";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

export type User = { id: string; name: string };

const USER_KEY = "currentUserId";
const DEFAULT_USER_ID = "user-alice";

export function getCurrentUserId(): string {
  return localStorage.getItem(USER_KEY) ?? DEFAULT_USER_ID;
}

export function setCurrentUserId(id: string): void {
  localStorage.setItem(USER_KEY, id);
}

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function withUserHeader(init?: RequestInit): RequestInit {
  return {
    ...init,
    headers: {
      "x-user-id": getCurrentUserId(),
      ...(init?.headers ?? {}),
    },
  };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "x-user-id": getCurrentUserId(),
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    let body = "";
    try {
      body = await res.text();
    } catch {
      // ignore
    }
    throw new ApiError(res.status, body || `HTTP ${res.status}`);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return (await res.json()) as T;
}

export const api = {
  listUsers: () => request<{ users: User[] }>("/api/users"),

  listDocuments: () => request<ListDocumentsResponse>("/api/documents"),

  createDocument: () =>
    request<CreateDocumentResponse>("/api/documents", { method: "POST" }),

  getDocument: (id: string) =>
    request<GetDocumentResponse>(`/api/documents/${id}`),

  patchDocument: (
    id: string,
    patch: PatchDocumentRequest,
    opts?: { keepalive?: boolean },
  ) =>
    request<PatchDocumentResponse>(`/api/documents/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
      keepalive: opts?.keepalive,
    }),

  deleteDocument: (id: string) =>
    request<void>(`/api/documents/${id}`, { method: "DELETE" }),

  shareDocument: (id: string, userId: string) =>
    request<{ documentId: string; userId: string }>(
      `/api/documents/${id}/shares`,
      {
        method: "POST",
        body: JSON.stringify({ userId }),
      },
    ),

  uploadDocument: async (file: File): Promise<CreateDocumentResponse> => {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(
      `${API_BASE}/api/documents/upload`,
      withUserHeader({
        method: "POST",
        body: form,
      }),
    );
    if (!res.ok) {
      let body = "";
      try {
        body = await res.text();
      } catch {
        // ignore
      }
      throw new ApiError(res.status, body || `HTTP ${res.status}`);
    }
    return (await res.json()) as CreateDocumentResponse;
  },
};

export { ApiError };
