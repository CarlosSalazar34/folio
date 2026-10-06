import "@/global.css";
import { Stack } from "expo-router";

import { ScanSessionProvider } from "@/features/scan/ScanSession";

export default function RootLayout() {
  return <ScanSessionProvider>
    <Stack screenOptions={{headerShown: false}}>
      <Stack.Screen name="(tabs)"/>
      <Stack.Screen name="escanear" options={{ presentation: "fullScreenModal", animation: "slide_from_bottom", contentStyle: { backgroundColor: "black" } }}/>
      <Stack.Screen name="revisar" options={{ presentation: "fullScreenModal", animation: "slide_from_bottom", contentStyle: { backgroundColor: "#F3F2EE" } }}/>
    </Stack>
  </ScanSessionProvider>;
}
