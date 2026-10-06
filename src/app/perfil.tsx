import { router, Stack } from "expo-router";
import { Alert, ScrollView, Switch } from "react-native";

import { AppInfo } from "@/components/profile/AppInfo";
import { LibraryStatsCard } from "@/components/profile/LibraryStatsCard";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { SettingsRow } from "@/components/profile/SettingsRow";
import { SettingsSection } from "@/components/profile/SettingsSection";
import { SignInCard } from "@/components/profile/SignInCard";
import { colors } from "@/constants/colors";
import { useAuth } from "@/features/auth/AuthContext";
import { usePreference } from "@/features/preferences/preferences";

/** Cierra la hoja; si se abrió por enlace directo no hay historial y va al inicio. */
function close() {
    if (router.canGoBack()) router.back();
    else router.replace("/");
}

export default function ProfileScreen() {
    const [enhance, setEnhance] = usePreference("enhanceByDefault");
    const { user, signOut } = useAuth();

    const confirmSignOut = () => {
        Alert.alert("¿Cerrar sesión?", "Tus documentos seguirán guardados en tu cuenta.", [
            { text: "Cancelar", style: "cancel" },
            { text: "Cerrar sesión", style: "destructive", onPress: () => { void signOut(); } },
        ]);
    };

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
            <ProfileHeader user={user} />
            <LibraryStatsCard key={user?.id ?? "invitado"} />
            {!user && <SignInCard />}

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
                {user
                    ? <SettingsRow
                        icon="rectangle.portrait.and.arrow.right"
                        title="Cerrar sesión"
                        onPress={confirmSignOut}
                    />
                    : <SettingsRow
                        icon="person.crop.circle.badge.plus"
                        title="Iniciar sesión con correo"
                        caption="¿Ya tienes cuenta? Entra para ver tus documentos."
                        accessory="chevron"
                        onPress={() => router.push({ pathname: "/cuenta", params: { modo: "login" } })}
                    />}
            </SettingsSection>
        </ScrollView>
    </>;
}
