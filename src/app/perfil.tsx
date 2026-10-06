// Provisional: lo implementa la unidad "Perfil".
import { Text, View } from "react-native";

import { LibraryStatsCard } from "@/components/profile/LibraryStatsCard";

export default function ProfileScreen() {
    return <View className="flex-1 items-center justify-center bg-paper">
        <Text className="text-ink">Perfil</Text>
        <LibraryStatsCard />
    </View>;
}
