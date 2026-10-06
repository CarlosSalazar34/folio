import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";

import { getStats } from "@/lib/api";
import type { LibraryStats } from "@/lib/types";

/**
 * Estadísticas de la biblioteca (`GET /stats`). Se vuelven a pedir cada vez
 * que la pantalla recupera el foco; las recargas posteriores a la primera son
 * silenciosas (se mantienen las cifras anteriores mientras llegan las nuevas).
 */
export function useLibraryStats() {
    const [stats, setStats] = useState<LibraryStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const requestId = useRef(0);
    const hasStats = useRef(false);

    const load = useCallback(async (silent: boolean) => {
        const id = ++requestId.current;
        if (!silent) setLoading(true);
        try {
            const result = await getStats();
            if (id !== requestId.current) return;
            hasStats.current = true;
            setStats(result);
            setError(null);
        } catch (e) {
            if (id !== requestId.current) return;
            setError(e instanceof Error ? e : new Error(String(e)));
        } finally {
            if (id === requestId.current) setLoading(false);
        }
    }, []);

    useFocusEffect(useCallback(() => {
        void load(hasStats.current);
    }, [load]));

    const reload = useCallback(() => {
        void load(false);
    }, [load]);

    return { stats, loading, error, reload };
}
