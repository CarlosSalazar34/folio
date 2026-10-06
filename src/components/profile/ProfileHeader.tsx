import { SymbolView } from "expo-symbols";
import { Text, View } from "react-native";

import { colors } from "@/constants/colors";

/** Avatar y nombre del perfil de invitado. */
export function ProfileHeader() {
    return <View className="items-center gap-3 py-2">
        <View
            className="w-22 h-22 rounded-full bg-ink items-center justify-center"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
        >
            <SymbolView name="person.fill" size={40} tintColor={colors.paper} />
        </View>
        <View className="items-center gap-1">
            <Text accessibilityRole="header" className="font-display text-[28px] tracking-tight text-ink">Invitado</Text>
            <Text className="font-sans text-[15px] text-graphite">Usas Folio sin cuenta</Text>
        </View>
    </View>;
}
