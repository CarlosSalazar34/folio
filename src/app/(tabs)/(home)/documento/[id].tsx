import { Stack, useLocalSearchParams } from "expo-router";
import { ScrollView, Text, View } from "react-native";

import { DOCUMENT_ACTIONS_HEIGHT, DocumentActions } from "@/components/document/DocumentActions";
import { DocumentMeta } from "@/components/document/DocumentMeta";
import { KeyFields } from "@/components/document/KeyFields";
import { OcrText } from "@/components/document/OcrText";
import { PageGallery } from "@/components/document/PageGallery";
import { Button } from "@/components/ui/Button";
import { useDocument } from "@/hooks/useDocument";
import { useDocumentActions } from "@/hooks/useDocumentActions";
import { ApiError } from "@/lib/api";

function errorMessage(error: Error) {
    if (error instanceof ApiError && error.status === 404) return "Este documento ya no existe.";
    if (error instanceof ApiError && error.status > 0) return "El servidor no pudo cargar el documento.";
    if (error instanceof TypeError) return "No pudimos conectar con el servidor. Revisa tu conexión.";
    return "Algo salió mal al cargar el documento.";
}

function Skeleton() {
    return <View className="gap-4" accessibilityLabel="Cargando documento" accessible>
        <View className="h-3 w-40 rounded-full bg-[#E2E0D9]" />
        <View className="flex-row gap-2">
            <View className="h-9 w-24 rounded-full bg-[#E2E0D9]" />
            <View className="h-9 w-36 rounded-full bg-[#E2E0D9]" />
        </View>
        <View className="gap-2">
            <View className="h-4 w-full rounded-full bg-[#E2E0D9]" />
            <View className="h-4 w-full rounded-full bg-[#E2E0D9]" />
            <View className="h-4 w-2/3 rounded-full bg-[#E2E0D9]" />
        </View>
        <View className="h-28 rounded-2xl bg-[#E2E0D9]" />
        <View className="flex-row gap-3">
            <View className="flex-1 aspect-[3/4] rounded-xl bg-[#E2E0D9]" />
            <View className="flex-1 aspect-[3/4] rounded-xl bg-[#E2E0D9]" />
        </View>
    </View>;
}

export default function DocumentScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { document, loading, error, reload } = useDocument(id);
    const { sharePdf, sharing, confirmDelete, deleting } = useDocumentActions(document);

    return <>
        <Stack.Title large>{document?.title ?? ""}</Stack.Title>
        {document && <Stack.Toolbar placement="right">
            <Stack.Toolbar.Menu icon="ellipsis.circle" accessibilityLabel="Más acciones">
                <Stack.Toolbar.MenuAction icon="square.and.arrow.up" disabled={sharing} onPress={sharePdf}>
                    Compartir PDF
                </Stack.Toolbar.MenuAction>
                <Stack.Toolbar.MenuAction icon="trash" destructive disabled={deleting} onPress={confirmDelete}>
                    Borrar
                </Stack.Toolbar.MenuAction>
            </Stack.Toolbar.Menu>
        </Stack.Toolbar>}
        <ScrollView
            contentInsetAdjustmentBehavior="automatic"
            contentContainerClassName="px-4 pt-2 gap-8"
            contentContainerStyle={{ paddingBottom: document ? DOCUMENT_ACTIONS_HEIGHT + 40 : 32 }}
        >
            {document
                ? <>
                    <DocumentMeta document={document} />
                    <KeyFields fields={document.key_fields} />
                    <PageGallery pages={document.pages} />
                    <OcrText text={document.text} />
                </>
                : error && !loading
                    ? <View className="items-center gap-4 pt-24 px-6">
                        <Text className="text-lg font-semibold text-ink text-center">No se pudo abrir</Text>
                        <Text className="text-base text-graphite text-center">{errorMessage(error)}</Text>
                        <Button title="Reintentar" variant="secondary" onPress={reload} />
                    </View>
                    : <Skeleton />}
        </ScrollView>
        {document && <DocumentActions
            onShare={sharePdf}
            onDelete={confirmDelete}
            sharing={sharing}
            deleting={deleting}
        />}
    </>;
}
