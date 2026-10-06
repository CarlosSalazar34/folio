import "@/global.css";
import { BricolageGrotesque_700Bold } from "@expo-google-fonts/bricolage-grotesque";
import { Geist_400Regular, Geist_500Medium, Geist_600SemiBold } from "@expo-google-fonts/geist";
import { GeistMono_400Regular, GeistMono_500Medium } from "@expo-google-fonts/geist-mono";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";

import { ScanSessionProvider } from "@/features/scan/ScanSession";

// Mantener el splash visible hasta que las fuentes estén listas.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    BricolageGrotesque_700Bold,
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
    GeistMono_400Regular,
    GeistMono_500Medium,
  });
  const ready = fontsLoaded || fontError != null;

  useEffect(() => {
    if (fontError) console.warn("No se pudieron cargar las fuentes", fontError);
  }, [fontError]);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return <ScanSessionProvider>
    <Stack screenOptions={{headerShown: false}}>
      <Stack.Screen name="(tabs)"/>
      <Stack.Screen name="escanear" options={{ presentation: "fullScreenModal", animation: "slide_from_bottom", contentStyle: { backgroundColor: "black" } }}/>
      <Stack.Screen name="revisar" options={{ presentation: "fullScreenModal", animation: "slide_from_bottom", contentStyle: { backgroundColor: "#F3F2EE" } }}/>
    </Stack>
  </ScanSessionProvider>;
}
