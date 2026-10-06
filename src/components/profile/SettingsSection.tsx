import { Children, Fragment, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors } from "@/constants/colors";

type Props = {
    title?: string;
    children: ReactNode;
};

/** Grupo de filas estilo Ajustes de iOS: tarjeta blanca con separadores finos. */
export function SettingsSection({ title, children }: Props) {
    const rows = Children.toArray(children);

    return <View className="gap-2">
        {title ? <Text accessibilityRole="header" className="font-mono text-[11px] uppercase tracking-wider text-graphite px-4">
            {title}
        </Text> : null}
        <View className="bg-white rounded-2xl overflow-hidden" style={{ borderCurve: "continuous" }}>
            {rows.map((row, i) => <Fragment key={i}>
                {i > 0 ? <View className="ml-4" style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.line }} /> : null}
                {row}
            </Fragment>)}
        </View>
    </View>;
}
