import { createContext, use, useState, type ReactNode } from "react";

type ScanSession = {
    /** URIs locales de las páginas capturadas, en orden. */
    pages: string[];
    addPage: (uri: string) => void;
    replacePage: (index: number, uri: string) => void;
    removePage: (index: number) => void;
    movePage: (from: number, to: number) => void;
    reset: () => void;
};

const ScanSessionContext = createContext<ScanSession | null>(null);

export function ScanSessionProvider({ children }: { children: ReactNode }) {
    const [pages, setPages] = useState<string[]>([]);

    const value: ScanSession = {
        pages,
        addPage: (uri) => setPages((p) => [...p, uri]),
        replacePage: (index, uri) => setPages((p) => p.map((u, i) => (i === index ? uri : u))),
        removePage: (index) => setPages((p) => p.filter((_, i) => i !== index)),
        movePage: (from, to) =>
            setPages((p) => {
                if (to < 0 || to >= p.length) return p;
                const next = [...p];
                const [moved] = next.splice(from, 1);
                next.splice(to, 0, moved);
                return next;
            }),
        reset: () => setPages([]),
    };

    return <ScanSessionContext value={value}>{children}</ScanSessionContext>;
}

export function useScanSession(): ScanSession {
    const ctx = use(ScanSessionContext);
    if (!ctx) throw new Error("useScanSession debe usarse dentro de <ScanSessionProvider>");
    return ctx;
}
