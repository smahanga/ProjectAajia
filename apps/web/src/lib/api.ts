import type {
  CreateDocumentResponse,
  GetDocumentResponse,
  ListDocumentsResponse,
  PatchDocumentRequest,
  PatchDocumentResponse,
} from "@aajia/shared";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
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
  listDocuments: () =>
    request<ListDocumentsResponse>("/api/documents"),

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
      // `keepalive: true` lets the browser finish the request after the page
      // unloads. Used by the beforeunload flush path. ~64KB body cap.
      keepalive: opts?.keepalive,
    }),

  deleteDocument: (id: string) =>
    request<void>(`/api/documents/${id}`, { method: "DELETE" }),
};

export { ApiError };
