import { Image } from "expo-image";
import { Platform, Pressable, ScrollView, Text, View } from "react-native";

import { colors } from "@/constants/colors";

const MONO = Platform.select({ ios: "Menlo", default: "monospace" });

type Props = {
    pages: string[];
    selected: number;
    onSelect: (index: number) => void;
};

/** Tira horizontal de miniaturas; la seleccionada lleva borde cobalto. */
export function PageStrip({ pages, selected, onSelect }: Props) {
    return <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 10, paddingHorizontal: 16, paddingVertical: 4 }}
    >
        {pages.map((uri, index) => {
            const isSelected = index === selected;
            return <Pressable
                key={`${index}-${uri}`}
                accessibilityRole="button"
                accessibilityLabel={`Página ${index + 1}`}
                accessibilityState={{ selected: isSelected }}
                onPress={() => onSelect(index)}
                className="items-center gap-1.5 active:opacity-80"
            >
                <View className={`w-14 h-[74px] rounded-[10px] p-0.5 border-2 ${isSelected ? "border-cobalt" : "border-transparent"}`}>
                    <Image
                        source={{ uri }}
                        contentFit="cover"
                        recyclingKey={uri}
                        style={{ flex: 1, borderRadius: 6, backgroundColor: colors.white }}
                        accessibilityIgnoresInvertColors
                    />
                </View>
                <Text
                    className={`text-[11px] ${isSelected ? "text-cobalt" : "text-graphite"}`}
                    style={{ fontFamily: MONO }}
                >
                    {String(index + 1).padStart(2, "0")}
                </Text>
            </Pressable>;
        })}
    </ScrollView>;
}
