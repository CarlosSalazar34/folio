import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useState } from "react";
import { Alert, Platform, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PageActions } from "@/components/review/PageActions";
import { PagePreview } from "@/components/review/PagePreview";
import { PageStrip } from "@/components/review/PageStrip";
import { UploadOverlay, type UploadPhase } from "@/components/review/UploadOverlay";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { colors } from "@/constants/colors";
import { prepareForUpload, rotatePage } from "@/features/scan/prepareForUpload";
import { useScanSession } from "@/features/scan/ScanSession";
import { ApiError, uploadDocument } from "@/lib/api";

const MONO = Platform.select({ ios: "Menlo", default: "monospace" });

type UploadState = { phase: UploadPhase; progress: number };

export default function ReviewScreen() {
    const { pages, replacePage, removePage, movePage, reset } = useScanSession();
    const [selected, setSelected] = useState(0);
    const [rotating, setRotating] = useState(false);
    const [enhance, setEnhance] = useState(true);
    const [upload, setUpload] = useState<UploadState | null>(null);

    const current = Math.min(selected, Math.max(pages.length - 1, 0));
    const backToCamera = () => router.back();

    if (pages.length === 0) {
        return <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-paper items-center justify-center px-8 gap-4">
            <SymbolView name="doc.viewfinder" size={40} tintColor={colors.graphite} />
            <Text className="text-ink text-lg font-semibold text-center">No hay páginas para revisar</Text>
            <Button title="Volver a la cámara" onPress={backToCamera} />
        </SafeAreaView>;
    }

    const rotate = async () => {
        if (rotating) return;
        const index = current;
        const uri = pages[index];
        setRotating(true);
        try {
            const rotated = await rotatePage(uri);
            replacePage(index, rotated);
            Haptics.selectionAsync();
        } catch {
            Alert.alert("No se pudo girar la página", "Inténtalo de nuevo.");
        } finally {
            setRotating(false);
        }
    };

    const move = (delta: -1 | 1) => {
        const to = current + delta;
        if (to < 0 || to >= pages.length) return;
        movePage(current, to);
        setSelected(to);
        Haptics.selectionAsync();
    };

    const confirmDelete = () => {
        Alert.alert(
            "¿Borrar esta página?",
            `La página ${current + 1} se quitará del documento.`,
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Borrar",
                    style: "destructive",
                    onPress: () => {
                        const isLast = pages.length === 1;
                        removePage(current);
                        if (isLast) {
                            backToCamera();
                        } else if (current > 0 && current === pages.length - 1) {
                            setSelected(current - 1);
                        }
                    },
                },
            ],
        );
    };

    const save = async () => {
        if (upload || rotating) return;
        const pageUris = pages;
        setUpload({ phase: "preparing", progress: 0 });
        try {
            const prepared = await prepareForUpload(pageUris, (progress) => setUpload({ phase: "preparing", progress }));
            setUpload({ phase: "uploading", progress: 0 });
            const doc = await uploadDocument(
                prepared,
                (progress) => setUpload({ phase: progress >= 1 ? "analyzing" : "uploading", progress }),
                enhance,
            );
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            // Cierra la cámara y esta pantalla, y abre el documento recién creado.
            router.dismissAll();
            router.push(`/documento/${doc.id}`);
            reset();
        } catch (error) {
            setUpload(null);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            const message = error instanceof ApiError && error.status === 0
                ? "Revisa tu conexión a internet e inténtalo de nuevo. Tus páginas siguen aquí."
                : "Ocurrió un problema al procesar el documento. Tus páginas siguen aquí.";
            Alert.alert("No se pudo guardar el documento", message, [
                { text: "Cancelar", style: "cancel" },
                { text: "Reintentar", onPress: () => void save() },
            ]);
        }
    };

    return <View className="flex-1 bg-paper">
        <SafeAreaView edges={["top", "bottom"]} className="flex-1">
            <View className="flex-row items-center justify-between px-4 h-14">
                <IconButton
                    icon="chevron.left"
                    accessibilityLabel="Volver a la cámara"
                    onPress={backToCamera}
                    disabled={!!upload}
                />
                <Text
                    className="text-graphite text-xs tracking-widest"
                    style={{ fontFamily: MONO }}
                    accessibilityLabel={`Página ${current + 1} de ${pages.length}`}
                >
                    PÁGINA {current + 1} / {pages.length}
                </Text>
                <Button
                    title="Guardar"
                    onPress={() => void save()}
                    disabled={rotating || !!upload}
                    accessibilityHint="Sube las páginas y crea el documento"
                />
            </View>

            <View className="flex-1 px-4 pt-2 pb-4">
                <PagePreview uri={pages[current]} busy={rotating} />
            </View>

            <View className="mx-4 mb-4 flex-row items-center gap-3 rounded-2xl bg-white px-4 py-3">
                <View className="w-9 h-9 rounded-full bg-lime items-center justify-center">
                    <SymbolView name="sparkles" size={16} tintColor={colors.ink} />
                </View>
                <View className="flex-1">
                    <Text className="text-ink text-[15px] font-semibold">Mejorar con IA</Text>
                    <Text className="text-graphite text-xs">Endereza, limpia y titula el documento</Text>
                </View>
                <Switch
                    value={enhance}
                    onValueChange={setEnhance}
                    trackColor={{ true: colors.cobalt }}
                    accessibilityLabel="Mejorar con IA"
                />
            </View>

            <PageStrip pages={pages} selected={current} onSelect={setSelected} />

            <View className="pt-4 pb-2">
                <PageActions
                    onRotate={() => void rotate()}
                    onMoveLeft={() => move(-1)}
                    onMoveRight={() => move(1)}
                    onAdd={backToCamera}
                    onDelete={confirmDelete}
                    canMoveLeft={current > 0}
                    canMoveRight={current < pages.length - 1}
                    disabled={rotating}
                />
            </View>
        </SafeAreaView>

        {upload && <UploadOverlay phase={upload.phase} progress={upload.progress} pageCount={pages.length} />}
    </View>;
}
