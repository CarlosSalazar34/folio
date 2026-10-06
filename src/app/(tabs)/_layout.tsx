import { router } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs"

import { colors } from "@/constants/colors";

export default function TabLayout() {
    return <NativeTabs
        tintColor={colors.cobalt}
        iconColor={{ selected: colors.cobalt }}
        labelStyle={{ selected: { color: colors.cobalt } }}
    >
        <NativeTabs.Trigger name="(home)">
            <NativeTabs.Trigger.Label>Documentos</NativeTabs.Trigger.Label>
            <NativeTabs.Trigger.Icon sf="doc.fill" md="description" />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger
            role="search"
            name="nuevo"
            disabled
            listeners={{ tabPress: () => router.push("/escanear") }}
        >
            <NativeTabs.Trigger.Label>Escanear</NativeTabs.Trigger.Label>
            <NativeTabs.Trigger.Icon sf="camera.aperture" md="document_scanner"/>
        </NativeTabs.Trigger>
    </NativeTabs>
}
