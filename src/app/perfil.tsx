import { router, Stack } from "expo-router";
import { ScrollView, Switch } from "react-native";

import { AppInfo } from "@/components/profile/AppInfo";
import { LibraryStatsCard } from "@/components/profile/LibraryStatsCard";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { SettingsRow } from "@/components/profile/SettingsRow";
import { SettingsSection } from "@/components/profile/SettingsSection";
import { SignInCard } from "@/components/profile/SignInCard";
import { colors } from "@/constants/colors";
import { usePreference } from "@/features/preferences/preferences";

/** Cierra la hoja; si se abrió por enlace directo no hay historial y va al inicio. */
function close() {
    if (router.canGoBack()) router.back();
    else router.replace("/");
}

export default function ProfileScreen() {
    const [enhance, setEnhance] = usePreference("enhanceByDefault");

    return <>
        <Stack.Title>Perfil</Stack.Title>
        <Stack.Toolbar placement="right">
            <Stack.Toolbar.Button variant="done" onPress={close}>Listo</Stack.Toolbar.Button>
        </Stack.Toolbar>
        <ScrollView
            className="flex-1 bg-paper"
            contentInsetAdjustmentBehavior="automatic"
            contentContainerClassName="px-4 pt-4 pb-12 gap-7"
        >
            <ProfileHeader />
            <LibraryStatsCard />
            <SignInCard />

            <SettingsSection title="Escaneo">
                <SettingsRow
                    icon="wand.and.stars"
                    iconBackground={colors.cobalt}
                    title="Mejorar imágenes con IA"
                    caption="Endereza y limpia las páginas antes de transcribirlas."
                    accessory={<Switch
                        value={enhance}
                        onValueChange={setEnhance}
                        trackColor={{ true: colors.cobalt }}
                        accessibilityLabel="Mejorar imágenes con IA"
                    />}
                />
            </SettingsSection>

            <AppInfo />

            <SettingsSection title="Cuenta">
                <SettingsRow
                    icon="rectangle.portrait.and.arrow.right"
                    title="Cerrar sesión"
                    caption="Disponible cuando inicies sesión"
                    disabled
                />
            </SettingsSection>
        </ScrollView>
    </>;
}
