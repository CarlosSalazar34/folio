import { SymbolView } from "expo-symbols";
import { useEffect } from "react";
import { BackHandler, Text, View } from "react-native";
import Animated, {
    cancelAnimation,
    Easing,
    FadeIn,
    FadeInDown,
    FadeOut,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from "react-native-reanimated";

import { colors } from "@/constants/colors";

export type UploadPhase = "preparing" | "uploading" | "analyzing";

type Props = {
    phase: UploadPhase;
    /** 0–1, solo se usa en "preparing" y "uploading". */
    progress: number;
    pageCount: number;
};

const COPY: Record<UploadPhase, { title: string; subtitle: (pages: number) => string }> = {
    preparing: {
        title: "Preparando páginas…",
        subtitle: (n) => `Optimizando ${n === 1 ? "1 página" : `${n} páginas`} para subirlas`,
    },
    uploading: {
        title: "Subiendo…",
        subtitle: (n) => `Enviando ${n === 1 ? "1 página" : `${n} páginas`} a tu biblioteca`,
    },
    analyzing: {
        title: "Analizando con IA…",
        subtitle: () => "Detectando título, categoría y datos clave",
    },
};

/**
 * Capa a pantalla completa mientras se guarda el documento. Bloquea los
 * toques y el botón atrás de Android: no se puede cerrar durante la subida.
 */
export function UploadOverlay({ phase, progress, pageCount }: Props) {
    const fill = useSharedValue(0);
    const sweep = useSharedValue(0);
    const indeterminate = phase === "analyzing";

    useEffect(() => {
        const sub = BackHandler.addEventListener("hardwareBackPress", () => true);
        return () => sub.remove();
    }, []);

    useEffect(() => {
        fill.set(withTiming(Math.min(Math.max(progress, 0), 1), { duration: 200 }));
    }, [fill, progress]);

    useEffect(() => {
        if (indeterminate) {
            sweep.set(0);
            sweep.set(withRepeat(withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.cubic) }), -1, true));
        } else {
            cancelAnimation(sweep);
        }
        return () => cancelAnimation(sweep);
    }, [indeterminate, sweep]);

    const fillStyle = useAnimatedStyle(() => ({ width: `${fill.get() * 100}%` }));
    const sweepStyle = useAnimatedStyle(() => ({ left: `${sweep.get() * 65}%` }));

    const copy = COPY[phase];
    const percent = Math.round(Math.min(Math.max(progress, 0), 1) * 100);

    return <Animated.View
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(150)}
        className="absolute inset-0 items-center justify-center bg-black/55 px-8"
        accessibilityViewIsModal
        accessibilityLiveRegion="polite"
    >
        <Animated.View
            entering={FadeInDown.delay(60).springify().damping(18)}
            className="w-full max-w-sm rounded-[28px] bg-ink p-6 gap-5"
        >
            <View className="flex-row items-center gap-3">
                <View className={`w-11 h-11 rounded-full items-center justify-center ${indeterminate ? "bg-lime" : "bg-white/10"}`}>
                    <SymbolView
                        name={indeterminate ? "sparkles" : "arrow.up.doc"}
                        size={20}
                        tintColor={indeterminate ? colors.ink : colors.white}
                    />
                </View>
                <View className="flex-1">
                    <Text className="text-white text-lg font-semibold">{copy.title}</Text>
                    <Text className="text-white/60 text-sm">{copy.subtitle(pageCount)}</Text>
                </View>
                {!indeterminate && <Text className="text-white/80 text-sm font-semibold" style={{ fontVariant: ["tabular-nums"] }}>
                    {percent}%
                </Text>}
            </View>

            <View className="h-1.5 rounded-full bg-white/15 overflow-hidden">
                {indeterminate
                    ? <Animated.View className="absolute top-0 bottom-0 w-[35%] rounded-full bg-lime" style={sweepStyle} />
                    : <Animated.View className="h-full rounded-full bg-cobalt" style={fillStyle} />}
            </View>
        </Animated.View>
    </Animated.View>;
}
