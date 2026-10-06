import Constants from "expo-constants";
import { router } from "expo-router";
import { Text, View } from "react-native";

import { colors } from "@/constants/colors";
import { useServerStatus } from "@/hooks/useServerStatus";
import { API_URL } from "@/lib/api";

import { SettingsRow } from "./SettingsRow";
import { SettingsSection } from "./SettingsSection";

/** "http://192.168.1.5:8000/api" → "192.168.1.5:8000" (sin depender de URL en RN). */
function hostOf(url: string) {
    return url.replace(/^[a-z][a-z0-9+.-]*:\/\//i, "").split(/[/?#]/)[0];
}

const STATUS_LABEL = {
    checking: "Comprobando…",
    online: "Conectado",
    offline: "Sin conexión",
} as const;

const STATUS_COLOR = {
    checking: colors.graphite,
    online: "#22A447",
    offline: colors.danger,
} as const;

/** Sección "App": presentación, estado del servidor y versión. */
export function AppInfo() {
    const { status, recheck } = useServerStatus();
    const version = Constants.expoConfig?.version ?? "—";

    return <SettingsSection title="App">
        <SettingsRow
            icon="sparkles"
            iconBackground={colors.cobalt}
            title="Ver presentación"
            accessory="chevron"
            onPress={() => router.push("/onboarding")}
        />
        <SettingsRow
            icon="server.rack"
            iconBackground={colors.graphite}
            title="Servidor"
            caption={hostOf(API_URL)}
            onPress={recheck}
            accessibilityHint="Vuelve a comprobar la conexión"
            accessory={<View className="flex-row items-center gap-1.5">
                <View className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_COLOR[status] }} />
                <Text className="font-sans text-[15px] text-graphite">{STATUS_LABEL[status]}</Text>
            </View>}
        />
        <SettingsRow
            icon="info.circle"
            iconBackground={colors.graphite}
            title="Versión"
            value={version}
            monoValue
        />
    </SettingsSection>;
}
