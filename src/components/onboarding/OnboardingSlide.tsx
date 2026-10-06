import type { ReactNode } from "react";
import { Text, View } from "react-native";

type Props = {
    width: number;
    /** Alto del carrusel; los hijos de un ScrollView horizontal no lo heredan con flex. */
    height: number;
    /** Página visible: las demás se ocultan a los lectores de pantalla. */
    active: boolean;
    illustration: ReactNode;
    /** Título del slide; si se omite, se muestra solo `header` (p. ej. el logotipo). */
    title?: string;
    header?: ReactNode;
    body: string;
};

/** Una página del onboarding: ilustración arriba y texto abajo. */
export function OnboardingSlide({ width, height, active, illustration, title, header, body }: Props) {
    // En pantallas bajas (iPhone SE) la ilustración se escala para dejar sitio al texto.
    const fit = height > 0 ? Math.min(1, Math.max(0.55, (height - 190) / 330)) : 1;

    return <View
        style={{ width, height }}
        className="px-8"
        accessibilityElementsHidden={!active}
        importantForAccessibility={active ? "auto" : "no-hide-descendants"}
    >
        <View className="flex-1 items-center justify-center">
            <View style={{ transform: [{ scale: fit }] }}>{illustration}</View>
        </View>
        <View className="gap-3 pb-6">
            {header}
            {title && <Text
                accessibilityRole="header"
                className="text-ink text-[32px] leading-[36px] font-display tracking-tight"
            >
                {title}
            </Text>}
            <Text className="text-graphite text-[17px] leading-6 font-sans">{body}</Text>
        </View>
    </View>;
}
