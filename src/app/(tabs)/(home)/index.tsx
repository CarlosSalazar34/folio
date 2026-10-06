import { Stack } from "expo-router";
import { useState } from "react";
import { FlatList, RefreshControl } from "react-native";

import { CategoryFilter } from "@/components/documents/CategoryFilter";
import { DocumentRow, DocumentSeparator } from "@/components/documents/DocumentRow";
import { EmptyState, type EmptyVariant } from "@/components/documents/EmptyState";
import { colors } from "@/constants/colors";
import { useDocuments } from "@/hooks/useDocuments";
import type { Category } from "@/lib/types";

export default function HomeScreen() {
    const [query, setQuery] = useState("");
    const [category, setCategory] = useState<Category | null>(null);
    const { documents, loading, refreshing, error, refresh, retry, searching } = useDocuments(query, category);

    let emptyVariant: EmptyVariant;
    if (loading) emptyVariant = "loading";
    else if (error) emptyVariant = "error";
    else if (searching || category) emptyVariant = "no-results";
    else emptyVariant = "empty";

    return <>
        <Stack.Title large>Documentos</Stack.Title>
        <Stack.SearchBar
            placeholder="Buscar, incluso dentro del texto"
            placement="stacked"
            hideWhenScrolling={false}
            onChangeText={(e) => setQuery(e.nativeEvent.text)}
        />
        <Stack.Toolbar placement="right">
            <Stack.Toolbar.Button icon="person.crop.circle" accessibilityLabel="Perfil" onPress={() => {}} />
        </Stack.Toolbar>
        <FlatList
            data={documents}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <DocumentRow document={item} />}
            ItemSeparatorComponent={DocumentSeparator}
            ListHeaderComponent={<CategoryFilter
                value={category}
                onChange={setCategory}
                showSectionLabel={documents.length > 0}
            />}
            ListEmptyComponent={<EmptyState variant={emptyVariant} onRetry={retry} />}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.graphite} />}
            contentInsetAdjustmentBehavior="automatic"
            keyboardDismissMode="on-drag"
            contentContainerClassName="px-4 pb-8"
        />
    </>;
}
