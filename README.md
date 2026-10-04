# folio

**Todo tu papel, en orden.**

Folio es una app móvil para escanear documentos impulsada por IA. Apuntas la cámara a un contrato, una factura o un DNI y Folio detecta los bordes, recorta, mejora la imagen y lo guarda como PDF. La IA se encarga de lo tedioso: reconocer el texto, ponerle nombre al documento, clasificarlo y dejarlo listo para encontrarlo después con una búsqueda.

> 🚧 En desarrollo temprano. Las funciones de abajo son el objetivo del proyecto; no todas están implementadas todavía.

## Funciones

- **Escaneo inteligente** — detección automática de bordes, corrección de perspectiva y filtros (Original, Nítido, Grises, B/N).
- **Documentos de varias páginas** — captura varias hojas seguidas y reordénalas, gíralas o bórralas antes de guardar.
- **Reconocimiento de texto (OCR)** — el texto de cada escaneo queda seleccionable y se puede copiar.
- **Organización con IA** — nombres automáticos ("Factura de luz — septiembre"), categorías (recibos, contratos, identidad…) y extracción de datos clave como fechas e importes.
- **Búsqueda por contenido** — busca por lo que dice el documento, no solo por su nombre.
- **Exportar y compartir** — PDF listo para enviar desde la hoja de compartir del sistema.

## Stack

| Parte | Tecnología |
|---|---|
| App móvil | [Expo](https://expo.dev) · React Native · TypeScript |
| Navegación | [Expo Router](https://docs.expo.dev/router/introduction) con pestañas y headers nativos |
| Estilos | [NativeWind](https://www.nativewind.dev) (Tailwind CSS) |
| API | [FastAPI](https://fastapi.tiangolo.com) · Python · SQLModel |

## Diseño

- **Colores:** Tinta `#121212` · Papel `#F3F2EE` · Cobalto `#2747F5` (acciones) · Lima `#C6F432` (detección) · Grafito `#5E5D58`
- **Tipografía:** Bricolage Grotesque (títulos), Geist (interfaz), Geist Mono (metadatos)
