import { router, Stack, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { useRef, useState } from "react";
import { KeyboardAvoidingView, Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { TextField } from "@/components/account/TextField";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/features/auth/AuthContext";
import { setPreference } from "@/features/preferences/preferences";
import { errorMessage } from "@/lib/api";

type Mode = "registro" | "login";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function close() {
    if (router.canGoBack()) router.back();
    else router.replace("/");
}

export default function AccountScreen() {
    const params = useLocalSearchParams<{ modo?: string; desde?: string }>();
    const fromOnboarding = params.desde === "onboarding";
    const { signIn, signUp } = useAuth();

    const [mode, setMode] = useState<Mode>(params.modo === "login" ? "login" : "registro");
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const emailRef = useRef<TextInput>(null);
    const passwordRef = useRef<TextInput>(null);

    const isRegister = mode === "registro";

    const validate = (): string | null => {
        if (!EMAIL_RE.test(email.trim())) return "Introduce un correo válido.";
        if (isRegister && password.length < 8) return "La contraseña debe tener al menos 8 caracteres.";
        if (!password) return "Introduce tu contraseña.";
        return null;
    };

    const submit = async () => {
        if (submitting) return;
        const invalid = validate();
        if (invalid) {
            setError(invalid);
            return;
        }
        setError(null);
        setSubmitting(true);
        try {
            if (isRegister) await signUp(email.trim(), password, name.trim());
            else await signIn(email.trim(), password);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            if (fromOnboarding) {
                setPreference("onboardingCompleted", true);
                router.dismissAll();
            } else {
                close();
            }
        } catch (e) {
            setError(errorMessage(e));
            setSubmitting(false);
        }
    };

    const switchMode = () => {
        setMode(isRegister ? "login" : "registro");
        setError(null);
    };

    return <>
        <Stack.Title>{isRegister ? "Crear cuenta" : "Iniciar sesión"}</Stack.Title>
        <Stack.Toolbar placement="left">
            <Stack.Toolbar.Button onPress={close}>Cancelar</Stack.Toolbar.Button>
        </Stack.Toolbar>
        <KeyboardAvoidingView behavior="padding" className="flex-1">
            <ScrollView
                className="flex-1 bg-paper"
                contentInsetAdjustmentBehavior="automatic"
                keyboardShouldPersistTaps="handled"
                contentContainerClassName="px-6 pt-6 pb-10 gap-6"
            >
                <View className="gap-2">
                    <Text accessibilityRole="header" className="font-display text-[30px] leading-[34px] tracking-tight text-ink">
                        {isRegister ? "Crea tu cuenta" : "Bienvenido de nuevo"}
                    </Text>
                    <Text className="font-sans text-[16px] leading-6 text-graphite">
                        {isRegister
                            ? "Tus documentos quedarán guardados en tu cuenta, incluidos los que ya escaneaste."
                            : "Inicia sesión para ver tus documentos."}
                    </Text>
                </View>

                <View className="gap-4">
                    {isRegister && <TextField
                        label="Nombre"
                        placeholder="Opcional"
                        value={name}
                        onChangeText={setName}
                        autoComplete="name"
                        textContentType="name"
                        returnKeyType="next"
                        onSubmitEditing={() => emailRef.current?.focus()}
                        maxLength={80}
                    />}
                    <TextField
                        ref={emailRef}
                        label="Correo"
                        placeholder="tu@correo.com"
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        autoCorrect={false}
                        keyboardType="email-address"
                        autoComplete="email"
                        textContentType="username"
                        returnKeyType="next"
                        onSubmitEditing={() => passwordRef.current?.focus()}
                    />
                    <TextField
                        ref={passwordRef}
                        label="Contraseña"
                        secure
                        hint={isRegister ? "Mínimo 8 caracteres." : undefined}
                        value={password}
                        onChangeText={setPassword}
                        autoCapitalize="none"
                        autoCorrect={false}
                        autoComplete={isRegister ? "new-password" : "current-password"}
                        textContentType={isRegister ? "newPassword" : "password"}
                        returnKeyType="go"
                        onSubmitEditing={submit}
                        maxLength={128}
                    />
                </View>

                {error && <Text accessibilityRole="alert" className="font-sans-medium text-[15px] text-[#B42318]">{error}</Text>}

                <Button
                    title={isRegister ? "Crear cuenta" : "Iniciar sesión"}
                    loading={submitting}
                    onPress={submit}
                    className="h-13"
                />

                <Pressable accessibilityRole="button" onPress={switchMode} className="h-11 items-center justify-center active:opacity-60">
                    <Text className="font-sans text-[15px] text-graphite">
                        {isRegister ? "¿Ya tienes cuenta? " : "¿No tienes cuenta? "}
                        <Text className="font-sans-semibold text-cobalt">{isRegister ? "Inicia sesión" : "Créala"}</Text>
                    </Text>
                </Pressable>
            </ScrollView>
        </KeyboardAvoidingView>
    </>;
}
