import { router } from "expo-router";
import { SymbolView, type SFSymbol } from "expo-symbols";
import { ActivityIndicator, Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { colors } from "@/constants/colors";

export type EmptyVariant = "loading" | "empty" | "no-results" | "error";

type Props = {
    variant: EmptyVariant;
    onRetry?: () => void;
};

const CONTENT: Record<Exclude<EmptyVariant, "loading">, { icon: SFSymbol; title: string; body: string }> = {
    empty: {
        icon: "doc.viewfinder",
        title: "Aún no tienes documentos",
        body: "Escanea tu primer documento y la IA lo ordenará por ti.",
    },
    "no-results": {
        icon: "magnifyingglass",
        title: "Sin resultados",
        body: "No encontramos documentos que coincidan. Prueba con otras palabras o categoría.",
    },
    error: {
        icon: "wifi.exclamationmark",
        title: "No se pudo conectar con el servidor",
        body: "Comprueba tu conexión e inténtalo de nuevo.",
    },
};

export function EmptyState({ variant, onRetry }: Props) {
    if (variant === "loading") {
        return <View className="items-center py-20">
            <ActivityIndicator color={colors.graphite} accessibilityLabel="Cargando documentos" />
        </View>;
    }

    const { icon, title, body } = CONTENT[variant];

    return <View className="items-center px-6 py-16 gap-3">
        <SymbolView name={icon} size={36} tintColor={colors.graphite} />
        <Text className="text-lg font-semibold text-ink text-center">{title}</Text>
        <Text className="text-[15px] text-graphite text-center">{body}</Text>
        {variant === "empty" && <Button title="Escanear documento" className="mt-3" onPress={() => router.push("/escanear")} />}
        {variant === "error" && onRetry && <Button title="Reintentar" variant="secondary" className="mt-3" onPress={onRetry} />}
    </View>;
}
