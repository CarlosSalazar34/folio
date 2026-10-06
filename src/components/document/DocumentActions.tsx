import { SymbolView } from "expo-symbols";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { IconButton } from "@/components/ui/IconButton";
import { colors } from "@/constants/colors";

/** Alto de la barra, para reservar espacio al final del contenido. */
export const DOCUMENT_ACTIONS_HEIGHT = 64;

type Props = {
    onShare: () => void;
    onDelete: () => void;
    sharing: boolean;
    deleting: boolean;
};

/** Barra flotante inferior: borrar + "Compartir PDF". */
export function DocumentActions({ onShare, onDelete, sharing, deleting }: Props) {
    const insets = useSafeAreaInsets();
    const busy = sharing || deleting;

    return <View
        pointerEvents="box-none"
        className="absolute left-0 right-0 px-4"
        style={{ bottom: insets.bottom + 12 }}
    >
        <View
            className="flex-row items-center gap-2 bg-ink rounded-full p-2"
            style={{
                height: DOCUMENT_ACTIONS_HEIGHT,
                borderCurve: "continuous",
                boxShadow: "0 10px 24px rgba(18, 18, 18, 0.25)",
            }}
        >
            <IconButton
                icon="trash"
                accessibilityLabel="Borrar documento"
                tintColor={colors.white}
                className="bg-white/10"
                disabled={busy}
                onPress={onDelete}
            />
            <Pressable
                accessibilityRole="button"
                accessibilityLabel="Compartir PDF"
                accessibilityState={{ disabled: busy, busy: sharing }}
                disabled={busy}
                onPress={onShare}
                className={`flex-1 h-12 rounded-full bg-cobalt flex-row items-center justify-center gap-2 active:opacity-80 ${busy ? "opacity-70" : ""}`}
            >
                {sharing
                    ? <ActivityIndicator color={colors.white} />
                    : <SymbolView name="square.and.arrow.up" size={16} weight="semibold" tintColor={colors.white} />}
                <Text className="text-base font-semibold text-white">
                    {sharing ? "Preparando PDF…" : "Compartir PDF"}
                </Text>
            </Pressable>
        </View>
    </View>;
}
