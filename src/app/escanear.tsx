import { CameraView, useCameraPermissions } from "expo-camera";
import { Image } from "expo-image";
import { router, useIsFocused } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useRef, useState } from "react";
import { Linking, Pressable, Text, View } from "react-native";
import Animated, {
    FadeIn,
    FadeInDown,
    FadeInUp,
    useAnimatedStyle,
    useSharedValue,
    withSequence,
    withSpring,
    withTiming,
    ZoomIn,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const LIME = "#C6F432";
const enterSpring = (delay: number) => FadeInDown.delay(delay).springify().damping(18);

function Corner({ className, delay }: { className: string; delay: number }) {
    return <Animated.View entering={ZoomIn.delay(delay).springify().damping(14)} className={`absolute w-10 h-10 border-lime ${className}`} />;
}

export default function ScanScreen(){
    const insets = useSafeAreaInsets();
    const isFocused = useIsFocused();
    const cameraRef = useRef<CameraView>(null);
    const [permission, requestPermission] = useCameraPermissions();
    const [torch, setTorch] = useState(false);
    const [ready, setReady] = useState(false);
    const [capturing, setCapturing] = useState(false);
    const [pages, setPages] = useState<string[]>([]);

    const flash = useSharedValue(0);
    const shutterScale = useSharedValue(1);
    const flashStyle = useAnimatedStyle(() => ({ opacity: flash.get() }));
    const shutterStyle = useAnimatedStyle(() => ({ transform: [{ scale: shutterScale.get() }] }));

    const close = () => router.back();

    const capture = async () => {
        if (!cameraRef.current || !ready || capturing) return;
        setCapturing(true);
        flash.set(withSequence(withTiming(0.8, { duration: 60 }), withTiming(0, { duration: 260 })));
        try {
            const photo = await cameraRef.current.takePictureAsync({ quality: 0.9 });
            setPages((p) => [...p, photo.uri]);
        } finally {
            setCapturing(false);
        }
    };

    if (!permission) {
        return <View className="flex-1 bg-black" />;
    }

    if (!permission.granted) {
        return <View className="flex-1 bg-black items-center justify-center px-8 gap-4">
            <Animated.View entering={ZoomIn.springify().damping(14)}>
                <SymbolView name="camera.fill" size={44} tintColor={LIME} />
            </Animated.View>
            <Animated.Text entering={enterSpring(80)} className="text-white text-2xl font-bold text-center">Folio necesita tu cámara</Animated.Text>
            <Animated.Text entering={enterSpring(140)} className="text-white/70 text-base text-center">La usamos solo para escanear tus documentos.</Animated.Text>
            <Animated.View entering={enterSpring(200)}>
                <Pressable
                    accessibilityRole="button"
                    onPress={permission.canAskAgain ? requestPermission : () => Linking.openSettings()}
                    className="mt-2 h-12 px-6 rounded-full bg-cobalt items-center justify-center"
                >
                    <Text className="text-white text-base font-semibold">
                        {permission.canAskAgain ? "Permitir cámara" : "Abrir Ajustes"}
                    </Text>
                </Pressable>
            </Animated.View>
            <Pressable accessibilityRole="button" onPress={close} className="h-12 px-6 items-center justify-center">
                <Text className="text-white/70 text-base">Ahora no</Text>
            </Pressable>
        </View>;
    }

    return <View className="flex-1 bg-black">
        {isFocused && <Animated.View entering={FadeIn.duration(450)} style={{ flex: 1 }}>
            <CameraView
                ref={cameraRef}
                style={{ flex: 1 }}
                facing="back"
                enableTorch={torch}
                onCameraReady={() => setReady(true)}
            />
        </Animated.View>}

        {/* Destello al capturar */}
        <Animated.View pointerEvents="none" className="absolute inset-0 bg-white" style={flashStyle} />

        {/* Guía de encuadre */}
        <View pointerEvents="none" className="absolute inset-x-8" style={{ top: insets.top + 84, bottom: insets.bottom + 190 }}>
            <Corner delay={250} className="top-0 left-0 border-t-4 border-l-4 rounded-tl-xl" />
            <Corner delay={300} className="top-0 right-0 border-t-4 border-r-4 rounded-tr-xl" />
            <Corner delay={350} className="bottom-0 right-0 border-b-4 border-r-4 rounded-br-xl" />
            <Corner delay={400} className="bottom-0 left-0 border-b-4 border-l-4 rounded-bl-xl" />
        </View>

        {/* Barra superior */}
        <Animated.View entering={FadeInUp.delay(150).springify().damping(18)} className="absolute inset-x-0 px-4 flex-row items-center justify-between" style={{ top: insets.top + 8 }}>
            <Pressable accessibilityRole="button" accessibilityLabel="Cerrar" onPress={close} className="w-11 h-11 rounded-full bg-black/50 items-center justify-center">
                <SymbolView name="xmark" size={18} tintColor="white" />
            </Pressable>
            <Pressable
                accessibilityRole="button"
                accessibilityLabel={torch ? "Apagar linterna" : "Encender linterna"}
                accessibilityState={{ selected: torch }}
                onPress={() => setTorch((t) => !t)}
                className={`w-11 h-11 rounded-full items-center justify-center ${torch ? "bg-lime" : "bg-black/50"}`}
            >
                <SymbolView name={torch ? "flashlight.on.fill" : "flashlight.off.fill"} size={18} tintColor={torch ? "#121212" : "white"} />
            </Pressable>
        </Animated.View>

        {/* Controles inferiores */}
        <Animated.View entering={enterSpring(200)} className="absolute inset-x-0 bottom-0 bg-black/60 pt-4 gap-4" style={{ paddingBottom: insets.bottom + 16 }}>
            <Text className="text-white/80 text-sm text-center">
                {pages.length === 0 ? "Encuadra el documento dentro de las esquinas" : `${pages.length} ${pages.length === 1 ? "página" : "páginas"} · sigue escaneando o pulsa Listo`}
            </Text>
            <View className="flex-row items-center justify-between px-7">
                <View className="w-16 h-16 justify-center">
                    {pages.length > 0 && <Animated.View key={pages.length} entering={ZoomIn.springify().damping(12)}>
                        <Image source={{ uri: pages.at(-1) }} style={{ width: 48, height: 64, borderRadius: 6 }} contentFit="cover" accessibilityLabel="Última página escaneada" />
                        <View className="absolute -top-2 -right-1 min-w-6 h-6 px-1 rounded-full bg-cobalt items-center justify-center">
                            <Text className="text-white text-xs font-semibold">{pages.length}</Text>
                        </View>
                    </Animated.View>}
                </View>

                <Animated.View style={shutterStyle}>
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Capturar página"
                        disabled={!ready || capturing}
                        onPress={capture}
                        onPressIn={() => { shutterScale.set(withSpring(0.88, { damping: 15 })); }}
                        onPressOut={() => { shutterScale.set(withSpring(1, { damping: 10 })); }}
                        className={`w-20 h-20 rounded-full border-4 border-white p-1 ${!ready ? "opacity-50" : ""}`}
                    >
                        <View className="flex-1 rounded-full bg-white" />
                    </Pressable>
                </Animated.View>

                <View className="w-16 h-11">
                    {pages.length > 0 && <Animated.View entering={ZoomIn.springify().damping(14)}>
                        <Pressable accessibilityRole="button" onPress={close} className="w-16 h-11 rounded-full bg-cobalt items-center justify-center">
                            <Text className="text-white text-base font-semibold">Listo</Text>
                        </Pressable>
                    </Animated.View>}
                </View>
            </View>
        </Animated.View>
    </View>
}
