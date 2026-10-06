import { Text } from "react-native";

import { mono } from "./mono";

/** Encabezado de sección en mayúsculas monoespaciadas. */
export function SectionTitle({ children }: { children: string }) {
    return <Text accessibilityRole="header" className="text-xs text-graphite uppercase" style={mono}>
        {children}
    </Text>;
}
