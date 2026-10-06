import * as Haptics from "expo-haptics";
import { Pressable, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

type Props = {
    onPress: () => void;
    disabled?: boolean;
    /** Se muestra atenuado mientras la cámara no está lista. */
    dimmed?: boolean;
};

/** Obturador blanco con rebote al pulsar y vibración ligera. */
export function ShutterButton({ onPress, disabled = false, dimmed = false }: Props) {
    const scale = useSharedValue(1);
    const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

    return <Animated.View style={style}>
        <Pressable
            accessibilityRole="button"
            accessibilityLabel="Capturar página"
            accessibilityState={{ disabled }}
            disabled={disabled}
            onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onPress();
            }}
            onPressIn={() => { scale.set(withSpring(0.88, { damping: 15 })); }}
            onPressOut={() => { scale.set(withSpring(1, { damping: 10 })); }}
            className={`w-20 h-20 rounded-full border-4 border-white p-1 ${dimmed ? "opacity-50" : ""}`}
        >
            <View className="flex-1 rounded-full bg-white" />
        </Pressable>
    </Animated.View>;
}
