import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";

import { checkHealth } from "@/lib/api";

export type ServerStatus = "checking" | "online" | "offline";

/** Si /health no responde en este tiempo se considera sin conexión. */
const TIMEOUT_MS = 5000;

function checkWithTimeout(): Promise<boolean> {
    return new Promise((resolve) => {
        const timer = setTimeout(() => resolve(false), TIMEOUT_MS);
        checkHealth().then((ok) => {
            clearTimeout(timer);
            resolve(ok);
        });
    });
}

/** Consulta /health al montar y al volver a primer plano; `recheck` lo repite a mano. */
export function useServerStatus() {
    const [status, setStatus] = useState<ServerStatus>("checking");
    // Identifica la consulta vigente: se ignoran respuestas antiguas o tras desmontar.
    const latest = useRef(0);

    const check = useCallback(() => {
        const id = ++latest.current;
        checkWithTimeout().then((ok) => {
            if (id === latest.current) setStatus(ok ? "online" : "offline");
        });
    }, []);

    const recheck = useCallback(() => {
        setStatus("checking");
        check();
    }, [check]);

    useEffect(() => {
        const ref = latest;
        check();
        const subscription = AppState.addEventListener("change", (state) => {
            if (state === "active") recheck();
        });
        return () => {
            subscription.remove();
            ref.current++;
        };
    }, [check, recheck]);

    return { status, recheck };
}
