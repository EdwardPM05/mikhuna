import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "../../components/SafeAreaView";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import { BrandButton } from "../../components/BrandButton";
import { CampoTexto } from "../../components/CampoTexto";

// Supabase no deja pedir otro código antes de este tiempo.
const ESPERA_REENVIO_S = 60;

function Aviso({ texto }: { texto: string }) {
  return (
    <View className="flex-row items-start bg-chili/10 rounded-xl px-3 py-2.5 mb-3">
      <Ionicons name="alert-circle" size={16} color="#E5131B" style={{ marginTop: 1 }} />
      <Text className="font-body-semibold text-sm text-maroon ml-2 flex-1">{texto}</Text>
    </View>
  );
}

export default function RecuperarScreen() {
  const { enviarCodigoRecuperacion, restablecerContrasena } = useAuth();
  const params = useLocalSearchParams<{ email?: string }>();
  const [paso, setPaso] = useState<"correo" | "codigo">("correo");
  const [email, setEmail] = useState(params.email ?? "");
  const [codigo, setCodigo] = useState("");
  const [nueva, setNueva] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [espera, setEspera] = useState(0);

  useEffect(() => {
    if (espera <= 0) return;
    const t = setTimeout(() => setEspera((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [espera]);

  async function pedirCodigo() {
    if (!email.trim() || enviando || espera > 0) return;
    setError(null);
    setEnviando(true);
    const { error } = await enviarCodigoRecuperacion(email.trim());
    setEnviando(false);
    if (error) {
      setError(error);
      return;
    }
    setPaso("codigo");
    setEspera(ESPERA_REENVIO_S);
  }

  async function cambiar() {
    if (enviando) return;
    if (nueva.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    setError(null);
    setEnviando(true);
    const { error } = await restablecerContrasena(email.trim(), codigo.trim(), nueva);
    setEnviando(false);
    if (error) {
      setError(error);
      return;
    }
    router.replace("/"); // el código ya inició sesión: entra a la app
  }

  return (
    <SafeAreaView className="flex-1 bg-cream">
      <View className="px-6 pt-2">
        <Pressable
          onPress={() => (paso === "codigo" ? setPaso("correo") : router.back())}
          hitSlop={10}
          accessibilityLabel="Volver"
          className="w-10 h-10 rounded-full bg-white border border-ink/10 items-center justify-center active:opacity-60"
        >
          <Ionicons name="arrow-back" size={20} color="#241F21" />
        </Pressable>
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
        <ScrollView
          className="flex-1 px-6"
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingVertical: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          <Image
            source={require("../../src/assets/mascots/papi_papa_checklist.png")}
            style={{ width: 110, height: 110, alignSelf: "center", marginBottom: 8 }}
            contentFit="contain"
          />

          {paso === "correo" ? (
            <>
              <Text className="font-display text-2xl text-ink text-center">¿Olvidaste tu contraseña?</Text>
              <Text className="font-body text-sm text-ink/60 text-center mb-6">
                Tranqui, pasa. Escribe tu correo y te mandamos un código para crear una nueva.
              </Text>

              <CampoTexto
                icono="mail-outline"
                value={email}
                onChangeText={setEmail}
                placeholder="Correo electrónico"
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                returnKeyType="send"
                onSubmitEditing={pedirCodigo}
              />

              {error && <Aviso texto={error} />}

              <View className="mt-1">
                <BrandButton
                  label={enviando ? "Enviando..." : "Enviarme el código"}
                  disabled={!email.trim() || enviando}
                  onPress={pedirCodigo}
                />
              </View>
            </>
          ) : (
            <>
              <Text className="font-display text-2xl text-ink text-center">Revisa tu correo</Text>
              <Text className="font-body text-sm text-ink/60 text-center mb-6">
                Te enviamos un código a <Text className="font-body-bold text-ink">{email.trim()}</Text>. Escríbelo
                aquí junto con tu nueva contraseña.
              </Text>

              <CampoTexto
                icono="keypad-outline"
                value={codigo}
                onChangeText={(t) => setCodigo(t.replace(/\D/g, ""))}
                placeholder="Código del correo"
                keyboardType="number-pad"
                autoComplete="one-time-code"
                maxLength={10}
                returnKeyType="next"
              />
              <CampoTexto
                icono="lock-closed-outline"
                contrasena
                value={nueva}
                onChangeText={setNueva}
                placeholder="Nueva contraseña"
                autoComplete="new-password"
                returnKeyType="go"
                onSubmitEditing={cambiar}
              />
              <Text
                className={`font-body-semibold text-xs -mt-1 mb-3 ml-1 ${
                  nueva.length === 0 ? "text-ink/45" : nueva.length < 6 ? "text-mango" : "text-[#3A9D5D]"
                }`}
              >
                {nueva.length >= 6 ? "✓ Contraseña lista" : "Mínimo 6 caracteres"}
              </Text>

              {error && <Aviso texto={error} />}

              <View className="mt-1 mb-5">
                <BrandButton
                  label={enviando ? "Guardando..." : "Cambiar contraseña"}
                  disabled={codigo.length < 6 || nueva.length < 6 || enviando}
                  onPress={cambiar}
                />
              </View>

              <Pressable onPress={pedirCodigo} disabled={espera > 0 || enviando} hitSlop={8}>
                <Text className={`font-body-semibold text-center ${espera > 0 ? "text-ink/40" : "text-chili"}`}>
                  {espera > 0 ? `¿No llegó? Reenviar en ${espera} s` : "¿No llegó? Reenviar código"}
                </Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
