import { ScrollView, Text, View } from "react-native";

import { Chip } from "@/components/ui/Chip";
import { CATEGORY_LABELS, type Category } from "@/lib/types";

const CATEGORIES = Object.keys(CATEGORY_LABELS) as Category[];

type Props = {
    value: Category | null;
    onChange: (category: Category | null) => void;
    /** Muestra la etiqueta de sección "RECIENTES" bajo los chips. */
    showSectionLabel?: boolean;
};

export function CategoryFilter({ value, onChange, showSectionLabel = true }: Props) {
    return <View className="pt-2 pb-1">
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="-mx-4"
            contentContainerClassName="gap-2 px-4"
        >
            <Chip label="Todos" selected={value === null} onPress={() => onChange(null)} />
            {CATEGORIES.map((category) => <Chip
                key={category}
                label={CATEGORY_LABELS[category]}
                selected={value === category}
                onPress={() => onChange(value === category ? null : category)}
            />)}
        </ScrollView>
        {showSectionLabel && <Text
            accessibilityRole="header"
            className="font-mono text-[11px] uppercase tracking-widest text-graphite mt-6 mb-1"
        >
            Recientes
        </Text>}
    </View>;
}
