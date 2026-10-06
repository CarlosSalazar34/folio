import { Image } from "expo-image";
import { SymbolView } from "expo-symbols";
import { Alert, Pressable, Text, View } from "react-native";

import { colors } from "@/constants/colors";

export type AuthProvider = "apple" | "google" | "email";

export const AUTH_PROVIDER_LABELS: Record<AuthProvider, string> = {
    apple: "Apple",
    google: "Google",
    email: "correo",
};

type Props = {
    /** Por defecto muestra "Próximamente": el inicio de sesión real llegará más adelante. */
    onPress?: (provider: AuthProvider) => void;
};

function comingSoon() {
    Alert.alert("Próximamente", "El inicio de sesión llegará pronto. Por ahora puedes usar Folio sin cuenta.");
}

export function SocialAuthButtons({ onPress }: Props) {
    const press = (provider: AuthProvider) => (onPress ? onPress(provider) : comingSoon());

    return <View className="gap-3 w-full">
        <Pressable
            accessibilityRole="button"
            onPress={() => press("apple")}
            className="h-13 rounded-full bg-black flex-row items-center justify-center gap-2 active:opacity-80"
        >
            <SymbolView name="apple.logo" size={18} tintColor={colors.white} />
            <Text className="text-white text-base font-sans-semibold">Continuar con Apple</Text>
        </Pressable>
        <Pressable
            accessibilityRole="button"
            onPress={() => press("google")}
            className="h-13 rounded-full bg-white border border-[#D9D7D0] flex-row items-center justify-center gap-2 active:opacity-80"
        >
            <Image source={require("@/assets/images/google-g.svg")} style={{ width: 18, height: 18 }} contentFit="contain" accessibilityIgnoresInvertColors />
            <Text className="text-ink text-base font-sans-semibold">Continuar con Google</Text>
        </Pressable>
        <Pressable
            accessibilityRole="button"
            onPress={() => press("email")}
            className="h-13 rounded-full bg-white border border-[#D9D7D0] flex-row items-center justify-center gap-2 active:opacity-80"
        >
            <SymbolView name="envelope.fill" size={17} tintColor={colors.ink} />
            <Text className="text-ink text-base font-sans-semibold">Crear cuenta con correo</Text>
        </Pressable>
    </View>;
}
