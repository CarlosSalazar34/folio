import { View } from "react-native";
import Animated, { Extrapolation, interpolate, interpolateColor, useAnimatedStyle, type SharedValue } from "react-native-reanimated";

import { colors } from "@/constants/colors";

type DotProps = {
    index: number;
    width: number;
    scrollX: SharedValue<number>;
};

function Dot({ index, width, scrollX }: DotProps) {
    const style = useAnimatedStyle(() => {
        // Progreso de 0 (lejos) a 1 (página actual) según el desplazamiento.
        const position = width > 0 ? scrollX.get() / width : 0;
        const progress = interpolate(Math.abs(position - index), [0, 1], [1, 0], Extrapolation.CLAMP);
        return {
            width: 8 + progress * 16,
            backgroundColor: interpolateColor(progress, [0, 1], [colors.line, colors.cobalt]),
        };
    });

    return <Animated.View className="h-2 rounded-full" style={style} />;
}

type Props = {
    count: number;
    current: number;
    width: number;
    scrollX: SharedValue<number>;
};

/** Indicador de página animado por el desplazamiento del carrusel. */
export function PageDots({ count, current, width, scrollX }: Props) {
    return <View
        accessible
        accessibilityRole="text"
        accessibilityLabel={`Página ${current + 1} de ${count}`}
        className="flex-row items-center justify-center gap-2"
    >
        {Array.from({ length: count }, (_, i) => <Dot key={i} index={i} width={width} scrollX={scrollX} />)}
    </View>;
}
