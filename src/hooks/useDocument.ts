import { useCallback, useEffect, useState } from "react";

import { getDocument } from "@/lib/api";
import type { DocumentDetail } from "@/lib/types";

type State = {
    document: DocumentDetail | null;
    loading: boolean;
    error: Error | null;
};

/** Carga el detalle de un documento. `reload()` vuelve a pedirlo al servidor. */
export function useDocument(id: string | undefined) {
    const [state, setState] = useState<State>({ document: null, loading: true, error: null });
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        let cancelled = false;

        async function load(documentId: string | undefined) {
            if (!documentId) {
                setState({ document: null, loading: false, error: new Error("Falta el identificador del documento") });
                return;
            }
            // Si cambia el id no mostramos (ni actuamos sobre) el documento anterior.
            setState((prev) => ({
                document: prev.document?.id === documentId ? prev.document : null,
                loading: true,
                error: null,
            }));
            try {
                const document = await getDocument(documentId);
                if (!cancelled) setState({ document, loading: false, error: null });
            } catch (e) {
                if (!cancelled) {
                    const error = e instanceof Error ? e : new Error(String(e));
                    setState((prev) => ({
                        document: prev.document?.id === documentId ? prev.document : null,
                        loading: false,
                        error,
                    }));
                }
            }
        }

        load(id);
        return () => {
            cancelled = true;
        };
    }, [id, attempt]);

    const reload = useCallback(() => setAttempt((n) => n + 1), []);

    return { ...state, reload };
}
