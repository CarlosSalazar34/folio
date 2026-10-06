import "@/global.css";
import { BricolageGrotesque_700Bold } from "@expo-google-fonts/bricolage-grotesque";
import { Geist_400Regular, Geist_500Medium, Geist_600SemiBold } from "@expo-google-fonts/geist";
import { GeistMono_400Regular, GeistMono_500Medium } from "@expo-google-fonts/geist-mono";
import { useFonts } from "expo-font";
import { router, Stack, useNavigationContainerRef } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useRef, useState } from "react";

import { getPreference, usePreference } from "@/features/preferences/preferences";
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
  const [onboardingCompleted] = usePreference("onboardingCompleted");
  // Evita presentar el onboarding dos veces (p. ej. efectos duplicados de StrictMode en desarrollo).
  const onboardingPresented = useRef(false);
  const navigationRef = useNavigationContainerRef();
  // Solo la primera presentación (con el splash delante) va sin animación; en cuanto el
  // onboarding está en pantalla se reactiva, para que al cerrarlo sí se vea la transición.
  const [onboardingShown, setOnboardingShown] = useState(false);

  useEffect(() => {
    if (fontError) console.warn("No se pudieron cargar las fuentes", fontError);
  }, [fontError]);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    let frame: number | undefined;
    let fallback: ReturnType<typeof setTimeout> | undefined;
    let unsubscribe: (() => void) | undefined;

    const hideSplash = () => {
      if (cancelled) return;
      // Un frame de margen para que la pantalla visible ya esté pintada.
      frame = requestAnimationFrame(() => { SplashScreen.hideAsync(); });
    };

    if (getPreference("onboardingCompleted")) {
      hideSplash();
    } else {
      // Primer arranque: presentar el onboarding (modal sobre Documentos) con el splash aún visible,
      // y ocultarlo cuando el onboarding ya es la ruta activa, para no mostrar Documentos un instante.
      // Al terminar, el onboarding se descarta y queda Documentos debajo.
      const isOnOnboarding = () => (navigationRef.getCurrentRoute() as { name?: string } | undefined)?.name === "onboarding";
      const present = () => {
        if (cancelled) return;
        // Navegar antes de que el contenedor esté listo lanza un error: reintentar en el siguiente frame.
        if (!navigationRef.isReady()) {
          frame = requestAnimationFrame(present);
          return;
        }
        // Si la app se abrió con un enlace directo a /onboarding, no presentarlo dos veces.
        if (isOnOnboarding()) {
          setOnboardingShown(true);
          hideSplash();
          return;
        }
        unsubscribe = navigationRef.addListener("state", () => {
          if (isOnOnboarding()) {
            setOnboardingShown(true);
            hideSplash();
          }
        });
        // Red de seguridad: no dejar el splash colgado si algo falla.
        fallback = setTimeout(hideSplash, 1500);
        if (!onboardingPresented.current) {
          onboardingPresented.current = true;
          router.push("/onboarding");
        }
      };
      present();
    }

    return () => {
      cancelled = true;
      if (frame != null) cancelAnimationFrame(frame);
      clearTimeout(fallback);
      unsubscribe?.();
    };
  }, [ready, navigationRef]);

  if (!ready) return null;

  return <ScanSessionProvider>
    <Stack screenOptions={{headerShown: false}}>
      <Stack.Screen name="(tabs)"/>
      <Stack.Screen name="escanear" options={{ presentation: "fullScreenModal", animation: "slide_from_bottom", contentStyle: { backgroundColor: "black" } }}/>
      <Stack.Screen name="revisar" options={{ presentation: "fullScreenModal", animation: "slide_from_bottom", contentStyle: { backgroundColor: "#F3F2EE" } }}/>
      <Stack.Screen name="onboarding" options={{ presentation: "fullScreenModal", gestureEnabled: false, animation: onboardingCompleted || onboardingShown ? "fade" : "none", contentStyle: { backgroundColor: "#F3F2EE" } }}/>
      <Stack.Screen name="perfil" options={{ presentation: "modal", headerShown: true, contentStyle: { backgroundColor: "#F3F2EE" } }}/>
    </Stack>
  </ScanSessionProvider>;
}
