import { View } from "react-native";
import Animated, { ZoomIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function Corner({ className, delay }: { className: string; delay: number }) {
    return <Animated.View
        entering={ZoomIn.delay(delay).springify().damping(14)}
        className={`absolute w-10 h-10 border-lime ${className}`}
    />;
}

/** Esquinas lima que indican dónde encuadrar el documento. */
export function FrameGuide() {
    const insets = useSafeAreaInsets();

    return <View
        pointerEvents="none"
        className="absolute inset-x-8"
        style={{ top: insets.top + 84, bottom: insets.bottom + 190 }}
    >
        <Corner delay={250} className="top-0 left-0 border-t-4 border-l-4 rounded-tl-xl" />
        <Corner delay={300} className="top-0 right-0 border-t-4 border-r-4 rounded-tr-xl" />
        <Corner delay={350} className="bottom-0 right-0 border-b-4 border-r-4 rounded-br-xl" />
        <Corner delay={400} className="bottom-0 left-0 border-b-4 border-l-4 rounded-bl-xl" />
    </View>;
}
