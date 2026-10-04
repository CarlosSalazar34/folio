import { NativeTabs } from "expo-router/unstable-native-tabs"

export default function TabLayout() {
    return <NativeTabs>
        <NativeTabs.Trigger name="(home)">
            <NativeTabs.Trigger.Label>Documentos</NativeTabs.Trigger.Label>
            <NativeTabs.Trigger.Icon sf="doc.fill" md="description" />
        </NativeTabs.Trigger>
    </NativeTabs>
}