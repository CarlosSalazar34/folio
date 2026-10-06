import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";

import { listDocuments } from "@/lib/api";
import type { Category, DocumentSummary } from "@/lib/types";

const DEBOUNCE_MS = 300;

type LoadMode = "initial" | "refresh" | "silent";

/**
 * Lista de documentos desde la API. La búsqueda (`query`) se envía al
 * servidor con debounce; la categoría se filtra en el cliente. Vuelve a
 * pedir la lista cada vez que la pantalla recupera el foco, para que un
 * documento recién escaneado aparezca sin recargar a mano.
 */
export function useDocuments(query: string, category: Category | null) {
    const [debouncedQuery, setDebouncedQuery] = useState(query.trim());
    const [all, setAll] = useState<DocumentSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const requestId = useRef(0);
    /** Consulta de la última respuesta correcta (null = aún ninguna). */
    const loadedQuery = useRef<string | null>(null);

    useEffect(() => {
        const trimmed = query.trim();
        const timer = setTimeout(() => setDebouncedQuery(trimmed), DEBOUNCE_MS);
        return () => clearTimeout(timer);
    }, [query]);

    const load = useCallback(async (mode: LoadMode) => {
        const id = ++requestId.current;
        if (mode === "refresh") setRefreshing(true);
        else if (mode === "initial") setLoading(true);

        try {
            const result = await listDocuments(debouncedQuery);
            if (id !== requestId.current) return;
            loadedQuery.current = debouncedQuery;
            setAll(result);
            setError(null);
        } catch (e) {
            if (id !== requestId.current) return;
            setError(e instanceof Error ? e : new Error(String(e)));
            // Si la lista que mostramos corresponde a otra búsqueda ya no es válida.
            if (loadedQuery.current !== debouncedQuery) {
                loadedQuery.current = null;
                setAll([]);
            }
        } finally {
            if (id === requestId.current) {
                setLoading(false);
                setRefreshing(false);
            }
        }
    }, [debouncedQuery]);

    // Se ejecuta al enfocar la pantalla y cada vez que cambia la búsqueda.
    useFocusEffect(useCallback(() => {
        void load(loadedQuery.current === null ? "initial" : "silent");
    }, [load]));

    const refresh = useCallback(() => {
        void load("refresh");
    }, [load]);

    const retry = useCallback(() => {
        void load("initial");
    }, [load]);

    const documents = category ? all.filter((d) => d.category === category) : all;

    return { documents, loading, refreshing, error, refresh, retry, searching: debouncedQuery.length > 0 };
}

const MONTHS = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];

function startOfDay(date: Date): number {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/** "4 PÁG · HOY 09:12", "1 PÁG · AYER", "2 PÁG · 28 SEP", "3 PÁG · 12 MAR 2025". */
export function formatDocumentMeta(doc: Pick<DocumentSummary, "page_count" | "created_at">, now = new Date()): string {
    const pages = `${doc.page_count} PÁG`;
    const date = new Date(doc.created_at);
    if (Number.isNaN(date.getTime())) return pages;

    const days = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);
    let when: string;
    if (days === 0) {
        const time = date.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", hour12: false });
        when = `HOY ${time}`;
    } else if (days === 1) {
        when = "AYER";
    } else {
        when = `${date.getDate()} ${MONTHS[date.getMonth()]}`;
        if (date.getFullYear() !== now.getFullYear()) when += ` ${date.getFullYear()}`;
    }
    return `${pages} · ${when}`;
}
