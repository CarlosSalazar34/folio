export type Category =
    | "recibo"
    | "factura"
    | "contrato"
    | "identidad"
    | "medico"
    | "academico"
    | "otro";

export const CATEGORY_LABELS: Record<Category, string> = {
    recibo: "Recibos",
    factura: "Facturas",
    contrato: "Contratos",
    identidad: "Identidad",
    medico: "Médico",
    academico: "Académico",
    otro: "Otros",
};

export type DocumentSummary = {
    id: string;
    title: string;
    category: Category;
    page_count: number;
    /** ISO 8601 */
    created_at: string;
    thumbnail_url: string | null;
};

export type KeyField = {
    label: string;
    value: string;
};

export type Page = {
    index: number;
    url: string;
    width: number;
    height: number;
};

export type DocumentDetail = DocumentSummary & {
    summary: string;
    text: string;
    key_fields: KeyField[];
    pages: Page[];
};
