import { useEffect } from "react";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from "react-native-reanimated";

/**
 * Destello blanco a pantalla completa. Se dispara cada vez que `shots`
 * cambia (número de disparos del obturador).
 */
export function CaptureFlash({ shots }: { shots: number }) {
    const opacity = useSharedValue(0);
    const style = useAnimatedStyle(() => ({ opacity: opacity.get() }));

    useEffect(() => {
        if (shots === 0) return;
        opacity.set(withSequence(withTiming(0.8, { duration: 60 }), withTiming(0, { duration: 260 })));
    }, [shots, opacity]);

    return <Animated.View pointerEvents="none" className="absolute inset-0 bg-white" style={style} />;
}
