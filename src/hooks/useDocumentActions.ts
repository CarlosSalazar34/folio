import { Directory, File, Paths } from "expo-file-system";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import * as Sharing from "expo-sharing";
import { useRef, useState } from "react";
import { Alert } from "react-native";

import { authHeaders, deleteDocument, pdfUrl } from "@/lib/api";
import type { DocumentDetail } from "@/lib/types";

/** Nombre de archivo seguro a partir del título del documento. */
function pdfFileName(title: string): string {
    const safe = title.replace(/[\\/:*?"<>|\n\r\t]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
    return `${safe || "Documento"}.pdf`;
}

/** Acciones del detalle: compartir el PDF y borrar el documento. */
export function useDocumentActions(document: DocumentDetail | null) {
    const [sharing, setSharing] = useState(false);
    const [deleting, setDeleting] = useState(false);
    // Guardas síncronas: el estado de React no se actualiza a tiempo ante dos toques seguidos.
    const busy = useRef(false);

    async function sharePdf() {
        if (!document || busy.current) return;
        busy.current = true;
        setSharing(true);
        try {
            if (!(await Sharing.isAvailableAsync())) {
                Alert.alert("No disponible", "Este dispositivo no permite compartir archivos.");
                return;
            }
            // Una carpeta por documento: dos documentos con el mismo título no se pisan.
            const folder = new Directory(Paths.cache, "pdf", document.id);
            folder.create({ intermediates: true, idempotent: true });
            const destination = new File(folder, pdfFileName(document.title));
            // El PDF ya está guardado en S3: se descarga directo de su URL prefirmada. Si falla
            // (p. ej. la URL caducó), se pide a la API, que lo sirve o lo genera.
            let file: File;
            try {
                if (!document.pdf_url) throw new Error("Sin URL directa del PDF");
                file = await File.downloadFileAsync(document.pdf_url, destination, { idempotent: true });
            } catch {
                file = await File.downloadFileAsync(pdfUrl(document.id), destination, { idempotent: true, headers: authHeaders() });
            }
            await Sharing.shareAsync(file.uri, {
                mimeType: "application/pdf",
                UTI: "com.adobe.pdf",
                dialogTitle: document.title,
            });
        } catch {
            Alert.alert("No se pudo compartir", "No pudimos generar el PDF. Revisa tu conexión e inténtalo de nuevo.");
        } finally {
            busy.current = false;
            setSharing(false);
        }
    }

    function confirmDelete() {
        if (!document || busy.current) return;
        Alert.alert("¿Borrar este documento?", "Esta acción no se puede deshacer.", [
            { text: "Cancelar", style: "cancel" },
            {
                text: "Borrar",
                style: "destructive",
                onPress: async () => {
                    if (busy.current) return;
                    busy.current = true;
                    setDeleting(true);
                    try {
                        await deleteDocument(document.id);
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
                        if (router.canGoBack()) router.back();
                        else router.replace("/");
                    } catch {
                        busy.current = false;
                        setDeleting(false);
                        Alert.alert("No se pudo borrar", "Inténtalo de nuevo en unos segundos.");
                    }
                },
            },
        ]);
    }

    return { sharePdf, sharing, confirmDelete, deleting };
}
