import { Platform, type TextStyle } from "react-native";

/** Tipografía monoespaciada del sistema para metadatos y números de página. */
export const mono: TextStyle = {
    fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }),
    letterSpacing: 0.5,
};
