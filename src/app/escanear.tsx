import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import { router, useIsFocused } from "expo-router";
import { useRef, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CaptureFlash } from "@/components/scanner/CaptureFlash";
import { FrameGuide } from "@/components/scanner/FrameGuide";
import { PageStack } from "@/components/scanner/PageStack";
import { PermissionPrompt } from "@/components/scanner/PermissionPrompt";
import { ScannerTopBar } from "@/components/scanner/ScannerTopBar";
import { ShutterButton } from "@/components/scanner/ShutterButton";
import { useScanSession } from "@/features/scan/ScanSession";

const pagesLabel = (n: number) => `${n} ${n === 1 ? "página" : "páginas"}`;

export default function ScanScreen() {
    const insets = useSafeAreaInsets();
    const isFocused = useIsFocused();
    const cameraRef = useRef<CameraView>(null);
    const [permission, requestPermission] = useCameraPermissions();
    const { pages, addPage, reset } = useScanSession();
    const [torch, setTorch] = useState(false);
    const [ready, setReady] = useState(false);
    const [capturing, setCapturing] = useState(false);
    const [shots, setShots] = useState(0);

    // La cámara se desmonta al perder el foco (p. ej. al ir a revisar); al
    // volver hay que esperar a que esté lista otra vez antes de disparar.
    const [wasFocused, setWasFocused] = useState(isFocused);
    if (wasFocused !== isFocused) {
        setWasFocused(isFocused);
        if (!isFocused) setReady(false);
    }

    const close = () => {
        if (pages.length === 0) {
            router.back();
            return;
        }
        Alert.alert(
            `¿Descartar ${pagesLabel(pages.length)}?`,
            "Las páginas escaneadas se perderán.",
            [
                { text: "Seguir escaneando", style: "cancel" },
                {
                    text: "Descartar",
                    style: "destructive",
                    onPress: () => {
                        reset();
                        router.back();
                    },
                },
            ],
        );
    };

    const capture = async () => {
        if (!cameraRef.current || !ready || capturing) return;
        setCapturing(true);
        setShots((s) => s + 1);
        try {
            const photo = await cameraRef.current.takePictureAsync({ quality: 0.9 });
            addPage(photo.uri);
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } finally {
            setCapturing(false);
        }
    };

    if (!permission) {
        return <View className="flex-1 bg-black" />;
    }

    if (!permission.granted) {
        return <PermissionPrompt permission={permission} onRequest={requestPermission} onClose={close} />;
    }

    return <View className="flex-1 bg-black">
        {isFocused && <Animated.View entering={FadeIn.duration(250)} style={{ flex: 1 }}>
            <CameraView
                ref={cameraRef}
                style={{ flex: 1 }}
                facing="back"
                enableTorch={torch}
                onCameraReady={() => setReady(true)}
            />
        </Animated.View>}

        <CaptureFlash shots={shots} />
        <FrameGuide />
        <ScannerTopBar torch={torch} onToggleTorch={() => setTorch((t) => !t)} onClose={close} />

        {/* Controles inferiores */}
        <Animated.View
            className="absolute inset-x-0 bottom-0 bg-black/60 pt-4 gap-4"
            style={{ paddingBottom: insets.bottom + 16 }}
        >
            <Text className="text-white/80 text-sm text-center">
                {pages.length === 0
                    ? "Encuadra el documento dentro de las esquinas"
                    : `${pagesLabel(pages.length)} · sigue escaneando o pulsa Listo`}
            </Text>
            <View className="flex-row items-center justify-between px-7">
                <PageStack pages={pages} />

                <ShutterButton onPress={capture} disabled={!ready || capturing} dimmed={!ready} />

                <View className="w-16 h-11">
                    {pages.length > 0 && <Animated.View entering={FadeIn.duration(180)}>
                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`Listo, revisar ${pagesLabel(pages.length)}`}
                            onPress={() => router.push("/revisar")}
                            className="w-16 h-11 rounded-full bg-cobalt items-center justify-center active:opacity-80"
                        >
                            <Text className="text-white text-base font-semibold">Listo</Text>
                        </Pressable>
                    </Animated.View>}
                </View>
            </View>
        </Animated.View>
    </View>;
}
