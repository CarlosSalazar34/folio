import { SymbolView, type SFSymbol } from "expo-symbols";
import { Pressable, type PressableProps } from "react-native";

import { colors } from "@/constants/colors";

type Props = Omit<PressableProps, "children"> & {
    icon: SFSymbol;
    /** Obligatorio: el botón no tiene texto visible. */
    accessibilityLabel: string;
    tintColor?: string;
    size?: number;
    className?: string;
};

/** Botón redondo de 44×44 con un SF Symbol. */
export function IconButton({ icon, tintColor = colors.ink, size = 18, className = "bg-white", ...rest }: Props) {
    return <Pressable
        accessibilityRole="button"
        hitSlop={4}
        className={`w-11 h-11 rounded-full items-center justify-center active:opacity-70 ${className}`}
        {...rest}
    >
        <SymbolView name={icon} size={size} tintColor={tintColor} />
    </Pressable>;
}
