import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "../../components/SafeAreaView";
import { Image } from "expo-image";
import { Link, router, useLocalSearchParams } from "expo-router";
import { useAuth } from "../../context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { BrandButton } from "../../components/BrandButton";
import { CampoTexto } from "../../components/CampoTexto";

// Supabase no deja pedir otro código antes de este tiempo.
const ESPERA_REENVIO_S = 60;

export default function RegistroScreen() {
  const { signUp, confirmarRegistro, reenviarCodigoRegistro } = useAuth();
  // Desde el login, una cuenta sin confirmar llega aquí directo al paso del código.
  const params = useLocalSearchParams<{ email?: string; confirmar?: string }>();
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState(params.email ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [creado, setCreado] = useState(params.confirmar === "1");
  const [codigo, setCodigo] = useState("");
  const [espera, setEspera] = useState(0);

  useEffect(() => {
    if (espera <= 0) return;
    const t = setTimeout(() => setEspera((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [espera]);

  async function confirmar() {
    if (codigo.length < 6 || enviando) return;
    setError(null);
    setEnviando(true);
    const { error } = await confirmarRegistro(email.trim(), codigo);
    setEnviando(false);
    if (error) {
      setError(error);
      return;
    }
    router.replace("/"); // confirmado: ya hay sesión, entra al onboarding
  }

  async function reenviar() {
    if (espera > 0 || enviando) return;
    setError(null);
    const { error } = await reenviarCodigoRegistro(email.trim());
    if (error) {
      setError(error);
      return;
    }
    setEspera(ESPERA_REENVIO_S);
  }

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
    setEspera(ESPERA_REENVIO_S);
  }

  if (creado) {
    return (
      <SafeAreaView className="flex-1 bg-cream">
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
          <ScrollView
            className="flex-1 px-6"
            contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingVertical: 24 }}
            keyboardShouldPersistTaps="handled"
          >
            <Image
              source={require("../../src/assets/mascots/papi_papa_saludo.png")}
              style={{ width: 120, height: 120, alignSelf: "center", marginBottom: 8 }}
              contentFit="contain"
            />
            <Text className="font-display text-2xl text-ink text-center">Confirma tu correo</Text>
            <Text className="font-body text-sm text-ink/60 text-center mb-6">
              Escribe el código que te enviamos a{" "}
              <Text className="font-body-bold text-ink">{email.trim()}</Text> y listo, entras a Mikhuna. Si ya no lo
              tienes, pide otro abajo.
            </Text>

            <CampoTexto
              icono="keypad-outline"
              value={codigo}
              onChangeText={(t) => setCodigo(t.replace(/\D/g, ""))}
              placeholder="Código del correo"
              keyboardType="number-pad"
              autoComplete="one-time-code"
              maxLength={10}
              returnKeyType="go"
              onSubmitEditing={confirmar}
            />

            {error && (
              <View className="flex-row items-start bg-chili/10 rounded-xl px-3 py-2.5 mb-3">
                <Ionicons name="alert-circle" size={16} color="#E5131B" style={{ marginTop: 1 }} />
                <Text className="font-body-semibold text-sm text-maroon ml-2 flex-1">{error}</Text>
              </View>
            )}

            <View className="mt-1 mb-5">
              <BrandButton
                label={enviando ? "Confirmando..." : "Confirmar y entrar"}
                disabled={codigo.length < 6 || enviando}
                onPress={confirmar}
              />
            </View>

            <Pressable onPress={reenviar} disabled={espera > 0 || enviando} hitSlop={8} className="mb-4">
              <Text className={`font-body-semibold text-center ${espera > 0 ? "text-ink/40" : "text-chili"}`}>
                {espera > 0 ? `¿No llegó? Reenviar en ${espera} s` : "¿No llegó? Reenviar código"}
              </Text>
            </Pressable>
            <View className="bg-white rounded-2xl border border-ink/10 px-4 py-3 mb-4">
              <Text className="font-body text-xs text-ink/60 text-center">
                ¿Te llegó un enlace en vez de un código? Ábrelo para confirmar tu cuenta y luego inicia sesión aquí.
              </Text>
            </View>
            <Pressable onPress={() => router.replace("/(auth)/login")} hitSlop={8}>
              <Text className="font-body-semibold text-maroon text-center">Ya confirmé, iniciar sesión</Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
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
