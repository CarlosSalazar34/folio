// Pantalla provisional: la implementa la unidad "Detalle del documento".
import { useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";

export default function DocumentScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    return <View className="flex-1 items-center justify-center bg-paper">
        <Text className="text-ink">Documento {id}</Text>
    </View>;
}
