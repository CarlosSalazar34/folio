import { Image } from "expo-image";
import { useState } from "react";
import {
    FlatList,
    Modal,
    Pressable,
    Text,
    View,
    useWindowDimensions,
    type NativeScrollEvent,
    type NativeSyntheticEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { IconButton } from "@/components/ui/IconButton";
import { colors } from "@/constants/colors";
import type { Page } from "@/lib/types";

import { mono } from "./mono";
import { SectionTitle } from "./SectionTitle";

const pageNumber = (n: number) => String(n).padStart(2, "0");

function aspectRatio(page: Page) {
    return page.width > 0 && page.height > 0 ? page.width / page.height : 3 / 4;
}

type Props = {
    pages: Page[];
};

/** Rejilla de 2 columnas con las páginas; al tocar una se abre el visor. */
export function PageGallery({ pages }: Props) {
    const [openIndex, setOpenIndex] = useState<number | null>(null);
    const sorted = [...pages].sort((a, b) => a.index - b.index);

    if (sorted.length === 0) return null;

    const rows: Page[][] = [];
    for (let i = 0; i < sorted.length; i += 2) rows.push(sorted.slice(i, i + 2));

    return <View className="gap-3">
        <SectionTitle>Páginas</SectionTitle>
        <View className="gap-4">
            {rows.map((row, r) => <View key={r} className="flex-row gap-3">
                {row.map((page, c) => {
                    const position = r * 2 + c;
                    return <Pressable
                        key={page.url}
                        accessibilityRole="imagebutton"
                        accessibilityLabel={`Ver página ${position + 1}`}
                        onPress={() => setOpenIndex(position)}
                        className="flex-1 items-center gap-2 active:opacity-80"
                    >
                        <View
                            className="w-full bg-white rounded-xl p-1.5"
                            style={{
                                borderCurve: "continuous",
                                boxShadow: "0 6px 16px rgba(18, 18, 18, 0.08)",
                            }}
                        >
                            <Image
                                source={page.url}
                                style={{ width: "100%", aspectRatio: aspectRatio(page), borderRadius: 8 }}
                                contentFit="cover"
                                transition={150}
                                recyclingKey={page.url}
                            />
                        </View>
                        <Text className="text-xs text-graphite" style={mono}>{pageNumber(position + 1)}</Text>
                    </Pressable>;
                })}
                {row.length === 1 && <View className="flex-1" />}
            </View>)}
        </View>
        {openIndex !== null && <PageViewer
            pages={sorted}
            initialIndex={openIndex}
            onClose={() => setOpenIndex(null)}
        />}
    </View>;
}

type ViewerProps = {
    pages: Page[];
    initialIndex: number;
    onClose: () => void;
};

/** Visor a pantalla completa con paginado horizontal. */
function PageViewer({ pages, initialIndex, onClose }: ViewerProps) {
    const { width, height } = useWindowDimensions();
    const insets = useSafeAreaInsets();
    const [current, setCurrent] = useState(initialIndex);

    function onMomentumScrollEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
        setCurrent(Math.round(e.nativeEvent.contentOffset.x / width));
    }

    return <Modal
        visible
        animationType="fade"
        presentationStyle="overFullScreen"
        transparent
        statusBarTranslucent
        onRequestClose={onClose}
    >
        <View className="flex-1 bg-black">
            <FlatList
                data={pages}
                keyExtractor={(page) => page.url}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                initialScrollIndex={initialIndex}
                getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
                onMomentumScrollEnd={onMomentumScrollEnd}
                renderItem={({ item, index }) => <View
                    style={{ width, height }}
                    className="items-center justify-center"
                    accessible
                    accessibilityLabel={`Página ${index + 1} de ${pages.length}`}
                >
                    <Image
                        source={item.url}
                        style={{
                            width: width - 24,
                            height: height - insets.top - insets.bottom - 120,
                        }}
                        contentFit="contain"
                        transition={150}
                    />
                </View>}
            />
            <View
                className="absolute left-0 right-0 flex-row items-center justify-between px-4"
                style={{ top: insets.top + 8 }}
                pointerEvents="box-none"
            >
                <Text className="text-sm text-white" style={mono}>
                    {pageNumber(current + 1)} / {pageNumber(pages.length)}
                </Text>
                <IconButton
                    icon="xmark"
                    accessibilityLabel="Cerrar visor"
                    tintColor={colors.white}
                    className="bg-white/15"
                    onPress={onClose}
                />
            </View>
        </View>
    </Modal>;
}
