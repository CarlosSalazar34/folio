import { Image } from "expo-image";
import { useState } from "react";
import { View } from "react-native";

import { colors } from "@/constants/colors";

const WIDTH = 46;
const HEIGHT = 60;
const FOLD = 12;

type Props = {
    uri: string | null;
};

/** Miniatura 46×60 del documento; si no hay imagen, una hoja con la esquina doblada. */
export function DocumentThumbnail({ uri }: Props) {
    const [failedUri, setFailedUri] = useState<string | null>(null);

    if (uri && failedUri !== uri) {
        return <Image
            source={{ uri }}
            contentFit="cover"
            transition={150}
            recyclingKey={uri}
            onError={() => setFailedUri(uri)}
            accessible={false}
            style={{ width: WIDTH, height: HEIGHT, borderRadius: 4, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white }}
        />;
    }

    return <View
        accessible={false}
        className="bg-white rounded px-2 pt-5 gap-1.5"
        style={{ width: WIDTH, height: HEIGHT, borderWidth: 1, borderColor: colors.line }}
    >
        <View className="h-0.5 rounded-full" style={{ backgroundColor: colors.line }} />
        <View className="h-0.5 rounded-full" style={{ backgroundColor: colors.line }} />
        <View className="h-0.5 w-2/3 rounded-full" style={{ backgroundColor: colors.line }} />
        {/* Esquina doblada: el triángulo superior "recorta" la hoja y el inferior es el pliegue. */}
        <View
            style={{
                position: "absolute",
                top: -1,
                right: -1,
                width: 0,
                height: 0,
                borderTopWidth: FOLD,
                borderLeftWidth: FOLD,
                borderTopColor: colors.paper,
                borderLeftColor: colors.cobalt,
            }}
        />
    </View>;
}
