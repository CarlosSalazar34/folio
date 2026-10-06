import { Text, View } from "react-native";

import { SocialAuthButtons } from "@/components/auth/SocialAuthButtons";

/** Invitación a crear una cuenta (el inicio de sesión real llegará más adelante). */
export function SignInCard() {
    return <View className="bg-white rounded-2xl p-5 gap-4" style={{ borderCurve: "continuous" }}>
        <View className="gap-1">
            <Text accessibilityRole="header" className="font-sans-semibold text-[17px] text-ink">Crea tu cuenta</Text>
            <Text className="font-sans text-[15px] leading-5 text-graphite">
                Guarda y sincroniza tus documentos en todos tus dispositivos.
            </Text>
        </View>
        <SocialAuthButtons />
    </View>;
}
