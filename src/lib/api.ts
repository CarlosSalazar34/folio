import type { AuthResponse, DocumentDetail, DocumentSummary, LibraryStats, User } from "@/lib/types";

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

export class ApiError extends Error {
    constructor(public status: number, message: string) {
        super(message);
    }
}

// Token de la sesión actual; lo gestiona AuthProvider (src/features/auth).
let authToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setAuthToken(token: string | null) {
    authToken = token;
}

/** Se llama cuando el servidor rechaza el token (caducado o inválido) para cerrar la sesión. */
export function setUnauthorizedHandler(handler: (() => void) | null) {
    onUnauthorized = handler;
}

export function authHeaders(): Record<string, string> {
    return authToken ? { Authorization: `Bearer ${authToken}` } : {};
}

/** Mensaje legible de un error de la API (FastAPI devuelve {"detail": …}). */
export function errorMessage(error: unknown, fallback = "Algo salió mal. Inténtalo de nuevo."): string {
    if (error instanceof ApiError) {
        if (error.status === 0) return "No se pudo conectar con el servidor.";
        try {
            const detail = JSON.parse(error.message)?.detail;
            if (typeof detail === "string") return detail;
            if (Array.isArray(detail) && typeof detail[0]?.msg === "string") {
                return String(detail[0].msg).replace(/^Value error, /, "");
            }
        } catch {
            // El cuerpo no era JSON.
        }
    }
    return fallback;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
    let response: Response;
    try {
        response = await fetch(`${API_URL}${path}`, {
            ...init,
            headers: { ...authHeaders(), ...(init?.headers as Record<string, string> | undefined) },
        });
    } catch {
        throw new ApiError(0, "No se pudo conectar con el servidor");
    }
    if (!response.ok) {
        const body = await response.text().catch(() => "");
        if (response.status === 401 && authToken) onUnauthorized?.();
        throw new ApiError(response.status, body || `HTTP ${response.status}`);
    }
    if (response.status === 204) return undefined as T;
    return response.json() as Promise<T>;
}

export function listDocuments(q?: string): Promise<DocumentSummary[]> {
    const query = q?.trim() ? `?q=${encodeURIComponent(q.trim())}` : "";
    return request(`/documents${query}`);
}

export function getDocument(id: string): Promise<DocumentDetail> {
    return request(`/documents/${id}`);
}

export function deleteDocument(id: string): Promise<void> {
    return request(`/documents/${id}`, { method: "DELETE" });
}

export function getStats(): Promise<LibraryStats> {
    return request("/stats");
}

export async function checkHealth(): Promise<boolean> {
    try {
        await request<{ status: string }>("/health");
        return true;
    } catch {
        return false;
    }
}

function postJson<T>(path: string, body: unknown): Promise<T> {
    return request(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
}

export function register(email: string, password: string, name: string): Promise<AuthResponse> {
    return postJson("/auth/register", { email, password, name });
}

export function login(email: string, password: string): Promise<AuthResponse> {
    return postJson("/auth/login", { email, password });
}

export function getMe(): Promise<User> {
    return request("/auth/me");
}

export function pdfUrl(id: string): string {
    return `${API_URL}/documents/${id}/pdf`;
}

/**
 * Sube las páginas (URIs locales de imágenes JPEG, en orden) y espera a que
 * la IA las procese. `onProgress` recibe 0–1 durante la subida; después de
 * llegar a 1 el servidor sigue analizando hasta responder.
 */
export function uploadDocument(
    pages: string[],
    onProgress?: (fraction: number) => void,
    enhance = true,
): Promise<DocumentDetail> {
    const form = new FormData();
    pages.forEach((uri, i) => {
        // React Native acepta {uri, name, type} como archivo en FormData.
        form.append("pages", { uri, name: `pagina-${i + 1}.jpg`, type: "image/jpeg" } as unknown as Blob);
    });
    form.append("enhance", String(enhance));

    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `${API_URL}/documents`);
        xhr.responseType = "json";
        for (const [name, value] of Object.entries(authHeaders())) xhr.setRequestHeader(name, value);
        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) onProgress?.(e.loaded / e.total);
        };
        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) resolve(xhr.response as DocumentDetail);
            else if (xhr.status === 401 && authToken) {
                onUnauthorized?.();
                reject(new ApiError(401, JSON.stringify(xhr.response ?? "")));
            } else reject(new ApiError(xhr.status, JSON.stringify(xhr.response ?? "")));
        };
        xhr.onerror = () => reject(new ApiError(0, "No se pudo conectar con el servidor"));
        xhr.send(form);
    });
}
