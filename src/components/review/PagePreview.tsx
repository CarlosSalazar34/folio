import { Image } from "expo-image";
import { useState } from "react";
import { ActivityIndicator, View, type LayoutChangeEvent } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

import { colors } from "@/constants/colors";

/** Proporción por defecto (A4) mientras la imagen todavía no ha cargado. */
const DEFAULT_ASPECT = 1 / Math.SQRT2;
const PANEL_PADDING = 24;

type Props = {
    uri: string;
    /** Muestra un indicador mientras se gira la página. */
    busy?: boolean;
};

/** Vista grande de la página actual: hoja blanca con sombra sobre un panel gris. */
export function PagePreview({ uri, busy = false }: Props) {
    const [panel, setPanel] = useState({ width: 0, height: 0 });
    const [loaded, setLoaded] = useState<{ uri: string; aspect: number } | null>(null);

    const aspect = loaded?.uri === uri ? loaded.aspect : DEFAULT_ASPECT;
    const maxWidth = Math.max(panel.width - PANEL_PADDING * 2, 0);
    const maxHeight = Math.max(panel.height - PANEL_PADDING * 2, 0);
    const fitsByWidth = maxWidth / aspect <= maxHeight;
    const pageWidth = fitsByWidth ? maxWidth : maxHeight * aspect;
    const pageHeight = fitsByWidth ? maxWidth / aspect : maxHeight;

    const onLayout = (e: LayoutChangeEvent) => {
        const { width, height } = e.nativeEvent.layout;
        setPanel({ width, height });
    };

    return <View
        onLayout={onLayout}
        className="flex-1 rounded-[28px] bg-[#E2E0D9] items-center justify-center overflow-hidden"
    >
        {panel.width > 0 && <Animated.View
            key={uri}
            entering={FadeIn.duration(220)}
            className="bg-white rounded-md overflow-hidden"
            style={{
                width: pageWidth,
                height: pageHeight,
                boxShadow: "0 12px 32px rgba(18, 18, 18, 0.14), 0 2px 6px rgba(18, 18, 18, 0.08)",
            }}
        >
            <Image
                source={{ uri }}
                contentFit="contain"
                transition={150}
                style={{ flex: 1 }}
                accessibilityIgnoresInvertColors
                onLoad={(e) => {
                    const { width, height } = e.source;
                    if (width > 0 && height > 0) setLoaded({ uri, aspect: width / height });
                }}
            />
        </Animated.View>}
        {busy && <View className="absolute inset-0 items-center justify-center bg-[#E2E0D9]/60">
            <ActivityIndicator color={colors.ink} />
        </View>}
    </View>;
}
