import type { PermissionResponse } from "expo-camera";
import { SymbolView } from "expo-symbols";
import { Linking, Pressable, Text, View } from "react-native";

import { colors } from "@/constants/colors";

type Props = {
    permission: PermissionResponse;
    onRequest: () => void;
    onClose: () => void;
};

/** Pantalla que pide el permiso de cámara (o manda a Ajustes si ya se negó). */
export function PermissionPrompt({ permission, onRequest, onClose }: Props) {
    return <View className="flex-1 bg-black items-center justify-center px-8 gap-4">
        <SymbolView name="camera.fill" size={44} tintColor={colors.lime} />
        <Text className="text-white text-2xl font-bold text-center">
            Folio necesita tu cámara
        </Text>
        <Text className="text-white/70 text-base text-center">
            La usamos solo para escanear tus documentos.
        </Text>
        <View>
            <Pressable
                accessibilityRole="button"
                onPress={permission.canAskAgain ? onRequest : () => Linking.openSettings()}
                className="mt-2 h-12 px-6 rounded-full bg-cobalt items-center justify-center active:opacity-80"
            >
                <Text className="text-white text-base font-semibold">
                    {permission.canAskAgain ? "Permitir cámara" : "Abrir Ajustes"}
                </Text>
            </Pressable>
        </View>
        <Pressable accessibilityRole="button" onPress={onClose} className="h-12 px-6 items-center justify-center">
            <Text className="text-white/70 text-base">Ahora no</Text>
        </Pressable>
    </View>;
}
