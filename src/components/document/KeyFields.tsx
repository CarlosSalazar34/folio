import { Text, View } from "react-native";

import type { KeyField } from "@/lib/types";

import { SectionTitle } from "./SectionTitle";

type Props = {
    fields: KeyField[];
};

/** Lista etiqueta/valor (Fecha, Total…) extraída por la IA. */
export function KeyFields({ fields }: Props) {
    if (fields.length === 0) return null;

    return <View className="gap-3">
        <SectionTitle>Datos clave</SectionTitle>
        <View className="bg-white rounded-2xl px-4" style={{ borderCurve: "continuous" }}>
            {fields.map((field, i) => <View
                key={`${field.label}-${i}`}
                className={`flex-row items-start justify-between gap-4 py-3.5 ${i > 0 ? "border-t border-[#E2E0D9]" : ""}`}
            >
                <Text className="text-[15px] text-graphite">{field.label}</Text>
                <Text selectable className="flex-1 text-right text-[15px] font-semibold text-ink">{field.value}</Text>
            </View>)}
        </View>
    </View>;
}
