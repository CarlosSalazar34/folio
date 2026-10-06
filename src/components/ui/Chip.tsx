import { Pressable, Text } from "react-native";

type Props = {
    label: string;
    selected?: boolean;
    onPress?: () => void;
    tone?: "default" | "lime";
};

export function Chip({ label, selected = false, onPress, tone = "default" }: Props) {
    const style = tone === "lime"
        ? "bg-lime border-lime"
        : selected ? "bg-ink border-ink" : "bg-transparent border-[#D9D7D0]";
    const text = tone === "lime" || !selected ? "text-ink" : "text-white";

    return <Pressable
        accessibilityRole={onPress ? "button" : "text"}
        accessibilityState={onPress ? { selected } : undefined}
        disabled={!onPress}
        onPress={onPress}
        className={`h-9 px-4 rounded-full border items-center justify-center ${style}`}
    >
        <Text className={`text-sm font-medium ${text}`}>{label}</Text>
    </Pressable>;
}
