import type { ReactNode } from "react";
import { Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { colors } from "@/constants/colors";
import { useLibraryStats } from "@/hooks/useLibraryStats";
import { CATEGORY_LABELS, type Category, type LibraryStats } from "@/lib/types";

/** Un color por segmento, en orden de mayor a menor categoría. */
const SEGMENT_COLORS = [colors.cobalt, colors.lime, colors.ink, colors.graphite, "#D9D7D0", "#8FA0F9", "#E6F5A8"];
const SKELETON = "bg-[#ECEAE4]";

const MONTHS = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];

function startOfDay(date: Date): number {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/** "HOY 09:12", "AYER", "28 SEP", "12 MAR 2025" (mismo formato que la lista de documentos). */
function formatLastScan(iso: string | null, now = new Date()): string {
    if (!iso) return "—";
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "—";
    const days = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);
    if (days === 0) {
        return `HOY ${date.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", hour12: false })}`;
    }
    if (days === 1) return "AYER";
    const label = `${date.getDate()} ${MONTHS[date.getMonth()]}`;
    return date.getFullYear() === now.getFullYear() ? label : `${label} ${date.getFullYear()}`;
}

function Figure({ value, label }: { value: string; label: string }) {
    return <View className="flex-1 gap-1">
        <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.6}
            className="font-display text-[28px] text-ink"
        >
            {value}
        </Text>
        <Text numberOfLines={1} className="font-mono text-[11px] uppercase tracking-wide text-graphite">
            {label}
        </Text>
    </View>;
}

function CategoryBar({ categories }: { categories: LibraryStats["categories"] }) {
    const entries = (Object.entries(categories) as [Category, number | undefined][])
        .filter((entry): entry is [Category, number] => (entry[1] ?? 0) > 0)
        .sort((a, b) => b[1] - a[1]);
    const total = entries.reduce((sum, [, count]) => sum + count, 0);
    if (total === 0) return null;

    // La leyenda visible muestra las 3 mayores; el lector de pantalla las anuncia todas.
    const spoken = entries
        .map(([category, count]) => `${CATEGORY_LABELS[category]} ${count}`)
        .join(", ");

    return <View className="gap-3" accessible accessibilityLabel={`Categorías: ${spoken}`}>
        <View className="h-2 flex-row overflow-hidden rounded-full" style={{ gap: 2 }}>
            {entries.map(([category, count], i) => <View
                key={category}
                style={{ flex: count, backgroundColor: SEGMENT_COLORS[i % SEGMENT_COLORS.length] }}
            />)}
        </View>
        <View className="flex-row flex-wrap gap-x-4 gap-y-1">
            {entries.slice(0, 3).map(([category, count], i) => <View key={category} className="flex-row items-center gap-1.5">
                <View
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: SEGMENT_COLORS[i % SEGMENT_COLORS.length] }}
                />
                <Text className="font-sans text-[13px] text-ink">{CATEGORY_LABELS[category]}</Text>
                <Text className="font-mono text-[11px] text-graphite">{count}</Text>
            </View>)}
        </View>
    </View>;
}

function Skeleton() {
    return <View className="gap-5" accessibilityLabel="Cargando estadísticas">
        <View className="flex-row gap-4">
            {[0, 1, 2].map((i) => <View key={i} className="flex-1 gap-2">
                <View className={`h-7 w-14 rounded-md ${SKELETON}`} />
                <View className={`h-3 w-20 rounded ${SKELETON}`} />
            </View>)}
        </View>
        <View className={`h-2 rounded-full ${SKELETON}`} />
    </View>;
}

/** Tarjeta de estadísticas de la biblioteca para la pantalla de perfil. */
export function LibraryStatsCard() {
    const { stats, loading, error, reload } = useLibraryStats();

    let content: ReactNode;
    if (stats) {
        content = <View className="gap-5">
            <View className="flex-row gap-4">
                <Figure value={String(stats.document_count)} label="Documentos" />
                <Figure value={String(stats.page_count)} label="Páginas" />
                <Figure value={formatLastScan(stats.last_scan_at)} label="Último escaneo" />
            </View>
            {stats.document_count === 0
                ? <Text className="font-sans text-[15px] text-graphite">Aún no has escaneado nada</Text>
                : <CategoryBar categories={stats.categories} />}
            {error && !loading && <Text className="font-mono text-[11px] uppercase tracking-wide text-graphite">
                No se pudieron actualizar ·{" "}
                <Text accessibilityRole="button" onPress={reload} className="text-cobalt">Reintentar</Text>
            </Text>}
        </View>;
    } else if (error && !loading) {
        content = <View className="flex-row items-center justify-between gap-3">
            <Text className="flex-1 font-sans text-[15px] text-graphite">
                No se pudieron cargar las estadísticas
            </Text>
            <Button title="Reintentar" variant="secondary" onPress={reload} />
        </View>;
    } else {
        content = <Skeleton />;
    }

    return <View className="w-full self-stretch rounded-3xl bg-white p-5">{content}</View>;
}
