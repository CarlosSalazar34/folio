import type { DocumentDetail, DocumentSummary } from "@/lib/types";

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

export class ApiError extends Error {
    constructor(public status: number, message: string) {
        super(message);
    }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${API_URL}${path}`, init);
    if (!response.ok) {
        const body = await response.text().catch(() => "");
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
        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) onProgress?.(e.loaded / e.total);
        };
        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) resolve(xhr.response as DocumentDetail);
            else reject(new ApiError(xhr.status, JSON.stringify(xhr.response ?? "")));
        };
        xhr.onerror = () => reject(new ApiError(0, "No se pudo conectar con el servidor"));
        xhr.send(form);
    });
}
