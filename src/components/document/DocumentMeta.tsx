import { SymbolView } from "expo-symbols";
import { Text, View } from "react-native";

import { Chip } from "@/components/ui/Chip";
import { colors } from "@/constants/colors";
import { CATEGORY_LABELS, type DocumentDetail } from "@/lib/types";

import { mono } from "./mono";

const MONTHS = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];

function sameDay(a: Date, b: Date) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** "HOY 09:12", "AYER 18:40" o "12 MAR 2026". */
export function formatCreatedAt(iso: string, now = new Date()): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "";
    const time = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
    if (sameDay(date, now)) return `HOY ${time}`;
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (sameDay(date, yesterday)) return `AYER ${time}`;
    return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

type Props = {
    document: DocumentDetail;
};

/** Línea de metadatos + chips de categoría y OCR + resumen de la IA. */
export function DocumentMeta({ document }: Props) {
    const pages = document.page_count || document.pages.length;
    const meta = [`${pages} PÁG`, "PDF", formatCreatedAt(document.created_at)].filter(Boolean).join(" · ");
    const hasText = document.text.trim().length > 0;

    return <View className="gap-4">
        <Text selectable className="text-xs text-graphite" style={mono}>{meta}</Text>
        <View className="flex-row flex-wrap gap-2">
            <Chip label={CATEGORY_LABELS[document.category] ?? CATEGORY_LABELS.otro} selected />
            {hasText && <View
                accessibilityRole="text"
                className="h-9 px-4 rounded-full bg-lime flex-row items-center gap-1.5"
            >
                <SymbolView name="checkmark" size={12} weight="bold" tintColor={colors.ink} />
                <Text className="text-sm font-medium text-ink">Texto reconocido</Text>
            </View>}
        </View>
        {document.summary.trim().length > 0 && <Text selectable className="text-[17px] leading-6 text-ink">
            {document.summary}
        </Text>}
    </View>;
}
