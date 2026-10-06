import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

/** Lado más largo permitido para cada página que se sube. */
const MAX_SIDE = 2000;
const UPLOAD_COMPRESS = 0.8;
const ROTATE_COMPRESS = 0.92;

/** Gira una página 90° en sentido horario y devuelve la URI del nuevo JPEG. */
export async function rotatePage(uri: string): Promise<string> {
    const context = ImageManipulator.manipulate(uri).rotate(90);
    const image = await context.renderAsync();
    try {
        const result = await image.saveAsync({ format: SaveFormat.JPEG, compress: ROTATE_COMPRESS });
        return result.uri;
    } finally {
        image.release();
        context.release();
    }
}

/** Reduce una página a ≤ 2000 px en su lado más largo y la comprime a JPEG 0.8. */
async function preparePage(uri: string): Promise<string> {
    const context = ImageManipulator.manipulate(uri);
    const original = await context.renderAsync();
    let output = original;
    const resizeContext = Math.max(original.width, original.height) > MAX_SIDE
        ? ImageManipulator.manipulate(uri).resize(
            original.width >= original.height ? { width: MAX_SIDE } : { height: MAX_SIDE },
        )
        : null;
    try {
        if (resizeContext) output = await resizeContext.renderAsync();
        const result = await output.saveAsync({ format: SaveFormat.JPEG, compress: UPLOAD_COMPRESS });
        return result.uri;
    } finally {
        if (output !== original) output.release();
        resizeContext?.release();
        original.release();
        context.release();
    }
}

/**
 * Prepara todas las páginas para subirlas, en orden. `onProgress` recibe la
 * fracción (0–1) de páginas ya procesadas.
 */
export async function prepareForUpload(
    uris: string[],
    onProgress?: (fraction: number) => void,
): Promise<string[]> {
    const prepared: string[] = [];
    for (const uri of uris) {
        prepared.push(await preparePage(uri));
        onProgress?.(prepared.length / uris.length);
    }
    return prepared;
}
