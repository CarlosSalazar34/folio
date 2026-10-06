import { Pressable, Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

import { SocialAuthButtons, type AuthProvider } from "@/components/auth/SocialAuthButtons";
import { Button } from "@/components/ui/Button";

type Props = {
    isLast: boolean;
    onNext: () => void;
    onSocial: (provider: AuthProvider) => void;
    onContinueAsGuest: () => void;
};

/**
 * Acciones inferiores: "Siguiente" en las primeras páginas y, en la última,
 * los botones de registro + "Continuar sin cuenta".
 * Altura fija para que el carrusel no cambie de tamaño al llegar al final.
 */
export function OnboardingFooter({ isLast, onNext, onSocial, onContinueAsGuest }: Props) {
    return <View className="h-[236px] justify-end px-6">
        {isLast
            ? <Animated.View key="auth" entering={FadeIn.duration(200)} className="gap-2">
                <SocialAuthButtons onPress={onSocial} />
                <Pressable
                    accessibilityRole="button"
                    onPress={onContinueAsGuest}
                    className="h-12 items-center justify-center active:opacity-60"
                >
                    <Text className="text-graphite text-base font-sans-medium">Continuar sin cuenta</Text>
                </Pressable>
            </Animated.View>
            : <View key="next" className="pb-2">
                <Button title="Siguiente" onPress={onNext} className="h-13" />
            </View>}
    </View>;
}
