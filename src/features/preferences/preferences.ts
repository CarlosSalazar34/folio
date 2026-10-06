import Storage from "expo-sqlite/kv-store";
import { useSyncExternalStore } from "react";

/** Preferencias guardadas en el dispositivo (expo-sqlite/kv-store). */
export type Preferences = {
    onboardingCompleted: boolean;
    enhanceByDefault: boolean;
};

const DEFAULTS: Preferences = {
    onboardingCompleted: false,
    enhanceByDefault: true,
};

const PREFIX = "pref:";
const listeners = new Set<() => void>();
const cache = new Map<keyof Preferences, unknown>();

export function getPreference<K extends keyof Preferences>(key: K): Preferences[K] {
    if (cache.has(key)) return cache.get(key) as Preferences[K];
    let value: Preferences[K] = DEFAULTS[key];
    try {
        const raw = Storage.getItemSync(PREFIX + key);
        if (raw != null) value = JSON.parse(raw) as Preferences[K];
    } catch {
        // Valor corrupto o almacenamiento no disponible: se usa el valor por defecto.
    }
    cache.set(key, value);
    return value;
}

export function setPreference<K extends keyof Preferences>(key: K, value: Preferences[K]): void {
    cache.set(key, value);
    try {
        Storage.setItemSync(PREFIX + key, JSON.stringify(value));
    } catch (e) {
        console.warn("No se pudo guardar la preferencia", key, e);
    }
    listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
}

/** Lee y escribe una preferencia; los componentes se actualizan al cambiarla. */
export function usePreference<K extends keyof Preferences>(key: K): [Preferences[K], (value: Preferences[K]) => void] {
    const value = useSyncExternalStore(subscribe, () => getPreference(key));
    return [value, (v) => setPreference(key, v)];
}
