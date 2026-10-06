import type { ReactNode } from "react";
import { View } from "react-native";
import Animated, { Extrapolation, FadeInDown, interpolate, useAnimatedStyle, ZoomIn, type SharedValue } from "react-native-reanimated";

type Props = {
    index: number;
    width: number;
    /** Alto del carrusel; los hijos de un ScrollView horizontal no lo heredan con flex. */
    height: number;
    scrollX: SharedValue<number>;
    /** Página visible: las demás se ocultan a los lectores de pantalla. */
    active: boolean;
    /** Nº de veces que se ha llegado a esta página; al cambiar, se repiten las animaciones de entrada. */
    visit: number;
    illustration: ReactNode;
    /** Título del slide; si se omite, se muestra solo `header` (p. ej. el logotipo). */
    title?: string;
    header?: ReactNode;
    body: string;
};

const enter = (delay: number) => FadeInDown.delay(delay).springify().damping(18);

/** Una página del onboarding: ilustración arriba y texto abajo, con parallax al deslizar. */
export function OnboardingSlide({ index, width, height, scrollX, active, visit, illustration, title, header, body }: Props) {
    // En pantallas bajas (iPhone SE) la ilustración se escala para dejar sitio al texto.
    const fit = height > 0 ? Math.min(1, Math.max(0.55, (height - 190) / 330)) : 1;
    const range = [(index - 1) * width, index * width, (index + 1) * width];

    const illustrationStyle = useAnimatedStyle(() => {
        const x = scrollX.get();
        return {
            opacity: interpolate(x, range, [0.4, 1, 0.4], Extrapolation.CLAMP),
            transform: [
                { translateX: interpolate(x, range, [width * 0.25, 0, -width * 0.25], Extrapolation.CLAMP) },
                { scale: interpolate(x, range, [0.85, 1, 0.85], Extrapolation.CLAMP) },
            ],
        };
    });

    const textStyle = useAnimatedStyle(() => {
        const x = scrollX.get();
        return {
            opacity: interpolate(x, range, [0, 1, 0], Extrapolation.CLAMP),
            transform: [{ translateX: interpolate(x, range, [width * 0.12, 0, -width * 0.12], Extrapolation.CLAMP) }],
        };
    });

    return <View
        style={{ width, height }}
        className="px-8"
        accessibilityElementsHidden={!active}
        importantForAccessibility={active ? "auto" : "no-hide-descendants"}
    >
        <Animated.View style={illustrationStyle} className="flex-1 items-center justify-center">
            <View style={{ transform: [{ scale: fit }] }}>
                <Animated.View key={visit} entering={ZoomIn.springify().damping(15)}>
                    {illustration}
                </Animated.View>
            </View>
        </Animated.View>
        <Animated.View key={visit} style={textStyle} className="gap-3 pb-6">
            {header && <Animated.View entering={enter(120)}>{header}</Animated.View>}
            {title && <Animated.Text
                entering={enter(120)}
                accessibilityRole="header"
                className="text-ink text-[34px] leading-[38px] font-display tracking-tight"
            >
                {title}
            </Animated.Text>}
            <Animated.Text entering={enter(200)} className="text-graphite text-[17px] leading-6 font-sans">
                {body}
            </Animated.Text>
        </Animated.View>
    </View>;
}
