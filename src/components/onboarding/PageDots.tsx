import { useEffect } from "react";
import { View } from "react-native";
import Animated, { Easing, interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { colors } from "@/constants/colors";

const INACTIVE = "#D9D7D0";
const timing = { duration: 280, easing: Easing.out(Easing.cubic) };

function Dot({ active }: { active: boolean }) {
    // 0 = inactivo, 1 = página actual
    const progress = useSharedValue(active ? 1 : 0);

    useEffect(() => {
        progress.set(withTiming(active ? 1 : 0, timing));
    }, [active, progress]);

    const style = useAnimatedStyle(() => ({
        width: 6 + progress.get() * 14,
        backgroundColor: interpolateColor(progress.get(), [0, 1], [INACTIVE, colors.ink]),
    }));

    return <Animated.View className="h-1.5 rounded-full" style={style} />;
}

type Props = {
    count: number;
    current: number;
};

/** Indicador de página: el punto activo se alarga con una transición suave. */
export function PageDots({ count, current }: Props) {
    return <View
        accessible
        accessibilityRole="text"
        accessibilityLabel={`Página ${current + 1} de ${count}`}
        className="flex-row items-center justify-center gap-2"
    >
        {Array.from({ length: count }, (_, i) => <Dot key={i} active={i === current} />)}
    </View>;
}
