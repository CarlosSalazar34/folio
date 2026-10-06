import { Image } from "expo-image";
import { Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

/** Miniatura de la última página capturada con el número total de páginas. */
export function PageStack({ pages }: { pages: string[] }) {
    const count = pages.length;

    return <View className="w-16 h-16 justify-center">
        {count > 0 && <Animated.View key={count} entering={FadeIn.duration(180)}>
            <Image
                source={{ uri: pages.at(-1) }}
                style={{ width: 48, height: 64, borderRadius: 6 }}
                contentFit="cover"
                accessibilityLabel={`Última página escaneada, ${count} ${count === 1 ? "página" : "páginas"} en total`}
            />
            <View className="absolute -top-2 -right-1 min-w-6 h-6 px-1 rounded-full bg-cobalt items-center justify-center">
                <Text className="text-white text-xs font-semibold">{count}</Text>
            </View>
        </Animated.View>}
    </View>;
}
