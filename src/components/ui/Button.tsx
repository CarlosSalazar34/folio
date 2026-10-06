import { ActivityIndicator, Pressable, Text, type PressableProps } from "react-native";

import { colors } from "@/constants/colors";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const container: Record<Variant, string> = {
    primary: "bg-cobalt",
    secondary: "bg-white border border-[#D9D7D0]",
    ghost: "bg-transparent",
    danger: "bg-transparent",
};

const label: Record<Variant, string> = {
    primary: "text-white",
    secondary: "text-ink",
    ghost: "text-ink",
    danger: "text-[#B42318]",
};

type Props = Omit<PressableProps, "children"> & {
    title: string;
    variant?: Variant;
    loading?: boolean;
    className?: string;
};

export function Button({ title, variant = "primary", loading = false, disabled, className = "", ...rest }: Props) {
    const isDisabled = disabled || loading;
    return <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled, busy: loading }}
        disabled={isDisabled}
        className={`h-12 px-5 rounded-full flex-row items-center justify-center gap-2 active:opacity-80 ${container[variant]} ${isDisabled ? "opacity-50" : ""} ${className}`}
        {...rest}
    >
        {loading && <ActivityIndicator color={variant === "primary" ? colors.white : colors.ink} />}
        <Text className={`text-base font-semibold ${label[variant]}`}>{title}</Text>
    </Pressable>;
}
