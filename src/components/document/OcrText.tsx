import { SymbolView } from "expo-symbols";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { colors } from "@/constants/colors";

import { mono } from "./mono";

type Props = {
    text: string;
};

/** Sección plegable con el texto reconocido (seleccionable para copiar). */
export function OcrText({ text }: Props) {
    const [expanded, setExpanded] = useState(false);
    const content = text.trim();
    if (!content) return null;
    // Aproximación: con poco texto no hace falta plegar.
    const collapsible = content.length > 220 || content.split("\n").length > 4;

    return <View className="gap-3">
        <Pressable
            accessibilityRole="button"
            disabled={!collapsible}
            accessibilityState={{ expanded }}
            accessibilityLabel={expanded ? "Ocultar texto reconocido" : "Mostrar texto reconocido"}
            onPress={() => setExpanded((v) => !v)}
            className="flex-row items-center justify-between py-1 active:opacity-70"
        >
            <Text className="text-xs text-graphite uppercase" style={mono}>Texto</Text>
            {collapsible && <SymbolView
                name={expanded ? "chevron.up" : "chevron.down"}
                size={14}
                weight="semibold"
                tintColor={colors.graphite}
            />}
        </Pressable>
        <View className="bg-white rounded-2xl p-4" style={{ borderCurve: "continuous" }}>
            <Text
                selectable
                numberOfLines={expanded || !collapsible ? undefined : 4}
                className="text-[15px] leading-[22px] text-ink"
            >
                {content}
            </Text>
            {collapsible && !expanded && <Pressable
                accessibilityRole="button"
                onPress={() => setExpanded(true)}
                className="pt-2 active:opacity-70"
            >
                <Text className="text-sm font-semibold text-cobalt">Ver todo</Text>
            </Pressable>}
        </View>
        {(expanded || !collapsible) && <Text className="text-xs text-graphite">Mantén pulsado el texto para copiarlo.</Text>}
    </View>;
}
