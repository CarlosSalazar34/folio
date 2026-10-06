// Provisional: lo implementa la unidad "Onboarding".
import { router } from "expo-router";
import { Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { setPreference } from "@/features/preferences/preferences";

export default function OnboardingScreen() {
    return <View className="flex-1 items-center justify-center gap-4 bg-paper">
        <Text className="text-ink">Bienvenido a Folio</Text>
        <Button title="Empezar" onPress={() => { setPreference("onboardingCompleted", true); router.back(); }} />
    </View>;
}
