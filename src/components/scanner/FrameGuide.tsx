import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function Corner({ className }: { className: string }) {
    return <View className={`absolute w-10 h-10 border-lime ${className}`} />;
}

/** Esquinas lima que indican dónde encuadrar el documento. */
export function FrameGuide() {
    const insets = useSafeAreaInsets();

    return <View
        pointerEvents="none"
        className="absolute inset-x-8"
        style={{ top: insets.top + 84, bottom: insets.bottom + 190 }}
    >
        <Corner className="top-0 left-0 border-t-4 border-l-4 rounded-tl-xl" />
        <Corner className="top-0 right-0 border-t-4 border-r-4 rounded-tr-xl" />
        <Corner className="bottom-0 right-0 border-b-4 border-r-4 rounded-br-xl" />
        <Corner className="bottom-0 left-0 border-b-4 border-l-4 rounded-bl-xl" />
    </View>;
}
