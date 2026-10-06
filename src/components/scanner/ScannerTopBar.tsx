import Animated, { FadeInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { IconButton } from "@/components/ui/IconButton";
import { colors } from "@/constants/colors";

type Props = {
    torch: boolean;
    onToggleTorch: () => void;
    onClose: () => void;
};

/** Barra superior del escáner: cerrar y linterna. */
export function ScannerTopBar({ torch, onToggleTorch, onClose }: Props) {
    const insets = useSafeAreaInsets();

    return <Animated.View
        entering={FadeInUp.delay(150).springify().damping(18)}
        className="absolute inset-x-0 px-4 flex-row items-center justify-between"
        style={{ top: insets.top + 8 }}
    >
        <IconButton
            icon="xmark"
            accessibilityLabel="Cerrar"
            tintColor={colors.white}
            className="bg-black/50"
            onPress={onClose}
        />
        <IconButton
            icon={torch ? "flashlight.on.fill" : "flashlight.off.fill"}
            accessibilityLabel={torch ? "Apagar linterna" : "Encender linterna"}
            accessibilityState={{ selected: torch }}
            tintColor={torch ? colors.ink : colors.white}
            className={torch ? "bg-lime" : "bg-black/50"}
            onPress={onToggleTorch}
        />
    </Animated.View>;
}
