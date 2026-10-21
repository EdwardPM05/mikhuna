import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "../../components/SafeAreaView";
import { Image } from "expo-image";
import { Link, router } from "expo-router";
import { useAuth } from "../../context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { BrandButton } from "../../components/BrandButton";
import { CampoTexto } from "../../components/CampoTexto";

export default function RegistroScreen() {
  const { signUp } = useAuth();
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [creado, setCreado] = useState(false);

  async function handleRegistro() {
    if (enviando) return;
    setError(null);
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    setEnviando(true);
    const { error, conSesion } = await signUp(email.trim(), password, nombre.trim());
    setEnviando(false);
    if (error) {
      setError(error);
      return;
    }
    if (conSesion) {
      router.replace("/"); // sin confirmación por correo: entra directo al onboarding
      return;
    }
    setCreado(true);
  }

  if (creado) {
    return (
      <SafeAreaView className="flex-1 bg-cream px-6 justify-center items-center">
        <Image
          source={require("../../src/assets/mascots/papi_papa_saludo.png")}
          style={{ width: 130, height: 130, marginBottom: 12 }}
          contentFit="contain"
        />
        <Text className="font-display text-2xl text-ink text-center mb-2">¡Cuenta creada!</Text>
        <Text className="font-body text-base text-ink/70 text-center mb-8">
          Te enviamos un correo a {email.trim()}. Confírmalo y luego inicia sesión.
        </Text>
        <BrandButton label="Ir a iniciar sesión" onPress={() => router.replace("/(auth)/login")} />
      </SafeAreaView>
    );
  }

  const completo = nombre.trim() !== "" && email.trim() !== "" && password !== "";

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
            style={{ width: 180, height: 91, alignSelf: "center", marginBottom: 16 }}
            contentFit="contain"
          />
          <Text className="font-display text-2xl text-ink text-center">Crea tu cuenta</Text>
          <Text className="font-body text-sm text-ink/60 text-center mb-6">
            Planea tu semana y pide a los negocios de tu barrio.
          </Text>

          <CampoTexto
            icono="person-outline"
            value={nombre}
            onChangeText={setNombre}
            placeholder="Nombre"
            autoComplete="name"
            autoCapitalize="words"
            returnKeyType="next"
          />
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
            autoComplete="new-password"
            returnKeyType="go"
            onSubmitEditing={handleRegistro}
          />
          <Text
            className={`font-body-semibold text-xs -mt-1 mb-3 ml-1 ${
              password.length === 0 ? "text-ink/45" : password.length < 6 ? "text-mango" : "text-[#3A9D5D]"
            }`}
          >
            {password.length >= 6 ? "✓ Contraseña lista" : "Mínimo 6 caracteres"}
          </Text>

          {error && (
            <View className="flex-row items-start bg-chili/10 rounded-xl px-3 py-2.5 mb-3">
              <Ionicons name="alert-circle" size={16} color="#E5131B" style={{ marginTop: 1 }} />
              <Text className="font-body-semibold text-sm text-maroon ml-2 flex-1">{error}</Text>
            </View>
          )}

          <View className="mb-5 mt-1">
            <BrandButton
              label={enviando ? "Creando cuenta..." : "Crear cuenta"}
              disabled={!completo || enviando}
              onPress={handleRegistro}
            />
          </View>

          <Link href="/(auth)/login" asChild>
            <Pressable hitSlop={8}>
              <Text className="font-body-semibold text-maroon text-center">
                ¿Ya tienes cuenta? <Text className="text-chili">Inicia sesión</Text>
              </Text>
            </Pressable>
          </Link>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
