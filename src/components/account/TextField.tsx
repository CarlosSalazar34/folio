import { SymbolView } from "expo-symbols";
import { forwardRef, useState } from "react";
import { Pressable, Text, TextInput, View, type TextInputProps } from "react-native";

import { colors } from "@/constants/colors";

type Props = TextInputProps & {
    label: string;
    hint?: string;
    /** Añade el botón para mostrar u ocultar la contraseña. */
    secure?: boolean;
};

/** Campo de formulario con etiqueta visible, en el estilo de tarjeta blanca de la app. */
export const TextField = forwardRef<TextInput, Props>(function TextField({ label, hint, secure, ...input }, ref) {
    const [visible, setVisible] = useState(false);

    return <View className="gap-1.5">
        <Text className="font-sans-medium text-[13px] text-graphite">{label}</Text>
        <View className="h-13 flex-row items-center rounded-xl bg-white border border-[#E2E0D9] px-4">
            <TextInput
                ref={ref}
                accessibilityLabel={label}
                placeholderTextColor={colors.graphite}
                secureTextEntry={secure && !visible}
                className="flex-1 font-sans text-[16px] text-ink"
                {...input}
            />
            {secure && <Pressable
                accessibilityRole="button"
                accessibilityLabel={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
                onPress={() => setVisible((v) => !v)}
                hitSlop={10}
                className="pl-3"
            >
                <SymbolView name={visible ? "eye.slash" : "eye"} size={18} tintColor={colors.graphite} />
            </Pressable>}
        </View>
        {hint && <Text className="font-sans text-[13px] text-graphite">{hint}</Text>}
    </View>;
});
