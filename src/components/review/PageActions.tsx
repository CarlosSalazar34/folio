import { SymbolView, type SFSymbol } from "expo-symbols";
import { Pressable, Text, View } from "react-native";

import { colors } from "@/constants/colors";

type ActionProps = {
    icon: SFSymbol;
    label: string;
    accessibilityLabel: string;
    onPress: () => void;
    disabled?: boolean;
    danger?: boolean;
};

function Action({ icon, label, accessibilityLabel, onPress, disabled = false, danger = false }: ActionProps) {
    const tint = danger ? colors.danger : colors.ink;
    return <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
        className={`flex-1 items-center gap-1.5 active:opacity-70 ${disabled ? "opacity-35" : ""}`}
    >
        <View className={`w-11 h-11 rounded-full items-center justify-center ${danger ? "bg-[#B42318]/10" : "bg-white"}`}>
            <SymbolView name={icon} size={18} tintColor={tint} />
        </View>
        <Text className={`text-xs font-medium ${danger ? "text-[#B42318]" : "text-ink"}`}>{label}</Text>
    </Pressable>;
}

type Props = {
    onRotate: () => void;
    onMoveLeft: () => void;
    onMoveRight: () => void;
    onAdd: () => void;
    onDelete: () => void;
    canMoveLeft: boolean;
    canMoveRight: boolean;
    /** Desactiva todas las acciones (p. ej. mientras se gira una página). */
    disabled?: boolean;
};

/** Fila de acciones sobre la página seleccionada. */
export function PageActions({
    onRotate,
    onMoveLeft,
    onMoveRight,
    onAdd,
    onDelete,
    canMoveLeft,
    canMoveRight,
    disabled = false,
}: Props) {
    return <View className="flex-row px-2">
        <Action icon="rotate.right" label="Girar" accessibilityLabel="Girar página 90 grados" onPress={onRotate} disabled={disabled} />
        <Action icon="arrow.left" label="Mover" accessibilityLabel="Mover página a la izquierda" onPress={onMoveLeft} disabled={disabled || !canMoveLeft} />
        <Action icon="arrow.right" label="Mover" accessibilityLabel="Mover página a la derecha" onPress={onMoveRight} disabled={disabled || !canMoveRight} />
        <Action icon="plus" label="Añadir" accessibilityLabel="Añadir otra página con la cámara" onPress={onAdd} disabled={disabled} />
        <Action icon="trash" label="Borrar" accessibilityLabel="Borrar página" onPress={onDelete} disabled={disabled} danger />
    </View>;
}
