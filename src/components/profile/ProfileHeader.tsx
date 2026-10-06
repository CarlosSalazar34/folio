import { SymbolView } from "expo-symbols";
import { Text, View } from "react-native";

import { colors } from "@/constants/colors";
import type { User } from "@/lib/types";

/** Avatar y nombre: la cuenta si hay sesión, o "Invitado". */
export function ProfileHeader({ user }: { user: User | null }) {
    const initial = (user?.name || user?.email || "").trim().charAt(0).toUpperCase();
    return <View className="items-center gap-3 py-2">
        <View
            className="w-22 h-22 rounded-full bg-ink items-center justify-center"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
        >
            {user && initial
                ? <Text className="font-display text-[36px] text-paper">{initial}</Text>
                : <SymbolView name="person.fill" size={40} tintColor={colors.paper} />}
        </View>
        <View className="items-center gap-1">
            <Text accessibilityRole="header" className="font-display text-[28px] tracking-tight text-ink">
                {user ? user.name || "Tu cuenta" : "Invitado"}
            </Text>
            <Text className="font-sans text-[15px] text-graphite">{user ? user.email : "Usas Folio sin cuenta"}</Text>
        </View>
    </View>;
}
