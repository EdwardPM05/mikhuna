import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "../../components/SafeAreaView";
import { Image } from "expo-image";
import { Link, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import { BrandButton } from "../../components/BrandButton";
import { CampoTexto } from "../../components/CampoTexto";

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const completo = email.trim() !== "" && password !== "";

  async function handleLogin() {
    if (!completo || enviando) return;
    setError(null);
    setEnviando(true);
    const { error } = await signIn(email.trim(), password);
    setEnviando(false);
    if (error) {
      setError(error);
      return;
    }
    router.replace("/"); // index decide: onboarding la primera vez, el plan si ya hay distrito
  }

  return (
    <SafeAreaView className="flex-1 bg-cream">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
        <ScrollView
          className="flex-1 px-6"
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingVertical: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          <Image
            source={require("../../src/assets/images/logo_wordmark.png")}
            style={{ width: 200, height: 101, alignSelf: "center", marginBottom: 12 }}
            contentFit="contain"
          />
          <Image
            source={require("../../src/assets/mascots/papi_papa_saludo.png")}
            style={{ width: 110, height: 110, alignSelf: "center", marginBottom: 8 }}
            contentFit="contain"
          />
          <Text className="font-display text-2xl text-ink text-center">¡Hola de nuevo!</Text>
          <Text className="font-body text-sm text-ink/60 text-center mb-6">
            Ingresa para ver tu plan y tus pedidos.
          </Text>

          <CampoTexto
            icono="mail-outline"
            value={email}
            onChangeText={setEmail}
            placeholder="Correo electrónico"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            returnKeyType="next"
          />
          <CampoTexto
            icono="lock-closed-outline"
            contrasena
            value={password}
            onChangeText={setPassword}
            placeholder="Contraseña"
            autoComplete="password"
            returnKeyType="go"
            onSubmitEditing={handleLogin}
          />

          {error && (
            <View className="flex-row items-start bg-chili/10 rounded-xl px-3 py-2.5 mb-3">
              <Ionicons name="alert-circle" size={16} color="#E5131B" style={{ marginTop: 1 }} />
              <Text className="font-body-semibold text-sm text-maroon ml-2 flex-1">{error}</Text>
            </View>
          )}

          <View className="mb-5 mt-1">
            <BrandButton
              label={enviando ? "Ingresando..." : "Ingresar"}
              disabled={!completo || enviando}
              onPress={handleLogin}
            />
          </View>

          <Link href="/(auth)/registro" asChild>
            <Pressable hitSlop={8}>
              <Text className="font-body-semibold text-maroon text-center">
                ¿No tienes cuenta? <Text className="text-chili">Regístrate</Text>
              </Text>
            </Pressable>
          </Link>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
