import { SymbolView, type SFSymbol } from "expo-symbols";
import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";

import { colors } from "@/constants/colors";

type Props = {
    title: string;
    /** Texto secundario bajo el título. */
    caption?: string;
    icon?: SFSymbol;
    /** Fondo del cuadrado del icono. */
    iconBackground?: string;
    /** Valor a la derecha (texto). */
    value?: string;
    /** Usa tipografía monoespaciada para `value`. */
    monoValue?: boolean;
    /** "chevron" o un elemento propio (Switch, indicador…). */
    accessory?: "chevron" | ReactNode;
    onPress?: () => void;
    disabled?: boolean;
    accessibilityHint?: string;
};

/** Fila genérica de ajustes, ≥ 44 px de alto. Es pulsable solo si recibe `onPress`. */
export function SettingsRow({
    title,
    caption,
    icon,
    iconBackground = colors.ink,
    value,
    monoValue,
    accessory,
    onPress,
    disabled,
    accessibilityHint,
}: Props) {
    const content = <>
        {icon ? <View
            className="w-7.5 h-7.5 rounded-lg items-center justify-center"
            style={{ backgroundColor: disabled ? colors.line : iconBackground, borderCurve: "continuous" }}
        >
            <SymbolView name={icon} size={16} tintColor={disabled ? colors.graphite : colors.white} />
        </View> : null}
        <View className="flex-1 gap-0.5">
            <Text className={`font-sans text-[17px] ${disabled ? "text-graphite" : "text-ink"}`}>{title}</Text>
            {caption ? <Text className="font-sans text-[13px] leading-4 text-graphite">{caption}</Text> : null}
        </View>
        {value ? <Text
            numberOfLines={1}
            className={`shrink text-graphite ${monoValue ? "font-mono text-[13px]" : "font-sans text-[17px]"}`}
        >
            {value}
        </Text> : null}
        {accessory === "chevron"
            ? <SymbolView name="chevron.right" size={13} weight="semibold" tintColor={colors.graphite} />
            : accessory}
    </>;

    const className = "min-h-11 flex-row items-center gap-3 px-4 py-2.5";

    if (!onPress && !disabled) {
        return <View className={className}>{content}</View>;
    }

    return <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !!disabled }}
        accessibilityHint={accessibilityHint}
        disabled={disabled}
        onPress={onPress}
        className={`${className} active:bg-[#E2E0D9]`}
    >
        {content}
    </Pressable>;
}
