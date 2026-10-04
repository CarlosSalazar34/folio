import { Stack } from "expo-router";
import { useState } from "react";
import { FlatList, Text } from "react-native";

const DOCS = ["Contrato de alquiler", "Factura de luz", "DNI", "Receta médica"];

export default function HomeScreen(){
    const [query, setQuery] = useState("");
    const filtered = DOCS.filter((d) => d.toLowerCase().includes(query.toLowerCase()));

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
            data={filtered}
            keyExtractor={(item) => item}
            renderItem={({ item }) => <Text className="py-4 text-base text-ink">{item}</Text>}
            contentInsetAdjustmentBehavior="automatic"
            contentContainerClassName="px-4 pb-8"
        />
    </>
}
