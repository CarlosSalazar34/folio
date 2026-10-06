import { SymbolView } from "expo-symbols";
import type { ReactNode } from "react";
import { Text, View } from "react-native";

import { colors } from "@/constants/colors";

export type IllustrationKind = "brand" | "scan" | "ocr" | "share";

/** Líneas grises que simulan el texto impreso de una hoja. */
function PaperLines({ widths, className = "" }: { widths: number[]; className?: string }) {
    return <View className={`gap-2 ${className}`}>
        {widths.map((w, i) => <View key={i} className="h-2 rounded-full bg-[#E2E0D9]" style={{ width: `${w}%` }} />)}
    </View>;
}

/** Logotipo de Folio: hoja blanca con la esquina superior derecha doblada en cobalto. */
export function FolioLogo({ size = 120 }: { size?: number }) {
    const fold = Math.round(size * 0.3);
    const border = Math.max(2, Math.round(size / 40));
    return <View
        className="bg-white rounded-lg border-ink"
        style={{ width: size, height: size * 1.3, borderWidth: border }}
    >
        {/* Triángulo inferior izquierdo = solapa cobalto; el superior derecho tapa la esquina. */}
        <View
            style={{
                position: "absolute",
                top: -border,
                right: -border,
                width: 0,
                height: 0,
                borderRightWidth: fold,
                borderBottomWidth: fold,
                borderRightColor: colors.paper,
                borderBottomColor: colors.cobalt,
            }}
        />
        <View className="flex-1 justify-end" style={{ padding: size * 0.14 }}>
            <PaperLines widths={[90, 70, 82, 50]} />
        </View>
    </View>;
}

/** Hoja de ejemplo usada en varias ilustraciones. */
function Sheet({ children, className = "" }: { children?: ReactNode; className?: string }) {
    return <View className={`w-44 h-56 bg-white rounded-xl border border-[#E2E0D9] p-5 ${className}`}>
        <View className="w-16 h-3 rounded-full bg-ink mb-4" />
        <PaperLines widths={[95, 80, 88, 60, 92, 70, 40]} />
        {children}
    </View>;
}

function ScanIllustration() {
    const corner = "absolute w-10 h-10 border-lime";
    return <View className="w-64 h-80 items-center justify-center">
        <Sheet />
        <View className={`${corner} top-0 left-0 border-t-4 border-l-4 rounded-tl-2xl`} />
        <View className={`${corner} top-0 right-0 border-t-4 border-r-4 rounded-tr-2xl`} />
        <View className={`${corner} bottom-0 right-0 border-b-4 border-r-4 rounded-br-2xl`} />
        <View className={`${corner} bottom-0 left-0 border-b-4 border-l-4 rounded-bl-2xl`} />
    </View>;
}

function OcrIllustration() {
    const lines = ["FACTURA Nº 0042", "Luz · Octubre 2026", "Vence: 15/10/2026"];
    return <View className="w-72 items-center">
        {/* Hoja escaneada (imagen) */}
        <View className="w-40 h-24 bg-white rounded-xl border border-[#E2E0D9] p-4 overflow-hidden">
            <PaperLines widths={[60, 90, 75, 85]} />
        </View>
        <View className="my-3">
            <SymbolView name="arrow.down" size={22} tintColor={colors.graphite} />
        </View>
        {/* Texto reconocido, seleccionable */}
        <View className="w-full bg-white rounded-2xl border border-[#E2E0D9] p-5 gap-2.5">
            {lines.map((line) => <Text
                key={line}
                className="text-ink text-[15px] font-mono"
            >
                {line}
            </Text>)}
            <View className="flex-row items-center">
                <Text className="text-ink text-[15px] font-mono">Total: </Text>
                <View className="flex-row items-center">
                    <View className="w-0.5 h-5 bg-cobalt" />
                    <View className="bg-cobalt/20 px-0.5">
                        <Text className="text-ink text-[15px] font-mono-medium">128,40 €</Text>
                    </View>
                    <View className="w-0.5 h-5 bg-cobalt" />
                </View>
            </View>
        </View>
        <View className="absolute -top-2 right-0 h-9 px-3 rounded-full bg-lime flex-row items-center gap-1.5"
        >
            <SymbolView name="text.viewfinder" size={16} tintColor={colors.ink} />
            <Text className="text-ink text-sm font-sans-semibold">Texto reconocido</Text>
        </View>
    </View>;
}

function ShareIllustration() {
    return <View className="w-72 gap-4">
        <View className="h-13 px-4 rounded-full bg-white border border-[#E2E0D9] flex-row items-center gap-2"
        >
            <SymbolView name="magnifyingglass" size={18} tintColor={colors.graphite} />
            <Text className="text-ink text-base font-sans">factura luz</Text>
            <View className="w-0.5 h-5 bg-cobalt" />
        </View>
        <View className="bg-white rounded-2xl border border-[#E2E0D9] p-4 flex-row items-center gap-3"
        >
            <View className="w-12 h-16 rounded-md bg-paper border border-[#E2E0D9] p-2">
                <PaperLines widths={[90, 70, 80]} className="gap-1.5" />
            </View>
            <View className="flex-1 gap-1">
                <Text className="text-ink text-base font-sans-semibold">Factura de la luz</Text>
                <Text className="text-graphite text-xs font-mono">2 PÁG · 6 OCT</Text>
            </View>
        </View>
        <View className="flex-row gap-2 justify-center">
            {["PDF", "Texto"].map((label) => <View
                key={label}
                className={`h-9 px-4 rounded-full flex-row items-center gap-1.5 ${label === "PDF" ? "bg-ink" : "bg-lime"}`}
            >
                <SymbolView name="square.and.arrow.up" size={14} tintColor={label === "PDF" ? colors.white : colors.ink} />
                <Text className={`text-sm font-sans-semibold ${label === "PDF" ? "text-white" : "text-ink"}`}>{label}</Text>
            </View>)}
        </View>
    </View>;
}

/** Ilustración (decorativa) de cada página del onboarding, hecha con vistas. */
export function SlideIllustration({ kind }: { kind: IllustrationKind }) {
    return <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {kind === "brand" && <FolioLogo size={128} />}
        {kind === "scan" && <ScanIllustration />}
        {kind === "ocr" && <OcrIllustration />}
        {kind === "share" && <ShareIllustration />}
    </View>;
}
