import * as SecureStore from "expo-secure-store";
import { createContext, use, useEffect, useState, type ReactNode } from "react";

import * as api from "@/lib/api";
import type { AuthResponse, User } from "@/lib/types";

const TOKEN_KEY = "folio.session.token";
const USER_KEY = "folio.session.user";

type AuthState = {
    /** null = invitado */
    user: User | null;
    signIn: (email: string, password: string) => Promise<void>;
    signUp: (email: string, password: string, name: string) => Promise<void>;
    signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

/** Lee la sesión guardada en el llavero (síncrono, para no mostrar "Invitado" un instante). */
function restoreSession(): User | null {
    try {
        const token = SecureStore.getItem(TOKEN_KEY);
        const user = SecureStore.getItem(USER_KEY);
        if (!token || !user) return null;
        api.setAuthToken(token);
        return JSON.parse(user) as User;
    } catch {
        return null;
    }
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(restoreSession);

    const clear = async () => {
        api.setAuthToken(null);
        setUser(null);
        await Promise.all([SecureStore.deleteItemAsync(TOKEN_KEY), SecureStore.deleteItemAsync(USER_KEY)]).catch(() => {});
    };

    const save = async ({ token, user: next }: AuthResponse) => {
        await SecureStore.setItemAsync(TOKEN_KEY, token);
        await SecureStore.setItemAsync(USER_KEY, JSON.stringify(next));
        api.setAuthToken(token);
        setUser(next);
    };

    useEffect(() => {
        // Si el servidor rechaza el token (caducado), se vuelve a modo invitado.
        api.setUnauthorizedHandler(() => { void clear(); });
        return () => api.setUnauthorizedHandler(null);
    }, []);

    useEffect(() => {
        // Refresca los datos del usuario guardados (nombre, correo) al abrir la app.
        if (!user) return;
        api.getMe()
            .then((fresh) => {
                setUser(fresh);
                return SecureStore.setItemAsync(USER_KEY, JSON.stringify(fresh));
            })
            .catch(() => {
                // Sin conexión: se mantiene la sesión guardada; un 401 ya la cierra el handler.
            });
        // Solo al montar.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const value: AuthState = {
        user,
        signIn: async (email, password) => save(await api.login(email, password)),
        signUp: async (email, password, name) => save(await api.register(email, password, name)),
        signOut: clear,
    };

    return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth(): AuthState {
    const ctx = use(AuthContext);
    if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
    return ctx;
}
