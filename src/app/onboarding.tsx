import { router } from "expo-router";
import { useRef, useState } from "react";
import {
    AccessibilityInfo,
    Alert,
    Pressable,
    ScrollView,
    Text,
    useWindowDimensions,
    View,
    type NativeScrollEvent,
    type NativeSyntheticEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AUTH_PROVIDER_LABELS, type AuthProvider } from "@/components/auth/SocialAuthButtons";
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
    const scrollRef = useRef<ScrollView>(null);
    const [page, setPage] = useState(0);
    const [pagerHeight, setPagerHeight] = useState(0);
    const finished = useRef(false);

    const isLast = page === SLIDES.length - 1;

    const goTo = (next: number) => {
        if (next === page) return;
        setPage(next);
        AccessibilityInfo.announceForAccessibility(`Página ${next + 1} de ${SLIDES.length}`);
    };

    const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        if (width <= 0) return;
        const next = Math.round(e.nativeEvent.contentOffset.x / width);
        goTo(Math.min(SLIDES.length - 1, Math.max(0, next)));
    };

    const finish = () => {
        if (finished.current) return;
        finished.current = true;
        setPreference("onboardingCompleted", true);
        if (router.canDismiss()) router.dismiss();
        else router.replace("/");
    };

    const goNext = () => {
        const next = Math.min(page + 1, SLIDES.length - 1);
        scrollRef.current?.scrollTo({ x: next * width, animated: true });
        goTo(next);
    };

    const onSocial = (provider: AuthProvider) => {
        if (provider === "email") {
            // Al crear la cuenta, /cuenta marca la presentación como vista y cierra ambas pantallas.
            router.push({ pathname: "/cuenta", params: { modo: "registro", desde: "onboarding" } });
            return;
        }
        Alert.alert(
            "Próximamente",
            `El inicio de sesión con ${AUTH_PROVIDER_LABELS[provider]} llegará pronto. Por ahora puedes usar Folio sin cuenta o con tu correo.`,
            [{ text: "Continuar sin cuenta", onPress: finish }, { text: "Cerrar", style: "cancel" }],
        );
    };

    return <View className="flex-1 bg-paper" style={{ paddingTop: insets.top, paddingBottom: insets.bottom + 8 }}>
        <View className="h-12 px-4 flex-row items-center justify-end">
            {!isLast && <View>
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Saltar presentación"
                    onPress={finish}
                    hitSlop={8}
                    className="h-10 px-3 items-center justify-center active:opacity-60"
                >
                    <Text className="text-graphite text-base font-sans-medium">Saltar</Text>
                </Pressable>
            </View>}
        </View>

        <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            bounces={false}
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onScrollEnd}
            onLayout={(e) => setPagerHeight(e.nativeEvent.layout.height)}
            className="flex-1"
        >
            {pagerHeight > 0 && SLIDES.map((slide, i) => <OnboardingSlide
                key={slide.kind}
                width={width}
                height={pagerHeight}
                active={page === i}
                illustration={<SlideIllustration kind={slide.kind} />}
                title={slide.title}
                header={slide.kind === "brand" ? <Wordmark /> : undefined}
                body={slide.body}
            />)}
        </ScrollView>

        <View className="pt-2 pb-4">
            <PageDots count={SLIDES.length} current={page} />
        </View>

        <OnboardingFooter isLast={isLast} onNext={goNext} onSocial={onSocial} onContinueAsGuest={finish} />
    </View>;
}
