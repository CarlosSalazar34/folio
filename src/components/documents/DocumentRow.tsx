import { router } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Pressable, Text, View } from "react-native";

import { colors } from "@/constants/colors";
import { formatDocumentMeta } from "@/hooks/useDocuments";
import type { DocumentSummary } from "@/lib/types";

import { DocumentThumbnail } from "./DocumentThumbnail";

type Props = {
    document: DocumentSummary;
};

export function DocumentRow({ document }: Props) {
    const meta = formatDocumentMeta(document);

    return <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${document.title}, ${meta.toLowerCase()}`}
        onPress={() => router.push(`/documento/${document.id}`)}
        className="flex-row items-center gap-4 py-3 active:opacity-60"
    >
        <DocumentThumbnail uri={document.thumbnail_url} />
        <View className="flex-1 gap-1">
            <Text numberOfLines={1} className="text-base font-semibold text-ink">
                {document.title}
            </Text>
            <Text numberOfLines={1} className="font-mono text-xs uppercase tracking-wide text-graphite">
                {meta}
            </Text>
        </View>
        <SymbolView name="chevron.right" size={14} weight="semibold" tintColor={colors.graphite} />
    </Pressable>;
}

/** Separador hairline alineado con el texto (después de la miniatura). */
export function DocumentSeparator() {
    return <View style={{ height: 0.5, marginLeft: 62, backgroundColor: colors.line }} />;
}
