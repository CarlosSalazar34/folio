import { router } from "expo-router";
import { useRef, useState } from "react";
import { AccessibilityInfo, Alert, Pressable, Text, useWindowDimensions, View } from "react-native";
import Animated, { FadeIn, FadeOut, useAnimatedRef, useAnimatedScrollHandler, useSharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";

import type { AuthProvider } from "@/components/auth/SocialAuthButtons";
import { OnboardingFooter } from "@/components/onboarding/OnboardingFooter";
import { OnboardingSlide } from "@/components/onboarding/OnboardingSlide";
import { PageDots } from "@/components/onboarding/PageDots";
import { SlideIllustration, type IllustrationKind } from "@/components/onboarding/SlideIllustration";
import { setPreference } from "@/features/preferences/preferences";

type Slide = { kind: IllustrationKind; title?: string; body: string };

const SLIDES: Slide[] = [
    { kind: "brand", body: "Todo tu papel, en orden." },
    {
        kind: "scan",
        title: "Escanea en segundos",
        body: "Apunta la cámara a cualquier documento. Folio lo encuadra, lo endereza y lo deja nítido.",
    },
    {
        kind: "ocr",
        title: "La IA lo pasa a texto",
        body: "Cada página se convierte en texto que puedes leer, copiar y editar. Sin teclear nada.",
    },
    {
        kind: "share",
        title: "Encuéntralo y compártelo",
        body: "Busca por cualquier palabra del documento y compártelo como PDF o como texto.",
    },
];

function Wordmark() {
    return <Text accessibilityRole="header" className="text-ink text-[56px] leading-[60px] font-display tracking-tighter">
        folio
    </Text>;
}

export default function OnboardingScreen() {
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();
    const scrollRef = useAnimatedRef<Animated.ScrollView>();
    const scrollX = useSharedValue(0);
    const lastPage = useSharedValue(0);
    const [page, setPage] = useState(0);
    const [pagerHeight, setPagerHeight] = useState(0);
    // Cuenta las visitas a cada página para repetir sus animaciones de entrada.
    const [visits, setVisits] = useState<number[]>(() => SLIDES.map((_, i) => (i === 0 ? 1 : 0)));
    const finished = useRef(false);

    const isLast = page === SLIDES.length - 1;

    const onPageChange = (next: number) => {
        setPage(next);
        setVisits((v) => v.map((n, i) => (i === next ? n + 1 : n)));
        AccessibilityInfo.announceForAccessibility(`Página ${next + 1} de ${SLIDES.length}`);
    };

    const scrollHandler = useAnimatedScrollHandler({
        onScroll: (event) => {
            scrollX.set(event.contentOffset.x);
            if (width <= 0) return;
            const next = Math.min(SLIDES.length - 1, Math.max(0, Math.round(event.contentOffset.x / width)));
            if (next !== lastPage.get()) {
                lastPage.set(next);
                scheduleOnRN(onPageChange, next);
            }
        },
    });

    const finish = () => {
        if (finished.current) return;
        finished.current = true;
        setPreference("onboardingCompleted", true);
        if (router.canDismiss()) router.dismiss();
        else router.replace("/");
    };

    const goNext = () => {
        if (width <= 0) return;
        // Se calcula desde el desplazamiento real (no desde `page`) para que
        // dos toques rápidos avancen dos páginas aunque la animación no haya acabado.
        const current = Math.max(0, Math.ceil(scrollX.get() / width - 0.05));
        const next = Math.min(current + 1, SLIDES.length - 1);
        scrollRef.current?.scrollTo({ x: next * width, animated: true });
    };

    const onSocial = (provider: AuthProvider) => {
        Alert.alert(
            "Próximamente",
            `El inicio de sesión con ${provider === "apple" ? "Apple" : "Google"} llegará pronto. Por ahora puedes usar Folio sin cuenta.`,
            [{ text: "Continuar sin cuenta", onPress: finish }],
        );
    };

    return <View className="flex-1 bg-paper" style={{ paddingTop: insets.top, paddingBottom: insets.bottom + 8 }}>
        <View className="h-12 px-4 flex-row items-center justify-end">
            {!isLast && <Animated.View entering={FadeIn} exiting={FadeOut}>
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Saltar presentación"
                    onPress={finish}
                    hitSlop={8}
                    className="h-10 px-3 items-center justify-center active:opacity-60"
                >
                    <Text className="text-graphite text-base font-sans-medium">Saltar</Text>
                </Pressable>
            </Animated.View>}
        </View>

        <Animated.ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            bounces={false}
            showsHorizontalScrollIndicator={false}
            onScroll={scrollHandler}
            scrollEventThrottle={16}
            onLayout={(e) => setPagerHeight(e.nativeEvent.layout.height)}
            className="flex-1"
        >
            {pagerHeight > 0 && SLIDES.map((slide, i) => <OnboardingSlide
                key={slide.kind}
                index={i}
                width={width}
                height={pagerHeight}
                scrollX={scrollX}
                active={page === i}
                visit={visits[i]}
                illustration={<SlideIllustration kind={slide.kind} active={page === i} />}
                title={slide.title}
                header={slide.kind === "brand" ? <Wordmark /> : undefined}
                body={slide.body}
            />)}
        </Animated.ScrollView>

        <View className="pt-2 pb-4">
            <PageDots count={SLIDES.length} current={page} width={width} scrollX={scrollX} />
        </View>

        <OnboardingFooter isLast={isLast} onNext={goNext} onSocial={onSocial} onContinueAsGuest={finish} />
    </View>;
}
